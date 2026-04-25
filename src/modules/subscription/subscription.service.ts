import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

export const TRIAL_MAX_VEHICLES = 3;
export const TRIAL_DAYS = 30;
export const PRICE_PER_VEHICLE_BRL = 19.9;

export type SubscriptionStatusPayload = {
  status: SubscriptionStatus;
  isOperational: boolean;
  vehicleCount: number;
  maxVehiclesTrial: number;
  pricePerVehicleBrl: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeConfigured: boolean;
  checkoutAvailable: boolean;
  message: string | null;
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    this.stripe = key ? new Stripe(key) : null;
  }

  isOperational(company: {
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  }): boolean {
    const now = new Date();
    if (company.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      if (!company.currentPeriodEnd) return true;
      return now <= company.currentPeriodEnd;
    }
    if (company.subscriptionStatus === SubscriptionStatus.TRIAL) {
      if (!company.trialEndsAt) return false;
      return now <= company.trialEndsAt;
    }
    return false;
  }

  private trialVehicleCapReached(vehicleCount: number, company: { subscriptionStatus: SubscriptionStatus }): boolean {
    return company.subscriptionStatus === SubscriptionStatus.TRIAL && vehicleCount >= TRIAL_MAX_VEHICLES;
  }

  async assertOperationalAccess(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }
    if (!this.isOperational(company)) {
      throw new HttpException(
        'Assinatura inativa ou período de teste encerrado. Acesse Configurações e regularize o plano para continuar.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  /**
   * Trial: no máx. 3 veículos. Plano pago: sem teto (cobrança por veículo ativa no Stripe).
   */
  async assertCanAddVehicle(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }
    if (!this.isOperational(company)) {
      throw new HttpException(
        'Assinatura inativa ou período de teste encerrado. Acesse Configurações e regularize o plano para continuar.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    const count = await this.prisma.vehicle.count({ where: { companyId } });
    if (this.trialVehicleCapReached(count, company)) {
      throw new BadRequestException(
        `No teste grátis você pode cadastrar até ${TRIAL_MAX_VEHICLES} veículos. Assine o plano (R$ ${PRICE_PER_VEHICLE_BRL.toFixed(2)}/veículo ao mês) para adicionar mais.`,
      );
    }
  }

  async getStatusForOwner(companyId: string): Promise<SubscriptionStatusPayload> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }
    const vehicleCount = await this.prisma.vehicle.count({ where: { companyId } });
    const isOperational = this.isOperational(company);
    const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
    return {
      status: company.subscriptionStatus,
      isOperational,
      vehicleCount,
      maxVehiclesTrial: TRIAL_MAX_VEHICLES,
      pricePerVehicleBrl: PRICE_PER_VEHICLE_BRL,
      trialEndsAt: company.trialEndsAt ? company.trialEndsAt.toISOString() : null,
      currentPeriodEnd: company.currentPeriodEnd ? company.currentPeriodEnd.toISOString() : null,
      stripeConfigured,
      checkoutAvailable: Boolean(this.stripe && process.env.STRIPE_PRICE_ID),
      message: this.buildUserMessage(company, isOperational, vehicleCount),
    };
  }

  private buildUserMessage(
    company: { subscriptionStatus: SubscriptionStatus; trialEndsAt: Date | null; currentPeriodEnd: Date | null },
    isOperational: boolean,
    vehicleCount: number,
  ): string | null {
    if (!isOperational) {
      return 'Renove a assinatura em Configurações para voltar a criar viagens, despesas e cadastros operacionais.';
    }
    if (company.subscriptionStatus === SubscriptionStatus.TRIAL && company.trialEndsAt) {
      return `Teste grátis: até ${TRIAL_MAX_VEHICLES} veículos. Veículos atuais: ${vehicleCount}. O teste encerra em ${company.trialEndsAt.toLocaleDateString('pt-BR')}.`;
    }
    if (company.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      return 'Plano ativo. A cobrança segue a quantidade de veículos cadastrados (R$ 19,90/veículo/mês).';
    }
    return null;
  }

  assertStripeForCheckout() {
    if (!this.stripe) {
      throw new BadRequestException('Pagamentos ainda não configurados no servidor (STRIPE_SECRET_KEY).');
    }
    const price = process.env.STRIPE_PRICE_ID?.trim();
    if (!price) {
      throw new BadRequestException('STRIPE_PRICE_ID não definido. Crie o preço recorrente em BRL no Stripe.');
    }
  }

  getStripe(): Stripe {
    this.assertStripeForCheckout();
    return this.stripe as Stripe;
  }

  async createCheckoutSession(params: { companyId: string; userEmail: string; successPath?: string; cancelPath?: string }) {
    this.assertStripeForCheckout();
    const priceId = process.env.STRIPE_PRICE_ID!.trim();
    const company = await this.prisma.company.findUnique({
      where: { id: params.companyId },
      include: { owner: { select: { email: true } } },
    });
    if (!company) throw new BadRequestException('Empresa não encontrada');

    const vehicleCount = await this.prisma.vehicle.count({ where: { companyId: params.companyId } });
    const quantity = Math.max(1, vehicleCount);

    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await this.getStripe().customers.create({
        email: params.userEmail || company.owner?.email,
        metadata: { companyId: company.id },
      });
      customerId = customer.id;
      await this.prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const success = `${base}${params.successPath || '/dashboard/config?sub=success'}`;
    const cancel = `${base}${params.cancelPath || '/dashboard/config?sub=cancel'}`;

    const session = await this.getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      success_url: success,
      cancel_url: cancel,
      allow_promotion_codes: true,
      client_reference_id: company.id,
      metadata: { companyId: company.id },
      subscription_data: {
        metadata: { companyId: company.id },
      },
    });

    return { url: session.url };
  }

  async createBillingPortalSession(companyId: string, returnPath?: string) {
    this.assertStripeForCheckout();
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company?.stripeCustomerId) {
      throw new BadRequestException('Não há fatura vinculada. Conclua uma assinatura antes de abrir o portal.');
    }
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const session = await this.getStripe().billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${base}${returnPath || '/dashboard/config'}`,
    });
    return { url: session.url };
  }

  /**
   * Atualiza a quantidade de assentos no Stripe (preço por veículo) quando a frota muda.
   */
  async syncBillableSeatsAfterVehicleChange(companyId: string): Promise<void> {
    if (!this.stripe) return;
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company?.stripeSubscriptionId) return;
    if (company.subscriptionStatus !== SubscriptionStatus.ACTIVE) return;

    try {
      const sub = await this.stripe.subscriptions.retrieve(company.stripeSubscriptionId, {
        expand: ['items.data.price'],
      });
      const item = sub.items.data[0];
      if (!item?.id) return;
      const count = await this.prisma.vehicle.count({ where: { companyId } });
      const quantity = Math.max(1, count);
      await this.stripe.subscriptions.update(company.stripeSubscriptionId, {
        items: [{ id: item.id, quantity }],
        proration_behavior: 'create_prorations',
      });
    } catch (e) {
      this.logger.warn(
        `Falha ao sincronizar assentos Stripe (empresa ${companyId}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async processStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.stripe) {
      throw new BadRequestException('STRIPE_SECRET_KEY ausente');
    }
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!whSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET ausente');
    }
    if (!signature) {
      throw new BadRequestException('Cabeçalho stripe-signature ausente');
    }
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, whSecret);
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.upsertCompanyFromSubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.markSubscriptionEnded(sub);
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.subscription;
        const subId =
          typeof subRef === 'string' ? subRef : subRef && typeof subRef === 'object' && 'id' in subRef
            ? (subRef as { id: string }).id
            : null;
        if (subId) {
          const sub = await this.stripe!.subscriptions.retrieve(subId);
          await this.upsertCompanyFromSubscription(sub);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.subscription;
        const subId =
          typeof subRef === 'string' ? subRef : subRef && typeof subRef === 'object' && 'id' in subRef
            ? (subRef as { id: string }).id
            : null;
        if (subId) {
          const sub = await this.stripe!.subscriptions.retrieve(subId);
          await this.upsertCompanyFromSubscription(sub, SubscriptionStatus.PAST_DUE);
        }
        break;
      }
      default:
        this.logger.log(`Evento Stripe ignorado: ${event.type}`);
    }
  }

  private async onCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription' || !session.subscription) return;
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    const sub = await this.stripe!.subscriptions.retrieve(subId);
    await this.upsertCompanyFromSubscription(sub);
  }

  private mapStripeStatus(
    s: Stripe.Subscription['status'] | null | undefined,
  ): SubscriptionStatus {
    switch (s) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return SubscriptionStatus.CANCELED;
      default:
        return SubscriptionStatus.EXPIRED;
    }
  }

  private async resolveCompanyIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
    const fromMeta = sub.metadata?.companyId;
    if (fromMeta) return fromMeta;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) return null;
    const c = await this.prisma.company.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    return c?.id ?? null;
  }

  private async upsertCompanyFromSubscription(
    sub: Stripe.Subscription,
    overrideStatus?: SubscriptionStatus,
  ): Promise<void> {
    const companyId = await this.resolveCompanyIdFromSubscription(sub);
    if (!companyId) {
      this.logger.warn(`Stripe subscription ${sub.id} sem companyId; ignorando.`);
      return;
    }
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    const end = new Date(sub.current_period_end * 1000);

    let nextStatus: SubscriptionStatus;
    if (overrideStatus !== undefined) {
      nextStatus = overrideStatus;
    } else if (sub.status === 'active' || sub.status === 'trialing') {
      nextStatus = SubscriptionStatus.ACTIVE;
    } else if (sub.status === 'past_due') {
      nextStatus = SubscriptionStatus.PAST_DUE;
    } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
      nextStatus = SubscriptionStatus.CANCELED;
    } else {
      nextStatus = this.mapStripeStatus(sub.status);
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: nextStatus,
        currentPeriodEnd: end,
        trialEndsAt: null,
        stripeSubscriptionId: sub.id,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      },
    });
  }

  private async markSubscriptionEnded(sub: Stripe.Subscription) {
    const companyId = await this.resolveCompanyIdFromSubscription(sub);
    if (!companyId) return;
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: SubscriptionStatus.EXPIRED,
        currentPeriodEnd: new Date(),
        stripeSubscriptionId: null,
      },
    });
  }
}
