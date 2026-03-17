import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarCategoriaDespesaDto } from './dto/criar-categoria-despesa.dto';
import { AtualizarCategoriaDespesaDto } from './dto/atualizar-categoria-despesa.dto';

/**
 * Serviço de categorias de despesas: lista categorias do sistema (companyId null) e
 * customizadas da empresa do dono. Apenas OWNER pode criar/editar/excluir customizadas.
 */
@Injectable()
export class CategoriasDespesasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem listar categorias de despesas');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    const systemCategories = await this.prisma.expenseCategory.findMany({
      where: { companyId: null },
      orderBy: { name: 'asc' },
    });
    const customCategories = company
      ? await this.prisma.expenseCategory.findMany({
          where: { companyId: company.id },
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
      throw new ForbiddenException('Apenas donos podem criar categorias');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new BadRequestException('Cadastre a empresa antes de criar categorias');
    }
    const nameNorm = dto.name.trim();
    const existing = await this.prisma.expenseCategory.findUnique({
      where: {
        companyId_name: { companyId: company.id, name: nameNorm },
      },
    });
    if (existing) {
      throw new ConflictException('Já existe uma categoria com este nome');
    }
    const created = await this.prisma.expenseCategory.create({
      data: {
        companyId: company.id,
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
      throw new ForbiddenException('Apenas donos podem editar categorias');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, companyId: company.id },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada ou não pode ser editada');
    }
    if (dto.name !== undefined) {
      const nameNorm = dto.name.trim();
      const existing = await this.prisma.expenseCategory.findFirst({
        where: {
          companyId: company.id,
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
      throw new ForbiddenException('Apenas donos podem excluir categorias');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, companyId: company.id },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada ou não pode ser excluída');
    }
    await this.prisma.expenseCategory.delete({ where: { id } });
    return { success: true };
  }
}
