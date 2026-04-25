-- Índices para listagens e painéis de performance.
CREATE INDEX IF NOT EXISTS "motoristas_company_id_email_idx" ON "motoristas"("company_id", "email");
CREATE INDEX IF NOT EXISTS "viagens_company_id_start_date_idx" ON "viagens"("company_id", "start_date");
CREATE INDEX IF NOT EXISTS "viagens_company_id_status_start_date_idx" ON "viagens"("company_id", "status", "start_date");
CREATE INDEX IF NOT EXISTS "viagens_driver_id_start_date_idx" ON "viagens"("driver_id", "start_date");
CREATE INDEX IF NOT EXISTS "despesas_trip_id_date_idx" ON "despesas"("trip_id", "date");
CREATE INDEX IF NOT EXISTS "despesas_category_id_date_idx" ON "despesas"("category_id", "date");
CREATE INDEX IF NOT EXISTS "despesas_created_by_id_idx" ON "despesas"("created_by_id");
CREATE INDEX IF NOT EXISTS "adiantamentos_trip_id_date_idx" ON "adiantamentos"("trip_id", "date");
