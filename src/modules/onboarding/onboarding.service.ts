import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { AuthUser } from '../../core/auth/auth.service';
import {
  CreateOnboardingCompanyDto,
  CreateOnboardingFirstVehicleDto,
  CreateOnboardingFirstDriverDto,
} from './dto/onboarding.dto';
import { Decimal } from '@prisma/client/runtime/library';

export interface OnboardingStatus {
  completed: boolean;
  hasCompany: boolean;
  hasVehicle: boolean;
  hasDriver: boolean;
  /** Passo atual do wizard (1=empresa, 2=veículo, 3=motorista, 4=concluído) */
  step: number;
}

/**
 * Serviço de onboarding: wizard do primeiro acesso para donos (OWNER).
 * Passos: 1) criar empresa, 2) primeiro veículo, 3) primeiro motorista.
 * Motoristas (DRIVER) não têm onboarding; getStatus retorna completed=true para eles.
 */
@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna o status do onboarding para o dono. Se não for OWNER, retorna completed=true
   * e step=4 para não bloquear motoristas no dashboard.
   */
  async getStatus(user: AuthUser): Promise<OnboardingStatus> {
    if (user.role !== Role.OWNER) {
      return {
        completed: true,
        hasCompany: false,
        hasVehicle: false,
        hasDriver: false,
        step: 4,
      };
    }

    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
      include: {
        _count: {
          select: { vehicles: true, drivers: true },
        },
      },
    });

    if (!company) {
      return {
        completed: false,
        hasCompany: false,
        hasVehicle: false,
        hasDriver: false,
        step: 1,
      };
    }

    const hasVehicle = (company._count.vehicles ?? 0) > 0;
    const hasDriver = (company._count.drivers ?? 0) > 0;
    let step = 2;
    if (!hasVehicle) step = 2;
    else if (!hasDriver) step = 3;
    else step = 4;

    return {
      completed: hasVehicle && hasDriver,
      hasCompany: true,
      hasVehicle,
      hasDriver,
      step,
    };
  }

  /**
   * Cria a empresa do dono (passo 1). Um dono só pode ter uma empresa; segunda chamada retorna conflito.
   */
  async createCompany(user: AuthUser, dto: CreateOnboardingCompanyDto) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem configurar empresa');
    }

    const existing = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (existing) {
      throw new ConflictException('Empresa já cadastrada para este usuário');
    }

    return this.prisma.company.create({
      data: {
        name: dto.name,
        document: dto.document ?? undefined,
        address: dto.address ?? undefined,
        phone: dto.phone ?? undefined,
        email: dto.email ?? undefined,
        defaultCommission: dto.defaultCommission != null ? new Decimal(dto.defaultCommission) : undefined,
        ownerId: user.id,
      },
    });
  }

  /**
   * Cadastra o primeiro veículo (passo 2). Placa normalizada (sem espaços, maiúscula) e
   * única por empresa.
   */
  async createFirstVehicle(user: AuthUser, dto: CreateOnboardingFirstVehicleDto) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem cadastrar veículos');
    }

    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new BadRequestException('Cadastre a empresa antes do veículo');
    }

    const plate = dto.plate.replace(/\s/g, '').toUpperCase();
    const existing = await this.prisma.vehicle.findFirst({
      where: { companyId: company.id, plate },
    });
    if (existing) {
      throw new ConflictException('Já existe um veículo com esta placa');
    }

    return this.prisma.vehicle.create({
      data: {
        plate,
        model: dto.model,
        brand: dto.brand,
        year: dto.year,
        nickname: dto.nickname ?? undefined,
        companyId: company.id,
      },
    });
  }

  /**
   * Cadastra o primeiro motorista (passo 3). CPF normalizado (apenas dígitos) e único por empresa.
   */
  async createFirstDriver(user: AuthUser, dto: CreateOnboardingFirstDriverDto) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem cadastrar motoristas');
    }

    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new BadRequestException('Cadastre a empresa antes do motorista');
    }

    const cpfClean = dto.cpf.replace(/\D/g, '');
    const existing = await this.prisma.driver.findFirst({
      where: { companyId: company.id, cpf: cpfClean },
    });
    if (existing) {
      throw new ConflictException('Já existe um motorista com este CPF');
    }

    return this.prisma.driver.create({
      data: {
        name: dto.name,
        cpf: cpfClean,
        phone: dto.phone ?? undefined,
        email: dto.email ?? undefined,
        commissionPct: dto.commissionPct != null ? new Decimal(dto.commissionPct) : undefined,
        companyId: company.id,
      },
    });
  }
}
