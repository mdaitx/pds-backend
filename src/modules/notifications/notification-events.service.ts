import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailService } from '../../core/mail/mail.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';

/**
 * Disparos da task 12: e-mails em eventos de viagem/despesa/acerto.
 * Falhas de e-mail não propagam erro para a requisição HTTP.
 */
@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private baseUrl(): string {
    return (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  /** E-mails de dono titular + OWNER/ADMIN vinculados à empresa (sem duplicar). */
  private async fleetManagerEmails(companyId: string): Promise<string[]> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { owner: { select: { email: true } } },
    });
    const members = await this.prisma.user.findMany({
      where: { companyId },
      select: { email: true, role: true },
    });
    const set = new Set<string>();
    if (company?.owner?.email) set.add(company.owner.email.toLowerCase());
    for (const m of members) {
      if (m.role === Role.OWNER || m.role === Role.ADMIN) {
        set.add(m.email.toLowerCase());
      }
    }
    return [...set];
  }

  async onTripCreated(tripId: string): Promise<void> {
    try {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          driver: { select: { name: true, email: true } },
          vehicle: { select: { plate: true, brand: true, model: true } },
        },
      });
      if (!trip) return;
      const to = trip.driver.email?.trim();
      if (!to) {
        this.logger.warn(`Viagem ${trip.code}: motorista sem e-mail; notificação não enviada.`);
        return;
      }
      const v = trip.vehicle;
      const vehicleLabel = v ? `${v.plate} · ${v.brand} ${v.model}` : '—';
      const link = `${this.baseUrl()}/dashboard/viagens/${trip.id}`;
      const subject = `[Truck Finanças] Nova viagem atribuída — ${trip.code}`;
      const text = `Olá, ${trip.driver.name}.\n\nFoi atribuída a viagem ${trip.code} para você.\nVeículo: ${vehicleLabel}\nOrigem: ${trip.origin ?? '—'}\nDestino: ${trip.destination ?? '—'}\n\nAbra o app: ${link}\n`;
      await this.mail.sendMail({ to, subject, text });
    } catch (e) {
      this.logger.error(`onTripCreated: ${e instanceof Error ? e.message : e}`);
    }
  }

  async onExpenseCreated(expenseId: string, actor: AuthUser): Promise<void> {
    try {
      const expense = await this.prisma.expense.findUnique({
        where: { id: expenseId },
        include: {
          category: { select: { name: true } },
          trip: {
            include: {
              driver: { select: { name: true, email: true, id: true } },
            },
          },
        },
      });
      if (!expense?.trip) return;
      const trip = expense.trip;
      const amount = Number(expense.amount).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      const link = `${this.baseUrl()}/dashboard/viagens/${trip.id}`;

      if (actor.role === Role.DRIVER) {
        const recipients = await this.fleetManagerEmails(trip.companyId);
        if (recipients.length === 0) return;
        const subject = `[Truck Finanças] Nova despesa na viagem ${trip.code}`;
        const text = `O motorista ${trip.driver.name} lançou uma despesa na viagem ${trip.code}.\nCategoria: ${expense.category.name}\nValor: ${amount}\n${expense.description ? `Descrição: ${expense.description}\n` : ''}\nVer viagem: ${link}\n`;
        await this.mail.sendMail({ to: recipients, subject, text });
        return;
      }

      if (actor.role === Role.OWNER || actor.role === Role.ADMIN) {
        const to = trip.driver.email?.trim();
        if (!to) return;
        const subject = `[Truck Finanças] Despesa registrada na sua viagem ${trip.code}`;
        const text = `Olá, ${trip.driver.name}.\n\nUma despesa foi registrada na viagem ${trip.code}.\nCategoria: ${expense.category.name}\nValor: ${amount}\n\nDetalhes: ${link}\n`;
        await this.mail.sendMail({ to, subject, text });
      }
    } catch (e) {
      this.logger.error(`onExpenseCreated: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Deslocamento: viagem concluída sem registro de acerto financeiro. */
  async onDisplacementTripCompleted(tripId: string): Promise<void> {
    try {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          driver: { select: { name: true, email: true } },
        },
      });
      if (!trip?.displacementToLoad) return;
      const link = `${this.baseUrl()}/dashboard/viagens/${trip.id}`;
      const toDriver = trip.driver.email?.trim();
      if (toDriver) {
        await this.mail.sendMail({
          to: toDriver,
          subject: `[Truck Finanças] Deslocamento ${trip.code} concluído`,
          text: `Olá, ${trip.driver.name}.\n\nA viagem de deslocamento ${trip.code} foi finalizada. Este trecho não gera acerto de frete nem comissão.\n\nAbra o app: ${link}\n`,
        });
      }
      const managers = await this.fleetManagerEmails(trip.companyId);
      if (managers.length > 0) {
        await this.mail.sendMail({
          to: managers,
          subject: `[Truck Finanças] Deslocamento ${trip.code} concluído`,
          text: `A viagem de deslocamento ${trip.code} foi finalizada pelo motorista ou pela frota.\nNão há acerto financeiro para este trecho.\n${link}\n`,
        });
      }
    } catch (e) {
      this.logger.error(`onDisplacementTripCompleted: ${e instanceof Error ? e.message : e}`);
    }
  }

  async onTripFinalized(tripId: string): Promise<void> {
    try {
      const settlement = await this.prisma.settlement.findUnique({
        where: { tripId },
        include: {
          trip: {
            include: {
              driver: { select: { name: true, email: true } },
            },
          },
        },
      });
      if (!settlement?.trip) return;
      const trip = settlement.trip;
      const toDriver = trip.driver.email?.trim();
      const pay = Number(settlement.amountToPayDriver).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      const link = `${this.baseUrl()}/dashboard/viagens/${trip.id}/acerto`;
      const subject = `[Truck Finanças] Viagem ${trip.code} finalizada — acerto disponível`;
      const textDriver = `Olá, ${trip.driver.name}.\n\nA viagem ${trip.code} foi finalizada.\nValor a receber (comissão da viagem): ${pay}\n(Adiantamentos abatem do salário, não da comissão.)\n\nConsulte o acerto: ${link}\n`;
      if (toDriver) {
        await this.mail.sendMail({ to: toDriver, subject, text: textDriver });
      }

      const managers = await this.fleetManagerEmails(trip.companyId);
      if (managers.length > 0) {
        const ownerResult = Number(settlement.ownerResult).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const textMgr = `A viagem ${trip.code} foi finalizada e o acerto foi gerado.\nResultado do dono (referência): ${ownerResult}\nAbrir: ${link}\n`;
        await this.mail.sendMail({
          to: managers,
          subject: `[Truck Finanças] Viagem ${trip.code} concluída — acerto gerado`,
          text: textMgr,
        });
      }
    } catch (e) {
      this.logger.error(`onTripFinalized: ${e instanceof Error ? e.message : e}`);
    }
  }
}
