-- Comissão padrão da empresa (alinhado ao schema Prisma Company.defaultCommission)
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "default_commission" DECIMAL(5, 2);
