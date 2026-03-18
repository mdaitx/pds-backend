import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarMotoristaDto } from './dto/criar-motorista.dto';
import { AtualizarMotoristaDto } from './dto/atualizar-motorista.dto';

@Injectable()
export class MotoristasService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCompanyId(user: AuthUser): Promise<string> {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem acessar motoristas');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new BadRequestException('Cadastre a empresa antes de cadastrar motoristas');
    }
    return company.id;
  }

  async findAll(user: AuthUser) {
    const companyId = await this.getCompanyId(user);
    const list = await this.prisma.driver.findMany({
      where: { companyId },
      include: { preferredVehicle: { select: { id: true, plate: true, model: true } } },
      orderBy: { name: 'asc' },
    });
    return list.map((d) => ({
      ...d,
      commissionPct: d.commissionPct != null ? Number(d.commissionPct) : null,
      preferredVehicle: d.preferredVehicle ?? undefined,
      photoUrl: d.photoUrl ?? undefined,
    }));
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
      include: { preferredVehicle: true },
    });
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }
    return {
      ...driver,
      commissionPct: driver.commissionPct != null ? Number(driver.commissionPct) : null,
      preferredVehicle: driver.preferredVehicle ?? undefined,
      photoUrl: driver.photoUrl ?? undefined,
    };
  }

  async create(user: AuthUser, dto: CriarMotoristaDto) {
    const companyId = await this.getCompanyId(user);
    const cpfClean = dto.cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }
    const existing = await this.prisma.driver.findFirst({
      where: { companyId, cpf: cpfClean },
    });
    if (existing) {
      throw new ConflictException('Já existe um motorista com este CPF');
    }

    if (dto.preferredVehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.preferredVehicleId, companyId },
      });
      if (!vehicle) {
        throw new BadRequestException('Veículo preferencial não encontrado');
      }
    }

    const created = await this.prisma.driver.create({
      data: {
        companyId,
        name: dto.name.trim(),
        cpf: cpfClean,
        rg: dto.rg?.trim() || undefined,
        cnh: dto.cnh?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        email: dto.email?.trim() || undefined,
        commissionPct: dto.commissionPct != null ? new Decimal(dto.commissionPct) : undefined,
        paymentMethod: dto.paymentMethod?.trim() || undefined,
        pixKey: dto.pixKey?.trim() || undefined,
        bankName: dto.bankName?.trim() || undefined,
        bankAgency: dto.bankAgency?.trim() || undefined,
        bankAccount: dto.bankAccount?.trim() || undefined,
        status: dto.status ?? 'ACTIVE',
        preferredVehicleId: dto.preferredVehicleId || undefined,
        photoUrl: dto.photoUrl || undefined,
      },
    });
    return {
      ...created,
      commissionPct: created.commissionPct != null ? Number(created.commissionPct) : null,
      photoUrl: created.photoUrl ?? undefined,
    };
  }

  async update(user: AuthUser, id: string, dto: AtualizarMotoristaDto) {
    const companyId = await this.getCompanyId(user);
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
    });
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }

    if (dto.cpf !== undefined) {
      const cpfClean = dto.cpf.replace(/\D/g, '');
      if (cpfClean.length !== 11) {
        throw new BadRequestException('CPF deve ter 11 dígitos');
      }
      const existing = await this.prisma.driver.findFirst({
        where: { companyId, cpf: cpfClean, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Já existe um motorista com este CPF');
      }
    }

    if (dto.preferredVehicleId !== undefined && dto.preferredVehicleId !== null && dto.preferredVehicleId !== '') {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.preferredVehicleId, companyId },
      });
      if (!vehicle) {
        throw new BadRequestException('Veículo preferencial não encontrado');
      }
    }

    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.cpf !== undefined && { cpf: dto.cpf.replace(/\D/g, '') }),
        ...(dto.rg !== undefined && { rg: dto.rg?.trim() || null }),
        ...(dto.cnh !== undefined && { cnh: dto.cnh?.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.email !== undefined && { email: dto.email?.trim() || null }),
        ...(dto.commissionPct !== undefined && {
          commissionPct: new Decimal(dto.commissionPct),
        }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod?.trim() || null }),
        ...(dto.pixKey !== undefined && { pixKey: dto.pixKey?.trim() || null }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName?.trim() || null }),
        ...(dto.bankAgency !== undefined && { bankAgency: dto.bankAgency?.trim() || null }),
        ...(dto.bankAccount !== undefined && { bankAccount: dto.bankAccount?.trim() || null }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.preferredVehicleId !== undefined && {
          preferredVehicleId: dto.preferredVehicleId === '' ? null : dto.preferredVehicleId,
        }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl || null }),
      },
    });
    return {
      ...updated,
      commissionPct: updated.commissionPct != null ? Number(updated.commissionPct) : null,
      photoUrl: updated.photoUrl ?? undefined,
    };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
    });
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }
    await this.prisma.driver.delete({ where: { id } });
    return { success: true };
  }
}
