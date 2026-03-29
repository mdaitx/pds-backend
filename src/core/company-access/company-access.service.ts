import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';

/**
 * Resolve a empresa do usuário autenticado:
 * - Dono titular: Company.ownerId === user.id
 * - Co-proprietário: User.role OWNER + companyId
 * - Administrador: User.role ADMIN + companyId
 */
@Injectable()
export class CompanyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Empresa onde o usuário é dono titular (registro em empresas.owner_id). */
  async findOwnedCompanyId(userId: string): Promise<string | null> {
    const company = await this.prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    return company?.id ?? null;
  }

  /**
   * ID da empresa para operações de frota (motoristas, veículos, viagens CRUD, etc.).
   */
  async resolveCompanyId(user: AuthUser): Promise<string> {
    if (user.role === Role.OWNER) {
      const owned = await this.findOwnedCompanyId(user.id);
      if (owned) return owned;
      if (user.companyId) {
        const c = await this.prisma.company.findFirst({
          where: { id: user.companyId },
          select: { id: true },
        });
        if (c) return c.id;
      }
      throw new BadRequestException('Cadastre a empresa ou vincule-se a uma frota.');
    }

    if (user.role === Role.ADMIN) {
      if (!user.companyId) {
        throw new ForbiddenException('Administrador sem empresa vinculada.');
      }
      const c = await this.prisma.company.findFirst({
        where: { id: user.companyId },
        select: { id: true },
      });
      if (!c) {
        throw new BadRequestException('Empresa inválida para este administrador.');
      }
      return c.id;
    }

    throw new ForbiddenException('Sem permissão para acessar dados da empresa.');
  }

  /** Dono titular da empresa (único com owner_id). */
  async isPrimaryOwnerOfCompany(userId: string, companyId: string): Promise<boolean> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, ownerId: userId },
    });
    return !!company;
  }

  /**
   * Pode gerenciar usuários da empresa (convidar admin / co-proprietário):
   * apenas dono titular.
   */
  async assertPrimaryOwner(user: AuthUser): Promise<string> {
    const companyId = await this.resolveCompanyId(user);
    const ok = await this.isPrimaryOwnerOfCompany(user.id, companyId);
    if (!ok) {
      throw new ForbiddenException('Apenas o proprietário titular pode convidar usuários administrativos.');
    }
    return companyId;
  }

  /** Acesso a viagem: dono titular, co-proprietário, admin ou motorista (tratado à parte). */
  async userManagesCompany(user: AuthUser, companyId: string): Promise<boolean> {
    if (user.role === Role.DRIVER) return false;
    try {
      const uid = await this.resolveCompanyId(user);
      return uid === companyId;
    } catch {
      return false;
    }
  }
}
