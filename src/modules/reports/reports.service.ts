import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';

type TripsReportPeriod = {
  from?: string;
  to?: string;
};

function parseYmdBoundary(value: string | undefined, boundary: 'start' | 'end'): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Informe o período no formato YYYY-MM-DD');
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new BadRequestException('Período inválido');
  }

  if (boundary === 'start') {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async trips(user: AuthUser, period: TripsReportPeriod) {
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Acesso negado');
    }

    const from = parseYmdBoundary(period.from, 'start');
    const to = parseYmdBoundary(period.to, 'end');
    if (from > to) {
      throw new BadRequestException('A data inicial deve ser anterior à data final');
    }

    const companyId = await this.companyAccess.resolveCompanyId(user);
    const trips = await this.prisma.trip.findMany({
      where: {
        companyId,
        startDate: { gte: from, lte: to },
      },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true, vehicleType: true } },
        driver: { select: { id: true, name: true } },
        expenses: {
          include: { category: { select: { id: true, name: true, icon: true, color: true } } },
          orderBy: { date: 'desc' },
        },
        advances: { orderBy: { date: 'desc' } },
        settlement: true,
      },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });

    const expensesByTripId: Record<string, unknown[]> = {};
    const advancesByTripId: Record<string, unknown[]> = {};
    const settlementByTripId: Record<string, unknown | null> = {};

    const tripList = trips.map((trip) => {
      expensesByTripId[trip.id] = trip.expenses.map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
        liters: expense.liters != null ? Number(expense.liters) : null,
        pricePerLiter: expense.pricePerLiter != null ? Number(expense.pricePerLiter) : null,
      }));

      advancesByTripId[trip.id] = trip.advances.map((advance) => ({
        ...advance,
        amount: Number(advance.amount),
      }));

      settlementByTripId[trip.id] = trip.settlement
        ? {
            id: trip.settlement.id,
            tripId: trip.settlement.tripId,
            totalExpenses: Number(trip.settlement.totalExpenses),
            grossProfit: Number(trip.settlement.grossProfit),
            driverCommissionPct: Number(trip.settlement.driverCommissionPct),
            driverCommissionAmt: Number(trip.settlement.driverCommissionAmt),
            totalAdvances: Number(trip.settlement.totalAdvances),
            amountToPayDriver: Number(trip.settlement.amountToPayDriver),
            ownerResult: Number(trip.settlement.ownerResult),
            finalKm: trip.settlement.finalKm,
            paid: trip.settlement.paid,
            paidAt: trip.settlement.paidAt,
            createdAt: trip.settlement.createdAt,
            updatedAt: trip.settlement.updatedAt,
          }
        : null;

      return {
        id: trip.id,
        code: trip.code,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        companyId: trip.companyId,
        clientName: trip.clientName,
        origin: trip.origin,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        freightValue: trip.freightValue != null ? Number(trip.freightValue) : null,
        initialKm: trip.initialKm,
        finalKm: trip.finalKm,
        loadType: trip.loadType,
        notes: trip.notes,
        status: trip.status,
        displacementToLoad: trip.displacementToLoad,
        vehicle: trip.vehicle,
        driver: trip.driver,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
      };
    });

    return {
      trips: tripList,
      expensesByTripId,
      advancesByTripId,
      settlementByTripId,
      generatedAt: new Date(),
    };
  }
}
