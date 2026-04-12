-- Preferências da empresa: fuso horário (IANA) e método de base da comissão
CREATE TYPE "commission_calculation_method" AS ENUM ('GROSS_PROFIT', 'FREIGHT_VALUE');

ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(64);
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "commission_method" "commission_calculation_method" NOT NULL DEFAULT 'GROSS_PROFIT';
