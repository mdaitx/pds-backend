import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma, TripStatus, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../../../core/company-access/company-access.service';
import { DriverAuthService } from '../../../../core/driver-auth/driver-auth.service';
import { paginateResult, type PaginatedResult, type PaginationOptions } from '../../../../common/pagination';
import type { AuthUser } from '../../../../shared/domain/auth-user.interface';
import type {
  IViagemRepository,
  CriarViagemInput,
  AtualizarViagemInput,
  ViagemComRelacoes,
  ListTripsPageInput,
  TripsListResult,
} from '../../domain/ports/viagem.repository.port';

const tripRelationsSelect = {
  vehicle: { select: { id: true, plate: true, brand: true, model: true, vehicleType: true } },
  driver: { select: { id: true, name: true } },
} as const;

const STATUS_COUNT_KEYS: TripStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

function emptyByStatusRecord(): Record<TripStatus, number> {
  return {
    PENDING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
}

function textSearchOr(q: string): Prisma.TripWhereInput {
  const s = q.trim();
  if (!s) return {};
  return {
    OR: [
      { code: { contains: s, mode: 'insensitive' } },
      { clientName: { contains: s, mode: 'insensitive' } },
      { origin: { contains: s, mode: 'insensitive' } },
      { destination: { contains: s, mode: 'insensitive' } },
      { loadType: { contains: s, mode: 'insensitive' } },
      { notes: { contains: s, mode: 'insensitive' } },
      { driver: { name: { contains: s, mode: 'insensitive' } } },
      {
        vehicle: {
          OR: [
            { plate: { contains: s, mode: 'insensitive' } },
            { brand: { contains: s, mode: 'insensitive' } },
            { model: { contains: s, mode: 'insensitive' } },
          ],
        },
      },
    ],
  };
}

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
  deliveryReceiptUrl?: string | null;
  displacementToLoad?: boolean;
  status: TripStatus;
  vehicle?: { id: string; plate: string; brand: string; model: string; vehicleType?: string };
  driver?: { id: string; name: string };
}): ViagemComRelacoes {
  return {
    ...trip,
    freightValue: trip.freightValue != null ? Number(trip.freightValue) : null,
    deliveryReceiptUrl: trip.deliveryReceiptUrl ?? null,
    displacementToLoad: trip.displacementToLoad ?? false,
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

  async findMany(user: AuthUser, status?: TripStatus): Promise<ViagemComRelacoes[]>;
  async findMany(
    user: AuthUser,
    status: TripStatus | undefined,
    pagination: Required<Pick<PaginationOptions, 'limit'>> & Pick<PaginationOptions, 'cursor'>,
  ): Promise<PaginatedResult<ViagemComRelacoes>>;
  async findMany(
    user: AuthUser,
    status?: TripStatus,
    pagination?: Required<Pick<PaginationOptions, 'limit'>> & Pick<PaginationOptions, 'cursor'>,
  ): Promise<ViagemComRelacoes[] | PaginatedResult<ViagemComRelacoes>> {
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
      include: tripRelationsSelect,
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      ...(pagination?.limit ? { take: pagination.limit + 1 } : {}),
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });
    const mapped = list.map(toViagemComRelacoes);
    return pagination?.limit ? paginateResult(mapped, pagination.limit) : mapped;
  }

  private async resolveScopeWhere(user: AuthUser): Promise<Prisma.TripWhereInput | null> {
    if (user.role === Role.DRIVER) {
      const ctx = await this.driverAuth.findDriverForAuthUser(user);
      if (!ctx) return null;
      return { driverId: ctx.id };
    }
    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      return { companyId: await this.companyAccess.resolveCompanyId(user) };
    }
    return null;
  }

  async findListPage(user: AuthUser, input: ListTripsPageInput): Promise<TripsListResult> {
    const scope = await this.resolveScopeWhere(user);
    if (!scope) {
      return {
        items: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: 1,
        counts: { all: 0, byStatus: emptyByStatusRecord() },
      };
    }
    const q = input.search?.trim();
    const searchClause = q ? textSearchOr(q) : null;
    const andList: Prisma.TripWhereInput[] = [scope, ...(searchClause ? [searchClause] : [])];
    if (input.status) andList.push({ status: input.status });
    const whereList: Prisma.TripWhereInput = andList.length === 1 ? andList[0]! : { AND: andList };

    const andCounts: Prisma.TripWhereInput[] = [scope, ...(searchClause ? [searchClause] : [])];
    const whereCounts: Prisma.TripWhereInput = andCounts.length === 1 ? andCounts[0]! : { AND: andCounts };

    const skip = (input.page - 1) * input.pageSize;
    const [rows, total, groupRows, allCount] = await Promise.all([
      this.prisma.trip.findMany({
        where: whereList,
        include: tripRelationsSelect,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        skip,
        take: input.pageSize,
      }),
      this.prisma.trip.count({ where: whereList }),
      this.prisma.trip.groupBy({
        by: ['status'],
        where: whereCounts,
        _count: { _all: true },
      }),
      this.prisma.trip.count({ where: whereCounts }),
    ]);

    const byStatus = emptyByStatusRecord();
    for (const g of groupRows) {
      if (STATUS_COUNT_KEYS.includes(g.status)) {
        byStatus[g.status] = g._count._all;
      }
    }

    const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / input.pageSize));

    return {
      items: rows.map(toViagemComRelacoes),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages,
      counts: { all: allCount, byStatus },
    };
  }

  async findById(user: AuthUser, id: string): Promise<ViagemComRelacoes | null> {
    let trip: Awaited<ReturnType<typeof this.prisma.trip.findFirst>> = null;
    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      const companyId = await this.companyAccess.resolveCompanyId(user);
      trip = await this.prisma.trip.findFirst({
        where: { id, companyId },
        include: tripRelationsSelect,
      });
    } else if (user.role === Role.DRIVER) {
      const ctx = await this.driverAuth.findDriverForAuthUser(user);
      if (!ctx) return null;
      trip = await this.prisma.trip.findFirst({
        where: { id, driverId: ctx.id },
        include: tripRelationsSelect,
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
        displacementToLoad: data.displacementToLoad ?? false,
        status: data.status ?? 'PENDING',
      },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true, vehicleType: true } },
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
        ...(data.deliveryReceiptUrl !== undefined && {
          deliveryReceiptUrl: data.deliveryReceiptUrl?.trim() || null,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true, vehicleType: true } },
        driver: { select: { id: true, name: true } },
      },
    });
    return toViagemComRelacoes(updated);
  }

  async delete(id: string, companyId: string): Promise<void> {
    await this.prisma.trip.deleteMany({ where: { id, companyId } });
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
