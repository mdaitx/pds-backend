-- Comprovante de entrega e flag de deslocamento até carregamento
ALTER TABLE "viagens" ADD COLUMN IF NOT EXISTS "delivery_receipt_url" TEXT;
ALTER TABLE "viagens" ADD COLUMN IF NOT EXISTS "displacement_to_load" BOOLEAN NOT NULL DEFAULT false;
