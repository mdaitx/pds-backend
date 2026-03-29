import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serviço de empresas: proprietários (titular ou co-proprietário) leem/editam a frota.
 * Administradores não acessam esta rota (dados cadastrais / comissão padrão).
 */
@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  private async resolveCompanyRecordForOwnerUser(user: AuthUser) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas proprietários acessam dados cadastrais da empresa.');
    }
    const companyId = await this.companyAccess.resolveCompanyId(user);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada. Conclua o onboarding.');
    }
    return company;
  }

  /**
   * Retorna a empresa da frota. Apenas role OWNER (titular ou co-proprietário).
   */
  async findMyCompany(user: AuthUser) {
    const company = await this.resolveCompanyRecordForOwnerUser(user);
    return {
      ...company,
      defaultCommission: company.defaultCommission ? Number(company.defaultCommission) : null,
    };
  }

  /**
   * Atualiza a empresa. Titular e co-proprietário podem editar.
   */
  async updateMyCompany(user: AuthUser, dto: AtualizarEmpresaDto) {
    const company = await this.resolveCompanyRecordForOwnerUser(user);
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
