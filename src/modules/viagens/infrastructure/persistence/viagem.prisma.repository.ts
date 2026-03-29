import { Injectable, ForbiddenException } from '@nestjs/common';
import { TripStatus, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../../../core/company-access/company-access.service';
import { DriverAuthService } from '../../../../core/driver-auth/driver-auth.service';
import type { AuthUser } from '../../../../shared/domain/auth-user.interface';
import type {
  IViagemRepository,
  CriarViagemInput,
  AtualizarViagemInput,
  ViagemComRelacoes,
} from '../../domain/ports/viagem.repository.port';

function toViagemComRelacoes(trip: {
  id: string;
  code: string;
  vehicleId: string;
  driverId: string;
  companyId: string;
  clientName: string | null;
  origin: string | null;
  destination: string | null;
  startDate: Date;
  endDate: Date | null;
  freightValue: unknown;
  initialKm: number | null;
  finalKm: number | null;
  loadType: string | null;
  notes: string | null;
  status: TripStatus;
  vehicle?: { id: string; plate: string; brand: string; model: string };
  driver?: { id: string; name: string };
}): ViagemComRelacoes {
  return {
    ...trip,
    freightValue: trip.freightValue != null ? Number(trip.freightValue) : null,
  };
}

@Injectable()
export class ViagemPrismaRepository implements IViagemRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly driverAuth: DriverAuthService,
  ) {}

  async getCompanyIdByOwner(userId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { ownerId: userId },
    });
    if (!company) {
      throw new Error('Empresa não encontrada');
    }
    return company.id;
  }

  async generateTripCode(companyId: string): Promise<string> {
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

  async findMany(user: AuthUser, status?: TripStatus): Promise<ViagemComRelacoes[]> {
    const where: { companyId?: string; driverId?: string; status?: TripStatus } = {};
    if (user.role === Role.DRIVER) {
      const ctx = await this.driverAuth.findDriverForAuthUser(user);
      if (!ctx) return [];
      where.driverId = ctx.id;
    } else if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      where.companyId = await this.companyAccess.resolveCompanyId(user);
    } else {
      throw new ForbiddenException('Acesso negado');
    }
    if (status && Object.values(TripStatus).includes(status)) {
      where.status = status;
    }
    const list = await this.prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return list.map(toViagemComRelacoes);
  }

  async findById(user: AuthUser, id: string): Promise<ViagemComRelacoes | null> {
    let trip: Awaited<ReturnType<typeof this.prisma.trip.findFirst>> = null;
    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      const companyId = await this.companyAccess.resolveCompanyId(user);
      trip = await this.prisma.trip.findFirst({
        where: { id, companyId },
        include: { vehicle: true, driver: true },
      });
    } else if (user.role === Role.DRIVER) {
      const ctx = await this.driverAuth.findDriverForAuthUser(user);
      if (!ctx) return null;
      trip = await this.prisma.trip.findFirst({
        where: { id, driverId: ctx.id },
        include: { vehicle: true, driver: true },
      });
    } else {
      throw new ForbiddenException('Acesso negado');
    }
    return trip ? toViagemComRelacoes(trip) : null;
  }

  async create(companyId: string, data: CriarViagemInput): Promise<ViagemComRelacoes> {
    const code = await this.generateTripCode(companyId);
    const created = await this.prisma.trip.create({
      data: {
        companyId,
        code,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        clientName: data.clientName?.trim() || undefined,
        origin: data.origin?.trim() || undefined,
        destination: data.destination?.trim() || undefined,
        startDate: data.startDate,
        endDate: data.endDate,
        freightValue: data.freightValue != null ? new Decimal(data.freightValue) : undefined,
        initialKm: data.initialKm,
        loadType: data.loadType?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        status: data.status ?? 'PENDING',
      },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, name: true } },
      },
    });
    return toViagemComRelacoes(created);
  }

  async update(
    id: string,
    companyId: string,
    data: AtualizarViagemInput,
  ): Promise<ViagemComRelacoes> {
    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        ...(data.vehicleId !== undefined && { vehicleId: data.vehicleId }),
        ...(data.driverId !== undefined && { driverId: data.driverId }),
        ...(data.clientName !== undefined && { clientName: data.clientName?.trim() || null }),
        ...(data.origin !== undefined && { origin: data.origin?.trim() || null }),
        ...(data.destination !== undefined && { destination: data.destination?.trim() || null }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? data.endDate : null }),
        ...(data.freightValue !== undefined && { freightValue: new Decimal(data.freightValue) }),
        ...(data.initialKm !== undefined && { initialKm: data.initialKm }),
        ...(data.loadType !== undefined && { loadType: data.loadType?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, name: true } },
      },
    });
    return toViagemComRelacoes(updated);
  }

  async delete(id: string, _companyId: string): Promise<void> {
    await this.prisma.trip.delete({ where: { id } });
  }

  async validateVehicle(vehicleId: string, companyId: string): Promise<boolean> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
    });
    return !!vehicle;
  }

  async validateDriver(driverId: string, companyId: string): Promise<boolean> {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
    });
    return !!driver;
  }
}
