import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { Express } from 'express';
import type { AuthUser } from '../../shared/domain/auth-user.interface';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { UPLOAD_MAX_FILE_BYTES } from '../../common/constants/upload-limits';

const PROFILE_PHOTO_BUCKET = 'uploads';
const USER_PHOTO_PREFIX = 'users';
const PROFILE_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const AUTH_CACHE_TTL_MS = 60_000;

/** Re-export para compatibilidade. Preferir importar de shared/domain/auth-user.interface */
export type { AuthUser } from '../../shared/domain/auth-user.interface';

/**
 * Serviço de autenticação: valida token do Supabase e mantém perfil no banco (User).
 *
 * Fluxo: frontend envia Bearer <access_token> -> backend valida no Supabase ->
 * busca/cria User em usuarios -> retorna AuthUser para guards e controllers.
 */
@Injectable()
export class AuthService {
  private readonly authCache = new Map<string, { user: AuthUser; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Garante uma linha em `usuarios` para o usuário do Supabase (cria, vincula por e-mail ou recupera após P2002).
   */
  private async ensureUserForSupabase(authUser: { id: string; email: string }): Promise<User> {
    const bySupabase = await this.prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });
    if (bySupabase) return bySupabase;

    const byEmail = await this.prisma.user.findUnique({
      where: { email: authUser.email },
    });
    if (byEmail) {
      if (byEmail.supabaseUserId != null && byEmail.supabaseUserId !== authUser.id) {
        throw new UnauthorizedException('Conta já associada a outro login.');
      }
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { supabaseUserId: authUser.id },
      });
    }

    try {
      return await this.prisma.user.create({
        data: {
          supabaseUserId: authUser.id,
          email: authUser.email,
          role: Role.OWNER,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const afterRace = await this.prisma.user.findUnique({
          where: { supabaseUserId: authUser.id },
        });
        if (afterRace) return afterRace;

        const emailRow = await this.prisma.user.findUnique({
          where: { email: authUser.email },
        });
        if (emailRow) {
          if (emailRow.supabaseUserId != null && emailRow.supabaseUserId !== authUser.id) {
            throw new UnauthorizedException('Conta já associada a outro login.');
          }
          return this.prisma.user.update({
            where: { id: emailRow.id },
            data: { supabaseUserId: authUser.id },
          });
        }
      }
      throw e;
    }
  }

  private isDatabaseConnectionError(e: unknown): boolean {
    if (!(e instanceof Error)) return false;
    return (
      e.name === 'PrismaClientInitializationError' ||
      e.name === 'PrismaClientRustPanicError' ||
      /P1001|Can't reach database server|Connection refused|ECONNREFUSED|ETIMEDOUT/i.test(e.message)
    );
  }

  /**
   * Valida o JWT do Supabase e retorna o usuário do nosso banco (criando se não existir).
   * Lança UnauthorizedException se o token for inválido ou expirado.
   */
  async validateSupabaseToken(accessToken: string): Promise<AuthUser> {
    const cacheKey = createHash('sha256').update(accessToken).digest('hex');
    const cached = this.authCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }
    if (cached) {
      this.authCache.delete(cacheKey);
    }

    let authUser: { id: string; email?: string } | null = null;
    let error: { message?: string } | null = null;

    try {
      const result = await this.supabase.getAuth().getUser(accessToken);
      authUser = result.data?.user ?? null;
      error = result.error ?? null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao validar token';
      throw new UnauthorizedException(`Token inválido ou expirado: ${msg}`);
    }

    if (error || !authUser?.email) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    try {
      const user = await this.ensureUserForSupabase({
        id: authUser.id,
        email: authUser.email,
      });

      const result = this.toAuthUser(user);
      this.authCache.set(cacheKey, {
        user: result,
        expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
      });
      return result;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      if (this.isDatabaseConnectionError(e)) {
        throw new ServiceUnavailableException(
          'Não foi possível conectar ao banco de dados. Verifique DATABASE_URL e DIRECT_URL no .env do backend.',
        );
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new UnauthorizedException('Usuário não encontrado');
        }
        if (e.code === 'P2022') {
          throw new InternalServerErrorException(
            'Schema do banco desatualizado (coluna ausente). Aplique as migrations no Supabase ou rode o SQL em prisma/migrations/. Veja P3005 na documentação Prisma se o banco já existia sem histórico de migrations.',
          );
        }
        if (e.code === 'P2003') {
          throw new InternalServerErrorException(
            'Erro de banco: tabela usuarios ou auth.users. Execute fix-auth-fk.sql no Supabase.',
          );
        }
      }
      const msg = e instanceof Error ? e.message : 'Erro ao validar usuário';
      throw new InternalServerErrorException(`Erro interno: ${msg}`);
    }
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      supabaseUserId: user.supabaseUserId!,
      companyId: user.companyId ?? null,
      photoUrl: user.photoUrl ?? null,
      displayName: user.displayName ?? null,
    };
  }

  /** Atualiza dados do próprio usuário (ex.: remover foto enviando photoUrl null). */
  async updateMyProfile(user: AuthUser, dto: UpdateProfileDto): Promise<AuthUser> {
    const data: { photoUrl?: string | null } = {};
    if (dto.photoUrl !== undefined) {
      data.photoUrl = dto.photoUrl;
    }
    if (Object.keys(data).length === 0) {
      const row = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return this.toAuthUser(row);
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
    return this.toAuthUser(updated);
  }

  /** Upload de foto de perfil: grava no Storage e atualiza usuarios.photo_url. */
  async uploadProfilePhoto(user: AuthUser, file: Express.Multer.File): Promise<AuthUser> {
    if (!PROFILE_PHOTO_MIMES.includes(file.mimetype as (typeof PROFILE_PHOTO_MIMES)[number])) {
      throw new BadRequestException('Tipo de arquivo inválido. Use JPEG, PNG ou WebP.');
    }
    if (file.size > UPLOAD_MAX_FILE_BYTES) {
      throw new BadRequestException('Arquivo muito grande.');
    }
    const ext = ['image/jpeg', 'image/jpg'].includes(file.mimetype) ? 'jpg' : file.mimetype === 'image/png' ? 'png' : 'webp';
    const storage = this.supabase.getStorage();
    const path = `${USER_PHOTO_PREFIX}/${user.id}/${Date.now()}.${ext}`;
    const { data, error } = await storage.from(PROFILE_PHOTO_BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: true,
    });
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    const { data: urlData } = storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(data.path);
    const publicUrl = urlData.publicUrl;
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: publicUrl },
    });
    return this.toAuthUser(updated);
  }

  /**
   * Registra o perfil (role) do usuário após o primeiro login.
   * Só Dono ou Motorista; não permite escalonar para ADMIN nem trocas perigosas após vínculo com empresa.
   */
  async registerProfile(supabaseUserId: string, requestedRole: Role): Promise<AuthUser> {
    if (requestedRole !== Role.OWNER && requestedRole !== Role.DRIVER) {
      throw new BadRequestException('Papel inválido. Use dono ou motorista.');
    }

    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException(
        'Contas de administrador não utilizam este cadastro.',
      );
    }

    const companyAsOwner = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (user.role === Role.DRIVER) {
      if (requestedRole === Role.OWNER) {
        throw new ForbiddenException(
          'Não é possível promover o perfil por este fluxo.',
        );
      }
      return this.toAuthUser(user);
    }

    if (user.role === Role.OWNER) {
      if (requestedRole === Role.OWNER) {
        return this.toAuthUser(user);
      }
      if (companyAsOwner) {
        throw new ForbiddenException(
          'Não é possível alterar o papel do proprietário titular por este fluxo.',
        );
      }
      if (user.companyId) {
        throw new ForbiddenException(
          'Conta já vinculada a uma frota. Use o fluxo administrativo da empresa.',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { role: requestedRole },
    });

    return this.toAuthUser(updated);
  }

  /**
   * Envia e-mail de recuperação de senha via Supabase Auth.
   * Não revela se o e-mail existe ou não (segurança contra enumeração).
   */
  async recoverPassword(email: string): Promise<{ message: string }> {
    const { error } = await this.supabase.getAuth().resetPasswordForEmail(email, {
      redirectTo: `${(process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/reset-password`,
    });

    if (error) {
      throw new UnauthorizedException(
        'Não foi possível enviar o e-mail. Verifique o endereço.',
      );
    }

    return {
      message:
        'Se o e-mail existir na base, você receberá um link para redefinir a senha.',
    };
  }
}
