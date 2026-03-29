-- AlterTable
ALTER TABLE "motoristas" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "motoristas_user_id_key" ON "motoristas"("user_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'motoristas_user_id_fkey'
  ) THEN
    ALTER TABLE "motoristas"
      ADD CONSTRAINT "motoristas_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "usuarios"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
