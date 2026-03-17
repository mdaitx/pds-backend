import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serviço de empresas: apenas o dono (OWNER) acessa e edita os dados da própria empresa.
 * Garante isolamento: cada usuário OWNER vê apenas a empresa ligada ao seu ownerId.
 */
@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a empresa do dono logado. Apenas OWNER; motoristas não têm empresa própria.
   */
  async findMyCompany(user: AuthUser) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem acessar dados da empresa');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada. Conclua o onboarding.');
    }
    return {
      ...company,
      defaultCommission: company.defaultCommission ? Number(company.defaultCommission) : null,
    };
  }

  /**
   * Atualiza a empresa do dono. Apenas campos enviados no DTO são alterados (patch seguro).
   */
  async updateMyCompany(user: AuthUser, dto: AtualizarEmpresaDto) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem atualizar dados da empresa');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada. Conclua o onboarding.');
    }
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.document !== undefined && { document: dto.document }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.defaultCommission != null && {
          defaultCommission: new Decimal(dto.defaultCommission),
        }),
      },
    });
    return {
      ...updated,
      defaultCommission: updated.defaultCommission ? Number(updated.defaultCommission) : null,
    };
  }
}
