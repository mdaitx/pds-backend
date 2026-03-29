import { Injectable } from '@nestjs/common';
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

    const byEmail = await this.prisma.driver.findFirst({
      where: {
        companyId: user.companyId,
        email: { equals: user.email, mode: 'insensitive' },
      },
      select: { id: true, companyId: true },
    });
    return byEmail;
  }
}
