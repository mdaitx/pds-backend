import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

/** Chave usada para armazenar o usuário autenticado no request (para @CurrentUser()). */
export const AUTH_USER_KEY = 'authUser';

/**
 * Guard de autenticação: exige header Authorization: Bearer <token> e valida o token no Supabase.
 *
 * Se válido, coloca o AuthUser em request[AUTH_USER_KEY] e permite o acesso.
 * Se inválido ou ausente, lança UnauthorizedException (401).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não informado');
    }

    const token = authHeader.slice(7);
    const user = await this.authService.validateSupabaseToken(token);
    request[AUTH_USER_KEY] = user;
    return true;
  }
}
