import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';

/**
 * Resolve qual registro em `motoristas` corresponde ao usuário DRIVER autenticado:
 * 1) vínculo explícito (`motoristas.user_id`);
 * 2) legado: mesmo e-mail + mesma empresa.
 */
@Injectable()
export class DriverAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findDriverForAuthUser(
    user: AuthUser,
  ): Promise<{ id: string; companyId: string } | null> {
    if (user.role !== Role.DRIVER || !user.companyId) {
      return null;
    }

    const byUserId = await this.prisma.driver.findFirst({
      where: { userId: user.id, companyId: user.companyId },
      select: { id: true, companyId: true },
    });
    if (byUserId) return byUserId;

    const byEmailRows = await this.prisma.driver.findMany({
      where: {
        companyId: user.companyId,
        email: { equals: user.email, mode: 'insensitive' },
      },
      select: { id: true, companyId: true, userId: true },
      orderBy: { id: 'asc' },
    });
    if (byEmailRows.length === 0) {
      return null;
    }
    if (byEmailRows.length === 1) {
      return {
        id: byEmailRows[0].id,
        companyId: byEmailRows[0].companyId,
      };
    }
    const linkedToUser = byEmailRows.find((d) => d.userId === user.id);
    if (linkedToUser) {
      return { id: linkedToUser.id, companyId: linkedToUser.companyId };
    }
    throw new ForbiddenException(
      'Há mais de um motorista com este e-mail na frota. Peça ao gestor para corrigir o cadastro.',
    );
  }
}
