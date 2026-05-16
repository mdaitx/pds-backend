import { BadRequestException } from '@nestjs/common';
import { SubscriptionPlanKey } from '@prisma/client';

export type SubscriptionPlanConfig = {
  key: SubscriptionPlanKey;
  name: string;
  description: string;
  priceBrl: number;
  maxVehicles: number | null;
  maxDrivers: number | null;
};

export type SubscriptionPlanPublic = SubscriptionPlanConfig & {
  stripePriceId: string | null;
  checkoutReady: boolean;
};

const PLAN_CONFIGS: Record<SubscriptionPlanKey, SubscriptionPlanConfig> = {
  BASIC: {
    key: SubscriptionPlanKey.BASIC,
    name: 'Básico',
    description: 'Ideal para operações pequenas com limite enxuto.',
    priceBrl: 29.9,
    maxVehicles: 5,
    maxDrivers: 5,
  },
  PRO: {
    key: SubscriptionPlanKey.PRO,
    name: 'Pro',
    description: 'Para frotas em crescimento com mais capacidade operacional.',
    priceBrl: 79.9,
    maxVehicles: 15,
    maxDrivers: 15,
  },
  PREMIUM: {
    key: SubscriptionPlanKey.PREMIUM,
    name: 'Premium',
    description: 'Operação avançada com limites amplos.',
    priceBrl: 199.9,
    maxVehicles: null,
    maxDrivers: null,
  },
};

const PLAN_PRICE_ENV: Record<SubscriptionPlanKey, string> = {
  BASIC: 'STRIPE_PRICE_ID_BASIC',
  PRO: 'STRIPE_PRICE_ID_PRO',
  PREMIUM: 'STRIPE_PRICE_ID_PREMIUM',
};

export const TRIAL_DAYS = 30;
export const TRIAL_MAX_VEHICLES = 3;

export function listPlanCatalog(): SubscriptionPlanConfig[] {
  return Object.values(PLAN_CONFIGS);
}

export function resolvePlanConfig(planKey: SubscriptionPlanKey): SubscriptionPlanConfig {
  return PLAN_CONFIGS[planKey] ?? PLAN_CONFIGS.PRO;
}

export function resolveCompanyPlanKey(planKey: SubscriptionPlanKey | null | undefined): SubscriptionPlanKey {
  return planKey ?? SubscriptionPlanKey.PRO;
}

export function resolveStripePriceIdByPlan(planKey: SubscriptionPlanKey): string | null {
  const envName = PLAN_PRICE_ENV[planKey];
  if (!envName) return null;
  return process.env[envName]?.trim() || null;
}

export function listPlanCatalogPublic(): SubscriptionPlanPublic[] {
  return listPlanCatalog().map((plan) => {
    const stripePriceId = resolveStripePriceIdByPlan(plan.key);
    return {
      ...plan,
      stripePriceId,
      checkoutReady: Boolean(stripePriceId),
    };
  });
}

export function ensurePlanCheckoutReady(planKey: SubscriptionPlanKey): string {
  const priceId = resolveStripePriceIdByPlan(planKey);
  if (!priceId) {
    const envName = PLAN_PRICE_ENV[planKey];
    throw new BadRequestException(
      `Plano ${planKey} sem preço Stripe configurado (${envName}).`,
    );
  }
  return priceId;
}

export function planFromStripePriceId(priceId: string | null | undefined): SubscriptionPlanKey | null {
  if (!priceId) return null;
  const entries = Object.entries(PLAN_PRICE_ENV) as [SubscriptionPlanKey, string][];
  for (const [planKey, envName] of entries) {
    if (process.env[envName]?.trim() === priceId) return planKey;
  }
  return null;
}
