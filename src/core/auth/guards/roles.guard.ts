import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AUTH_USER_KEY } from './jwt-auth.guard';

/** Chave de metadados onde o @Roles() decorator armazena a lista de roles permitidas. */
export const ROLES_KEY = 'roles';

/**
 * Guard de autorização por role: verifica se o usuário autenticado tem uma das roles permitidas.
 *
 * Deve ser usado junto com JwtAuthGuard (que preenche request[AUTH_USER_KEY]).
 * Se a rota não tiver @Roles(), o guard deixa passar. Caso contrário, exige que user.role
 * esteja na lista definida pelo decorator; senão lança ForbiddenException (403).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest()[AUTH_USER_KEY];
    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Sem permissão para esta ação');
    }

    return true;
  }
}
