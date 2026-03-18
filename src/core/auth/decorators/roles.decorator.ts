import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Define quais roles podem acessar a rota. Deve ser usado junto com RolesGuard.
 *
 * Exemplo: @Roles(Role.OWNER, Role.ADMIN) na rota ou no controller.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
