import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

/** Usuário autenticado após validação do JWT: dados que o backend usa para autorização. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  supabaseUserId: string;
}

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
      // Sincroniza com nossa tabela usuarios (um registro por usuário Supabase)
      let user = await this.prisma.user.findUnique({
        where: { supabaseUserId: authUser.id },
      });

      if (!user) {
        // Tenta criar; se email já existe (P2002), busca e atualiza supabaseUserId
        try {
          user = await this.prisma.user.create({
            data: {
              supabaseUserId: authUser.id,
              email: authUser.email,
              role: Role.OWNER,
            },
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002' &&
            Array.isArray(e.meta?.target) &&
            (e.meta.target as string[]).includes('email')
          ) {
            user = await this.prisma.user.update({
              where: { email: authUser.email },
              data: { supabaseUserId: authUser.id },
            });
          } else {
            throw e;
          }
        }
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        supabaseUserId: user.supabaseUserId!,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new UnauthorizedException('Usuário não encontrado');
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
    };
  }

  /**
   * Envia e-mail de recuperação de senha via Supabase Auth.
   * Não revela se o e-mail existe ou não (segurança contra enumeração).
   */
  async recoverPassword(email: string): Promise<{ message: string }> {
    const { error } = await this.supabase.getAuth().resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/reset-password`,
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
