import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AUTH_USER_KEY } from '../guards/jwt-auth.guard';
import { AuthUser } from '../auth.service';

/**
 * Decorator para injetar o usuário autenticado no handler.
 *
 * Uso: @CurrentUser() user: AuthUser
 * Ou para um campo: @CurrentUser('id') id: string
 *
 * Só funciona em rotas protegidas por JwtAuthGuard (que preenche request[AUTH_USER_KEY]).
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const user = ctx.switchToHttp().getRequest()[AUTH_USER_KEY];
    return data ? user?.[data] : user;
  },
);
