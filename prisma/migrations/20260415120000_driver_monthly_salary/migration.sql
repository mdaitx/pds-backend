-- AlterTable
ALTER TABLE "motoristas" ADD COLUMN IF NOT EXISTS "monthly_salary" DECIMAL(12,2) NOT NULL DEFAULT 0;
