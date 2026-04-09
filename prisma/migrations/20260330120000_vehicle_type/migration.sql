-- Tipo de veículo (caminhão, cavalo mecânico, semi-reboque)
CREATE TYPE "VehicleType" AS ENUM ('CAMINHAO', 'CAVALO_MECANICO', 'SEMI_REBOQUE');

ALTER TABLE "veiculos" ADD COLUMN "vehicle_type" "VehicleType" NOT NULL DEFAULT 'CAMINHAO';
