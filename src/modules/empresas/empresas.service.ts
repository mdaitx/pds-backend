import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serviço de empresas: dono titular/co-proprietário leem e alteram dados cadastrais.
 * Administrador (ADMIN) não acessa GET/PUT /companies/me.
 */
@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  private async resolveCompanyRecordForOwner(user: AuthUser) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas o dono da frota acessa ou altera as configurações da empresa.');
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
   * Retorna a empresa da frota. Dono titular ou co-proprietário (role OWNER).
   */
  async findMyCompany(user: AuthUser) {
    const company = await this.resolveCompanyRecordForOwner(user);
    return {
      ...company,
      defaultCommission: company.defaultCommission ? Number(company.defaultCommission) : null,
    };
  }

  /**
   * Atualiza a empresa. Titular e co-proprietário podem editar.
   */
  async updateMyCompany(user: AuthUser, dto: AtualizarEmpresaDto) {
    const company = await this.resolveCompanyRecordForOwner(user);
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
        ...(dto.timezone !== undefined && {
          timezone: dto.timezone.trim() === '' ? null : dto.timezone.trim(),
        }),
        ...(dto.commissionMethod !== undefined && {
          commissionMethod: dto.commissionMethod,
        }),
      },
    });
    return {
      ...updated,
      defaultCommission: updated.defaultCommission ? Number(updated.defaultCommission) : null,
    };
  }
}
