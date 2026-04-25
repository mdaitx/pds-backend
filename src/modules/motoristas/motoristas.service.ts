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
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarMotoristaDto } from './dto/criar-motorista.dto';
import { AtualizarMotoristaDto } from './dto/atualizar-motorista.dto';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class MotoristasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly subscription: SubscriptionService,
  ) {}

  private async getCompanyId(user: AuthUser): Promise<string> {
    return this.companyAccess.resolveCompanyId(user);
  }

  /** Garante que o usuário é motorista da empresa e ainda não está vinculado a outra ficha. */
  private async assertLinkedUserForDriver(
    companyId: string,
    userId: string,
    excludeDriverId?: string,
  ): Promise<void> {
    const u = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!u || u.role !== Role.DRIVER) {
      throw new BadRequestException('Informe um usuário com perfil motorista desta empresa.');
    }
    const other = await this.prisma.driver.findFirst({
      where: {
        userId,
        ...(excludeDriverId ? { id: { not: excludeDriverId } } : {}),
      },
    });
    if (other) {
      throw new ConflictException('Este usuário já está vinculado a outro motorista.');
    }
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
      monthlySalary: Number(d.monthlySalary),
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
      monthlySalary: Number(driver.monthlySalary),
      preferredVehicle: driver.preferredVehicle ?? undefined,
      photoUrl: driver.photoUrl ?? undefined,
    };
  }

  async create(user: AuthUser, dto: CriarMotoristaDto) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const cpfClean = (dto.cpf ?? '').replace(/\D/g, '');
    if (cpfClean.length > 0 && cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos quando informado');
    }
    if (cpfClean.length === 11) {
      const existing = await this.prisma.driver.findFirst({
        where: { companyId, cpf: cpfClean },
      });
      if (existing) {
        throw new ConflictException('Já existe um motorista com este CPF');
      }
    }

    if (dto.preferredVehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.preferredVehicleId, companyId },
      });
      if (!vehicle) {
        throw new BadRequestException('Veículo preferencial não encontrado');
      }
    }

    if (dto.linkedUserId) {
      await this.assertLinkedUserForDriver(companyId, dto.linkedUserId);
    }

    const created = await this.prisma.driver.create({
      data: {
        companyId,
        name: dto.name.trim(),
        cpf: cpfClean.length === 11 ? cpfClean : null,
        rg: dto.rg?.trim() || undefined,
        cnh: dto.cnh?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        email: dto.email?.trim() || undefined,
        commissionPct: dto.commissionPct != null ? new Decimal(dto.commissionPct) : undefined,
        monthlySalary: new Decimal(dto.monthlySalary),
        paymentMethod: dto.paymentMethod?.trim() || undefined,
        pixKey: dto.pixKey?.trim() || undefined,
        bankName: dto.bankName?.trim() || undefined,
        bankAgency: dto.bankAgency?.trim() || undefined,
        bankAccount: dto.bankAccount?.trim() || undefined,
        status: dto.status ?? 'ACTIVE',
        preferredVehicleId: dto.preferredVehicleId || undefined,
        photoUrl: dto.photoUrl || undefined,
        userId: dto.linkedUserId || undefined,
      },
    });
    return {
      ...created,
      commissionPct: created.commissionPct != null ? Number(created.commissionPct) : null,
      monthlySalary: Number(created.monthlySalary),
      photoUrl: created.photoUrl ?? undefined,
    };
  }

  async update(user: AuthUser, id: string, dto: AtualizarMotoristaDto) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
    });
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }

    if (dto.cpf !== undefined && dto.cpf.trim() !== '') {
      const cpfClean = dto.cpf.replace(/\D/g, '');
      if (cpfClean.length !== 11) {
        throw new BadRequestException('CPF deve ter 11 dígitos quando informado');
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

    if (dto.linkedUserId !== undefined && dto.linkedUserId !== null) {
      await this.assertLinkedUserForDriver(companyId, dto.linkedUserId, id);
    }

    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.cpf !== undefined && {
          cpf: dto.cpf.trim()
            ? (dto.cpf.replace(/\D/g, '').length === 11 ? dto.cpf.replace(/\D/g, '') : null)
            : null,
        }),
        ...(dto.rg !== undefined && { rg: dto.rg?.trim() || null }),
        ...(dto.cnh !== undefined && { cnh: dto.cnh?.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.email !== undefined && { email: dto.email?.trim() || null }),
        ...(dto.commissionPct !== undefined && {
          commissionPct: new Decimal(dto.commissionPct),
        }),
        ...(dto.monthlySalary !== undefined && {
          monthlySalary: new Decimal(dto.monthlySalary),
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
        ...(dto.linkedUserId !== undefined && {
          userId: dto.linkedUserId === null ? null : dto.linkedUserId,
        }),
      },
    });
    return {
      ...updated,
      commissionPct: updated.commissionPct != null ? Number(updated.commissionPct) : null,
      monthlySalary: Number(updated.monthlySalary),
      photoUrl: updated.photoUrl ?? undefined,
    };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
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
