-- Criação da tabela viagens (Task 7)
-- Execute no Supabase SQL Editor se prisma db push falhar com P4002.
-- Ou use: npx prisma db push (após executar fix-auth-fk.sql)

CREATE TYPE "TripStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "viagens" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "client_name" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "freight_value" DECIMAL(12,2),
    "initial_km" INTEGER,
    "load_type" TEXT,
    "notes" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "viagens_code_key" ON "viagens"("code");

ALTER TABLE "viagens" ADD CONSTRAINT "viagens_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
