import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, TripStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarViagemDto } from './dto/criar-viagem.dto';
import { AtualizarViagemDto } from './dto/atualizar-viagem.dto';

@Injectable()
export class ViagensService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCompanyId(user: AuthUser): Promise<string> {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem acessar viagens');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new BadRequestException('Cadastre a empresa antes de criar viagens');
    }
    return company.id;
  }

  private async generateTripCode(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VG-${year}-`;
    const last = await this.prisma.trip.findFirst({
      where: { companyId, code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
    });
    let seq = 1;
    if (last) {
      const match = last.code.match(new RegExp(`${prefix}(\\d+)$`));
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async findAll(user: AuthUser, status?: string) {
    const companyId = await this.getCompanyId(user);
    const where: { companyId: string; status?: TripStatus } = { companyId };
    if (status && Object.values(TripStatus).includes(status as TripStatus)) {
      where.status = status as TripStatus;
    }
    const list = await this.prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return list.map((t) => ({
      ...t,
      freightValue: t.freightValue != null ? Number(t.freightValue) : null,
    }));
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const trip = await this.prisma.trip.findFirst({
      where: { id, companyId },
      include: {
        vehicle: true,
        driver: true,
      },
    });
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }
    return {
      ...trip,
      freightValue: trip.freightValue != null ? Number(trip.freightValue) : null,
    };
  }

  async create(user: AuthUser, dto: CriarViagemDto) {
    const companyId = await this.getCompanyId(user);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
    });
    if (!vehicle) {
      throw new BadRequestException('Veículo não encontrado');
    }

    const driver = await this.prisma.driver.findFirst({
      where: { id: dto.driverId, companyId },
    });
    if (!driver) {
      throw new BadRequestException('Motorista não encontrado');
    }

    const code = await this.generateTripCode(companyId);

    const created = await this.prisma.trip.create({
      data: {
        companyId,
        code,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        clientName: dto.clientName?.trim() || undefined,
        origin: dto.origin?.trim() || undefined,
        destination: dto.destination?.trim() || undefined,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        freightValue: dto.freightValue != null ? new Decimal(dto.freightValue) : undefined,
        initialKm: dto.initialKm ?? undefined,
        loadType: dto.loadType?.trim() || undefined,
        notes: dto.notes?.trim() || undefined,
        status: dto.status ?? 'PENDING',
      },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, name: true } },
      },
    });
    return {
      ...created,
      freightValue: created.freightValue != null ? Number(created.freightValue) : null,
    };
  }

  async update(user: AuthUser, id: string, dto: AtualizarViagemDto) {
    const companyId = await this.getCompanyId(user);
    const trip = await this.prisma.trip.findFirst({
      where: { id, companyId },
    });
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, companyId },
      });
      if (!vehicle) throw new BadRequestException('Veículo não encontrado');
    }
    if (dto.driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: dto.driverId, companyId },
      });
      if (!driver) throw new BadRequestException('Motorista não encontrado');
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.vehicleId !== undefined && { vehicleId: dto.vehicleId }),
        ...(dto.driverId !== undefined && { driverId: dto.driverId }),
        ...(dto.clientName !== undefined && { clientName: dto.clientName?.trim() || null }),
        ...(dto.origin !== undefined && { origin: dto.origin?.trim() || null }),
        ...(dto.destination !== undefined && { destination: dto.destination?.trim() || null }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.freightValue !== undefined && { freightValue: new Decimal(dto.freightValue) }),
        ...(dto.initialKm !== undefined && { initialKm: dto.initialKm }),
        ...(dto.loadType !== undefined && { loadType: dto.loadType?.trim() || null }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, name: true } },
      },
    });
    return {
      ...updated,
      freightValue: updated.freightValue != null ? Number(updated.freightValue) : null,
    };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const trip = await this.prisma.trip.findFirst({
      where: { id, companyId },
    });
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }
    await this.prisma.trip.delete({ where: { id } });
    return { success: true };
  }
}
