import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, TripStatus, CommissionCalculationMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import { DriverAuthService } from '../../core/driver-auth/driver-auth.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';
import { NotificationEventsService } from '../notifications/notification-events.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class AcertosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly driverAuth: DriverAuthService,
    private readonly notificationEvents: NotificationEventsService,
    private readonly subscription: SubscriptionService,
  ) {}

  private async ensureCanAccessTrip(user: AuthUser, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, companyId: true, driverId: true },
    });
    if (!trip) {
      throw new NotFoundException('Viagem nao encontrada');
    }
    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      const companyId = await this.companyAccess.resolveCompanyId(user);
      if (companyId !== trip.companyId) {
        throw new ForbiddenException('Viagem nao pertence a sua empresa');
      }
    } else if (user.role === Role.DRIVER) {
      const ctx = await this.driverAuth.findDriverForAuthUser(user);
      if (!ctx || ctx.id !== trip.driverId) {
        throw new ForbiddenException('Acesso negado');
      }
    } else {
      throw new ForbiddenException('Acesso negado');
    }
    return trip;
  }

  async finalize(user: AuthUser, tripId: string, finalKm?: number) {
    const companyId = await this.companyAccess.resolveCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: true,
        expenses: true,
        advances: true,
        settlement: true,
      },
    });
    if (!trip) {
      throw new NotFoundException('Viagem nao encontrada');
    }
    if (trip.companyId !== companyId) {
      throw new ForbiddenException('Viagem nao pertence a sua empresa');
    }
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Empresa nao encontrada');
    }
    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException('Viagem ja foi finalizada');
    }
    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Viagem cancelada nao pode ser finalizada');
    }
    if (trip.settlement) {
      throw new BadRequestException('Acerto ja existe para esta viagem');
    }

    const freightValue = trip.freightValue ? Number(trip.freightValue) : 0;
    const totalExpenses = trip.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalAdvances = trip.advances.reduce((sum, a) => sum + Number(a.amount), 0);
    const commissionPct = trip.driver.commissionPct
      ? Number(trip.driver.commissionPct)
      : company.defaultCommission
        ? Number(company.defaultCommission)
        : 0;
    const grossProfit = freightValue - totalExpenses;
    const commissionBase =
      company.commissionMethod === CommissionCalculationMethod.FREIGHT_VALUE
        ? freightValue
        : grossProfit;
    const driverCommissionAmt = (commissionBase * commissionPct) / 100;
    const amountToPayDriver = driverCommissionAmt - totalAdvances;
    const ownerResult = grossProfit - driverCommissionAmt;

    const settlement = await this.prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.COMPLETED,
          endDate: new Date(),
          ...(finalKm != null && { finalKm }),
        },
      });
      return tx.settlement.create({
        data: {
          tripId,
          totalExpenses: new Decimal(totalExpenses),
          grossProfit: new Decimal(grossProfit),
          driverCommissionPct: new Decimal(commissionPct),
          driverCommissionAmt: new Decimal(driverCommissionAmt),
          totalAdvances: new Decimal(totalAdvances),
          amountToPayDriver: new Decimal(amountToPayDriver),
          ownerResult: new Decimal(ownerResult),
          finalKm: finalKm ?? trip.finalKm,
        },
      });
    });
    void this.notificationEvents.onTripFinalized(tripId);
    return this.formatSettlement(settlement);
  }

  async findByTrip(user: AuthUser, tripId: string) {
    await this.ensureCanAccessTrip(user, tripId);
    const settlement = await this.prisma.settlement.findUnique({
      where: { tripId },
      include: {
        trip: {
          include: {
            vehicle: { select: { id: true, plate: true, brand: true, model: true, vehicleType: true } },
            driver: { select: { id: true, name: true, commissionPct: true } },
            expenses: {
              include: { category: { select: { id: true, name: true, icon: true, color: true } } },
              orderBy: { date: 'desc' },
            },
            advances: { orderBy: { date: 'desc' } },
          },
        },
      },
    });
    if (!settlement) return null;
    return {
      ...this.formatSettlement(settlement),
      trip: {
        id: settlement.trip.id,
        code: settlement.trip.code,
        clientName: settlement.trip.clientName,
        origin: settlement.trip.origin,
        destination: settlement.trip.destination,
        startDate: settlement.trip.startDate,
        endDate: settlement.trip.endDate,
        freightValue: settlement.trip.freightValue ? Number(settlement.trip.freightValue) : 0,
        initialKm: settlement.trip.initialKm,
        finalKm: settlement.trip.finalKm,
        status: settlement.trip.status,
        vehicle: settlement.trip.vehicle,
        driver: settlement.trip.driver
          ? { ...settlement.trip.driver, commissionPct: settlement.trip.driver.commissionPct ? Number(settlement.trip.driver.commissionPct) : null }
          : null,
        expenses: settlement.trip.expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
          liters: e.liters != null ? Number(e.liters) : null,
          pricePerLiter: e.pricePerLiter != null ? Number(e.pricePerLiter) : null,
        })),
        advances: settlement.trip.advances.map((a) => ({ ...a, amount: Number(a.amount) })),
      },
    };
  }

  async markAsPaid(user: AuthUser, tripId: string) {
    const companyId = await this.companyAccess.resolveCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const settlement = await this.prisma.settlement.findUnique({
      where: { tripId },
      include: { trip: { select: { companyId: true } } },
    });
    if (!settlement) throw new NotFoundException('Acerto nao encontrado');
    if (settlement.trip.companyId !== companyId) {
      throw new ForbiddenException('Acerto nao pertence a sua empresa');
    }
    if (settlement.paid) throw new BadRequestException('Acerto ja foi marcado como pago');
    const updated = await this.prisma.settlement.update({
      where: { tripId },
      data: { paid: true, paidAt: new Date() },
    });
    return this.formatSettlement(updated);
  }

  private formatSettlement(s: any) {
    return {
      id: s.id,
      tripId: s.tripId,
      totalExpenses: Number(s.totalExpenses),
      grossProfit: Number(s.grossProfit),
      driverCommissionPct: Number(s.driverCommissionPct),
      driverCommissionAmt: Number(s.driverCommissionAmt),
      totalAdvances: Number(s.totalAdvances),
      amountToPayDriver: Number(s.amountToPayDriver),
      ownerResult: Number(s.ownerResult),
      finalKm: s.finalKm,
      paid: s.paid,
      paidAt: s.paidAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}