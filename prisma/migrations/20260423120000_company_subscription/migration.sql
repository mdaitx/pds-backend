-- Plano/assinatura por empresa (trial, Stripe).
CREATE TYPE "subscription_status" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

ALTER TABLE "empresas" ADD COLUMN "subscription_status" "subscription_status" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "empresas" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "empresas" ADD COLUMN "current_period_end" TIMESTAMP(3);
ALTER TABLE "empresas" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "empresas" ADD COLUMN "stripe_subscription_id" TEXT;

CREATE UNIQUE INDEX "empresas_stripe_customer_id_key" ON "empresas"("stripe_customer_id");
CREATE UNIQUE INDEX "empresas_stripe_subscription_id_key" ON "empresas"("stripe_subscription_id");

-- Dados existentes: não bloquear contas antigas; novas empresas passam a receber trial via onboarding.
UPDATE "empresas"
SET
  "subscription_status" = 'ACTIVE',
  "current_period_end" = '2099-12-31 23:59:59+00'::timestamptz,
  "trial_ends_at" = NULL;
