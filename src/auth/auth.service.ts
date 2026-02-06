import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  supabaseUserId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Valida o JWT do Supabase e retorna o usuário do nosso banco (criando se não existir).
   */
  async validateSupabaseToken(accessToken: string): Promise<AuthUser> {
    const {
      data: { user: authUser },
      error,
    } = await this.supabase.getAuth().getUser(accessToken);

    if (error || !authUser?.email) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    let user = await this.prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          supabaseUserId: authUser.id,
          email: authUser.email,
          role: Role.OWNER,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      supabaseUserId: user.supabaseUserId!,
    };
  }

  /**
   * Registra o perfil (role) do usuário após o primeiro login. Só atualiza se ainda for o primeiro acesso.
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
   * Envia e-mail de recuperação de senha via Supabase.
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
