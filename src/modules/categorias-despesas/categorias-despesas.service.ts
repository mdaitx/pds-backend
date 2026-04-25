import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarCategoriaDespesaDto } from './dto/criar-categoria-despesa.dto';
import { AtualizarCategoriaDespesaDto } from './dto/atualizar-categoria-despesa.dto';
import { SubscriptionService } from '../subscription/subscription.service';

/**
 * Serviço de categorias de despesas: lista categorias do sistema (companyId null) e
 * customizadas da empresa. Apenas dono (OWNER) cria/edita/exclui customizadas.
 */
@Injectable()
export class CategoriasDespesasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly subscription: SubscriptionService,
  ) {}

  async findAll(user: AuthUser) {
    let companyId: string | null = null;
    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      try {
        companyId = await this.companyAccess.resolveCompanyId(user);
      } catch {
        companyId = null;
      }
    } else if (user.role === Role.DRIVER) {
      const driver = await this.prisma.driver.findFirst({
        where: { email: user.email },
      });
      companyId = driver?.companyId ?? null;
    } else {
      throw new ForbiddenException('Acesso negado');
    }
    const systemCategories = await this.prisma.expenseCategory.findMany({
      where: { companyId: null },
      orderBy: { name: 'asc' },
    });
    const customCategories = companyId
      ? await this.prisma.expenseCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        })
      : [];
    return {
      system: systemCategories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isSystem: true,
      })),
      custom: customCategories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isSystem: false,
      })),
    };
  }

  async create(user: AuthUser, dto: CriarCategoriaDespesaDto) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas o dono da frota pode criar categorias customizadas');
    }
    const companyId = await this.companyAccess.resolveCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const nameNorm = dto.name.trim();
    const existing = await this.prisma.expenseCategory.findUnique({
      where: {
        companyId_name: { companyId, name: nameNorm },
      },
    });
    if (existing) {
      throw new ConflictException('Já existe uma categoria com este nome');
    }
    const created = await this.prisma.expenseCategory.create({
      data: {
        companyId,
        name: nameNorm,
        icon: dto.icon ?? 'receipt',
        color: dto.color ?? '#6b7280',
      },
    });
    return {
      id: created.id,
      name: created.name,
      icon: created.icon,
      color: created.color,
      isSystem: false,
    };
  }

  async update(user: AuthUser, id: string, dto: AtualizarCategoriaDespesaDto) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas o dono da frota pode editar categorias');
    }
    const companyId = await this.companyAccess.resolveCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, companyId },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada ou não pode ser editada');
    }
    if (dto.name !== undefined) {
      const nameNorm = dto.name.trim();
      const existing = await this.prisma.expenseCategory.findFirst({
        where: {
          companyId,
          name: nameNorm,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Já existe uma categoria com este nome');
      }
    }
    const updated = await this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      icon: updated.icon,
      color: updated.color,
      isSystem: false,
    };
  }

  async remove(user: AuthUser, id: string) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas o dono da frota pode excluir categorias');
    }
    const companyId = await this.companyAccess.resolveCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, companyId },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada ou não pode ser excluída');
    }
    await this.prisma.expenseCategory.delete({ where: { id } });
    return { success: true };
  }
}
