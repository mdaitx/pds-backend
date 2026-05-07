import { Injectable, ForbiddenException } from '@nestjs/common';
import { Role, TripStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import { DriverAuthService } from '../../core/driver-auth/driver-auth.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';

type ChartPeriod = '1m' | '6m' | '1y';
type ChartPoint = { mes: string; faturamento: number; despesas: number };
type CategoryBarPoint = { id: string; categoria: string; valor: number; color: string };

const tripInclude = {
  vehicle: { select: { id: true, plate: true, brand: true, model: true, vehicleType: true } },
  driver: { select: { id: true, name: true } },
} as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

function calendarMonthWeekBuckets(year: number, month: number): { start: Date; end: Date; label: string }[] {
  const first = startOfDay(new Date(year, month, 1));
  const last = endOfDay(new Date(year, month + 1, 0));
  const buckets: { start: Date; end: Date; label: string }[] = [];
  const cur = new Date(first);
  let week = 1;

  while (cur <= last) {
    const start = startOfDay(new Date(cur));
    const endPlus6 = new Date(start);
    endPlus6.setDate(endPlus6.getDate() + 6);
    buckets.push({
      start,
      end: endOfDay(endPlus6 > last ? last : endPlus6),
      label: `${week}ª sem.`,
    });
    cur.setDate(cur.getDate() + 7);
    week++;
  }

  return buckets;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly driverAuth: DriverAuthService,
  ) {}

  async summary(user: AuthUser) {
    if (user.role === Role.DRIVER) {
      return this.driverSummary(user);
    }
    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      return this.ownerSummary(user);
    }
    throw new ForbiddenException('Acesso negado');
  }

  async charts(user: AuthUser) {
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Acesso negado');
    }

    const companyId = await this.companyAccess.resolveCompanyId(user);
    const now = new Date();
    const oneYearStart = startOfDay(addMonths(now, -11));

    const [tripsForCharts, expensesForCharts] = await Promise.all([
      this.prisma.trip.findMany({
        where: { companyId, startDate: { gte: oneYearStart } },
        select: { id: true, startDate: true, status: true, freightValue: true },
      }),
      this.prisma.expense.findMany({
        where: { trip: { companyId }, date: { gte: oneYearStart } },
        select: {
          id: true,
          date: true,
          amount: true,
          category: { select: { name: true, color: true } },
        },
      }),
    ]);

    return {
      chartDataByPeriod: this.buildChartDataByPeriod(tripsForCharts, expensesForCharts),
      categoryBarsByPeriod: this.buildCategoryBarsByPeriod(expensesForCharts),
    };
  }

  private async ownerSummary(user: AuthUser) {
    const companyId = await this.companyAccess.resolveCompanyId(user);
    const now = new Date();
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 1));

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerId: true },
    });

    const [
      recentTrips,
      monthCompletedTrips,
      monthExpenses,
      monthTripsCount,
      totalTripsCount,
      vehiclesCount,
      driversCount,
      staffUsersCount,
      inProgressCount,
    ] = await Promise.all([
      this.prisma.trip.findMany({
        where: { companyId },
        include: tripInclude,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        take: 10,
      }),
      this.prisma.trip.findMany({
        where: {
          companyId,
          status: TripStatus.COMPLETED,
          startDate: { gte: monthStart, lt: nextMonthStart },
        },
        select: { id: true, freightValue: true },
      }),
      this.prisma.expense.findMany({
        where: { trip: { companyId }, date: { gte: monthStart, lt: nextMonthStart } },
        select: { id: true, amount: true },
      }),
      this.prisma.trip.count({ where: { companyId, startDate: { gte: monthStart, lt: nextMonthStart } } }),
      this.prisma.trip.count({ where: { companyId } }),
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.driver.count({ where: { companyId } }),
      this.prisma.user.count({
        where: { OR: [{ companyId }, ...(company?.ownerId ? [{ id: company.ownerId }] : [])] },
      }),
      this.prisma.trip.count({ where: { companyId, status: TripStatus.IN_PROGRESS } }),
    ]);

    const totalFaturamento = monthCompletedTrips.reduce((sum, trip) => sum + Number(trip.freightValue ?? 0), 0);
    const totalDespesasMes = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

    return {
      role: user.role,
      monthTripsCount,
      totalTripsCount,
      vehiclesCount,
      driversCount,
      staffUsersCount,
      totalFaturamento,
      totalDespesasMes,
      lucroLiquido: totalFaturamento - totalDespesasMes,
      emAndamento: inProgressCount,
      recentTrips: recentTrips.map((trip) => ({
        ...trip,
        freightValue: trip.freightValue != null ? Number(trip.freightValue) : null,
      })),
    };
  }

  private async driverSummary(user: AuthUser) {
    const driver = await this.driverAuth.findDriverForAuthUser(user);
    if (!driver) {
      return { role: user.role, trips: [], settlementsByTripId: {}, recentAdvances: [] };
    }

    const now = new Date();
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    /** Último instante do mês civil (alinha com o filtro por mês no app; evita cortar viagens com início após “hoje”). */
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    /** Viagens concluídas neste mês civil (por `endDate`), para comissões, km e contagem. */
    const [recentTrips, completedInMonthTrips, advances] = await Promise.all([
      this.prisma.trip.findMany({
        where: { driverId: driver.id },
        include: tripInclude,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
      this.prisma.trip.findMany({
        where: {
          driverId: driver.id,
          status: TripStatus.COMPLETED,
          endDate: { not: null, gte: monthStart, lte: monthEnd },
        },
        include: tripInclude,
        orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.advance.findMany({
        where: { trip: { driverId: driver.id } },
        include: { trip: { select: { code: true } } },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: 8,
      }),
    ]);
    const completedInMonthTripIds = completedInMonthTrips.map((trip) => trip.id);
    const recentCompletedTripIds = recentTrips
      .filter((t) => t.status === TripStatus.COMPLETED)
      .map((t) => t.id);
    /** União: acertos para concluídas no mês + concluídas entre as 50 recentes. */
    const settlementTripIds = [...new Set([...completedInMonthTripIds, ...recentCompletedTripIds])];
    const tripsById = new Map([...recentTrips, ...completedInMonthTrips].map((trip) => [trip.id, trip]));

    const settlements = await (
      settlementTripIds.length
        ? this.prisma.settlement.findMany({ where: { tripId: { in: settlementTripIds } } })
        : Promise.resolve([])
    );

    return {
      role: user.role,
      trips: Array.from(tripsById.values()).map((trip) => ({
        ...trip,
        freightValue: trip.freightValue != null ? Number(trip.freightValue) : null,
      })),
      settlementsByTripId: Object.fromEntries(
        settlements.map((settlement) => [
          settlement.tripId,
          {
            id: settlement.id,
            tripId: settlement.tripId,
            totalExpenses: Number(settlement.totalExpenses),
            grossProfit: Number(settlement.grossProfit),
            driverCommissionPct: Number(settlement.driverCommissionPct),
            driverCommissionAmt: Number(settlement.driverCommissionAmt),
            totalAdvances: Number(settlement.totalAdvances),
            amountToPayDriver: Number(settlement.amountToPayDriver),
            ownerResult: Number(settlement.ownerResult),
            finalKm: settlement.finalKm != null ? Number(settlement.finalKm) : null,
            paid: settlement.paid,
            paidAt: settlement.paidAt,
            createdAt: settlement.createdAt,
            updatedAt: settlement.updatedAt,
          },
        ]),
      ),
      recentAdvances: advances.map((advance) => ({
        ...advance,
        tripCode: advance.trip.code,
        amount: Number(advance.amount),
        trip: undefined,
      })),
    };
  }

  private buildChartDataByPeriod(
    trips: { startDate: Date; status: TripStatus; freightValue: unknown }[],
    expenses: { date: Date; amount: unknown }[],
  ): Record<ChartPeriod, ChartPoint[]> {
    return {
      '1m': this.buildLineData('1m', trips, expenses),
      '6m': this.buildLineData('6m', trips, expenses),
      '1y': this.buildLineData('1y', trips, expenses),
    };
  }

  private buildLineData(
    period: ChartPeriod,
    trips: { startDate: Date; status: TripStatus; freightValue: unknown }[],
    expenses: { date: Date; amount: unknown }[],
  ): ChartPoint[] {
    const now = new Date();

    if (period === '1m') {
      return calendarMonthWeekBuckets(now.getFullYear(), now.getMonth()).map((bucket) =>
        this.linePoint(bucket.label, bucket.start, bucket.end, trips, expenses),
      );
    }

    const monthCount = period === '6m' ? 6 : 12;
    return Array.from({ length: monthCount }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1);
      return this.linePoint(
        d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        startOfDay(d),
        endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
        trips,
        expenses,
      );
    });
  }

  private linePoint(
    mes: string,
    start: Date,
    end: Date,
    trips: { startDate: Date; status: TripStatus; freightValue: unknown }[],
    expenses: { date: Date; amount: unknown }[],
  ): ChartPoint {
    return {
      mes,
      faturamento: trips
        .filter((trip) => trip.status === TripStatus.COMPLETED && inRange(trip.startDate, start, end))
        .reduce((sum, trip) => sum + Number(trip.freightValue ?? 0), 0),
      despesas: expenses
        .filter((expense) => inRange(expense.date, start, end))
        .reduce((sum, expense) => sum + Number(expense.amount), 0),
    };
  }

  private buildCategoryBarsByPeriod(
    expenses: { date: Date; amount: unknown; category: { name: string; color: string } }[],
  ): Record<ChartPeriod, CategoryBarPoint[]> {
    return {
      '1m': this.buildCategoryBars('1m', expenses),
      '6m': this.buildCategoryBars('6m', expenses),
      '1y': this.buildCategoryBars('1y', expenses),
    };
  }

  private buildCategoryBars(
    period: ChartPeriod,
    expenses: { date: Date; amount: unknown; category: { name: string; color: string } }[],
  ): CategoryBarPoint[] {
    const now = new Date();
    const rangeStart =
      period === '1m'
        ? startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
        : startOfDay(addMonths(now, period === '6m' ? -5 : -11));
    const rangeEnd = endOfDay(now);
    const totals = new Map<string, { categoria: string; valor: number; color: string }>();

    for (const expense of expenses) {
      if (!inRange(expense.date, rangeStart, rangeEnd)) continue;
      const key = expense.category.name;
      const current = totals.get(key) ?? {
        categoria: key,
        valor: 0,
        color: expense.category.color || '#94a3b8',
      };
      current.valor += Number(expense.amount);
      totals.set(key, current);
    }

    return Array.from(totals.values())
      .filter((entry) => entry.valor > 0)
      .map((entry, index) => ({ id: `${entry.categoria}-${index}`, ...entry }));
  }
}
