import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';

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

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        supabaseUserId: user.supabaseUserId!,
        companyId: user.companyId ?? null,
      };
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

  /**
   * Registra o perfil (role) do usuário após o primeiro login.
   * Usado no wizard quando o usuário escolhe ser Dono ou Motorista.
   */
  async registerProfile(supabaseUserId: string, role: Role): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { role },
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      supabaseUserId: updated.supabaseUserId!,
      companyId: updated.companyId ?? null,
    };
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
