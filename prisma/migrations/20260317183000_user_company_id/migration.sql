-- Vínculo opcional usuário -> empresa (admin e co-proprietários)
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_company_id_fkey'
  ) THEN
    ALTER TABLE "usuarios"
      ADD CONSTRAINT "usuarios_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "usuarios_company_id_idx" ON "usuarios"("company_id");

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "display_name" TEXT;

-- Dono titular: preenche company_id para consultas unificadas
UPDATE "usuarios" u
SET "company_id" = e."id"
FROM "empresas" e
WHERE e."owner_id" = u."id"
  AND u."company_id" IS NULL;
