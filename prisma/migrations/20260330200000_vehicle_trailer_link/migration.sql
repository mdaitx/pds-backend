-- Vínculo opcional: cavalo mecânico -> semi-reboque (mesma empresa)
ALTER TABLE "veiculos" ADD COLUMN "trailer_vehicle_id" TEXT;

ALTER TABLE "veiculos"
  ADD CONSTRAINT "veiculos_trailer_vehicle_id_fkey"
  FOREIGN KEY ("trailer_vehicle_id") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "veiculos_trailer_vehicle_id_idx" ON "veiculos"("trailer_vehicle_id");
