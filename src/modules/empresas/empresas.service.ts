import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, type Company } from '@prisma/client';
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

  /** CNPJ de pessoa jurídica tem 14 dígitos; sem isso tratamos o cadastro como autônomo (CPF/nulo no documento ou incompleto). */
  private hasCompanyCnpj(document: string | null | undefined): boolean {
    const d = (document ?? '').replace(/\D/g, '');
    return d.length === 14;
  }

  private async buildOwnerCompanyView(company: Company) {
    const isAutonomous = !this.hasCompanyCnpj(company.document);
    let autonomousDriver: {
      id: string;
      name: string;
      cpf: string | null;
      phone: string | null;
      email: string | null;
    } | null = null;
    if (isAutonomous) {
      const first = await this.prisma.driver.findFirst({
        where: { companyId: company.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, cpf: true, phone: true, email: true },
      });
      if (first) autonomousDriver = first;
    }
    return {
      ...company,
      defaultCommission: company.defaultCommission ? Number(company.defaultCommission) : null,
      subscriptionStatus: company.subscriptionStatus,
      trialEndsAt: company.trialEndsAt ? company.trialEndsAt.toISOString() : null,
      currentPeriodEnd: company.currentPeriodEnd ? company.currentPeriodEnd.toISOString() : null,
      isAutonomous,
      autonomousDriver,
    };
  }

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
    return this.buildOwnerCompanyView(company);
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
    return this.buildOwnerCompanyView(updated);
  }
}
