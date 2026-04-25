import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import { DriverAuthService } from '../../core/driver-auth/driver-auth.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarDespesaDto } from './dto/criar-despesa.dto';
import { AtualizarDespesaDto } from './dto/atualizar-despesa.dto';
import { NotificationEventsService } from '../notifications/notification-events.service';
import { SubscriptionService } from '../subscription/subscription.service';

const RECEIPT_REQUIRED_THRESHOLD = 100;

@Injectable()
export class DespesasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly driverAuth: DriverAuthService,
    private readonly notificationEvents: NotificationEventsService,
    private readonly subscription: SubscriptionService,
  ) {}

  /**
   * Verifica se o usuário pode acessar a viagem.
   * OWNER: viagem da empresa do dono.
   * DRIVER: viagem onde o motorista é o driver (match por email no Driver).
   */
  private async ensureCanAccessTrip(user: AuthUser, tripId: string): Promise<{ tripId: string; companyId: string }> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }

    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      const companyId = await this.companyAccess.resolveCompanyId(user);
      if (companyId !== trip.companyId) {
        throw new ForbiddenException('Viagem não pertence à sua empresa');
      }
      return { tripId, companyId: trip.companyId };
    }

    if (user.role === Role.DRIVER) {
      const ctx = await this.driverAuth.findDriverForAuthUser(user);
      if (!ctx || ctx.id !== trip.driverId) {
        throw new ForbiddenException('Você só pode adicionar despesas às suas viagens');
      }
      return { tripId, companyId: trip.companyId };
    }

    throw new ForbiddenException('Acesso negado');
  }

  /** Valida se categoria pertence à empresa ou é do sistema */
  private async ensureCategoryValid(categoryId: string, companyId: string): Promise<void> {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id: categoryId,
        OR: [{ companyId: null }, { companyId }],
      },
    });
    if (!category) {
      throw new BadRequestException('Categoria de despesa inválida');
    }
  }

  async findByTrip(user: AuthUser, tripId: string) {
    await this.ensureCanAccessTrip(user, tripId);
    const expenses = await this.prisma.expense.findMany({
      where: { tripId },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { date: 'desc' },
    });
    return expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      liters: e.liters != null ? Number(e.liters) : null,
      pricePerLiter: e.pricePerLiter != null ? Number(e.pricePerLiter) : null,
    }));
  }

  async create(user: AuthUser, dto: CriarDespesaDto) {
    const { tripId, companyId } = await this.ensureCanAccessTrip(user, dto.tripId);
    await this.subscription.assertOperationalAccess(companyId);
    await this.ensureCategoryValid(dto.categoryId, companyId);

    if (dto.amount > RECEIPT_REQUIRED_THRESHOLD && !dto.receiptUrl?.trim()) {
      throw new BadRequestException(
        `Comprovante obrigatório para despesas acima de R$ ${RECEIPT_REQUIRED_THRESHOLD}. Faça o upload da foto.`,
      );
    }

    const created = await this.prisma.expense.create({
      data: {
        tripId,
        categoryId: dto.categoryId,
        date: new Date(dto.date),
        amount: new Decimal(dto.amount),
        description: dto.description?.trim() || undefined,
        location: dto.location?.trim() || undefined,
        receiptUrl: dto.receiptUrl?.trim() || undefined,
        liters: dto.liters != null ? new Decimal(dto.liters) : undefined,
        pricePerLiter: dto.pricePerLiter != null ? new Decimal(dto.pricePerLiter) : undefined,
        gasStation: dto.gasStation?.trim() || undefined,
        tollPlaza: dto.tollPlaza?.trim() || undefined,
        createdById: user.id,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });
    const out = {
      ...created,
      amount: Number(created.amount),
      liters: created.liters != null ? Number(created.liters) : null,
      pricePerLiter: created.pricePerLiter != null ? Number(created.pricePerLiter) : null,
    };
    void this.notificationEvents.onExpenseCreated(created.id, user);
    return out;
  }

  async update(user: AuthUser, id: string, dto: AtualizarDespesaDto) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { trip: true },
    });
    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }
    const { companyId } = await this.ensureCanAccessTrip(user, expense.tripId);
    await this.subscription.assertOperationalAccess(companyId);

    if (dto.categoryId) {
      await this.ensureCategoryValid(dto.categoryId, expense.trip.companyId);
    }

    const newAmount = dto.amount ?? Number(expense.amount);
    const newReceiptUrl = dto.receiptUrl !== undefined ? dto.receiptUrl : expense.receiptUrl;
    if (newAmount > RECEIPT_REQUIRED_THRESHOLD && !newReceiptUrl?.trim()) {
      throw new BadRequestException(
        `Comprovante obrigatório para despesas acima de R$ ${RECEIPT_REQUIRED_THRESHOLD}.`,
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.location !== undefined && { location: dto.location?.trim() || null }),
        ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl?.trim() || null }),
        ...(dto.liters !== undefined && { liters: dto.liters != null ? new Decimal(dto.liters) : null }),
        ...(dto.pricePerLiter !== undefined && { pricePerLiter: dto.pricePerLiter != null ? new Decimal(dto.pricePerLiter) : null }),
        ...(dto.gasStation !== undefined && { gasStation: dto.gasStation?.trim() || null }),
        ...(dto.tollPlaza !== undefined && { tollPlaza: dto.tollPlaza?.trim() || null }),
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });
    return {
      ...updated,
      amount: Number(updated.amount),
      liters: updated.liters != null ? Number(updated.liters) : null,
      pricePerLiter: updated.pricePerLiter != null ? Number(updated.pricePerLiter) : null,
    };
  }

  async remove(user: AuthUser, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });
    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }
    const { companyId } = await this.ensureCanAccessTrip(user, expense.tripId);
    await this.subscription.assertOperationalAccess(companyId);
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}
