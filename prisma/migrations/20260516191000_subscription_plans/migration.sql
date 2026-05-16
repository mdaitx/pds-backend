CREATE TYPE "subscription_plan_key" AS ENUM ('BASIC', 'PRO', 'PREMIUM');

ALTER TABLE "empresas"
ADD COLUMN "plan_key" "subscription_plan_key" NOT NULL DEFAULT 'PRO';
