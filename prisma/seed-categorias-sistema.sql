-- Categorias de despesas do sistema (company_id = null)
-- Execute no Supabase SQL Editor: Supabase Dashboard > SQL Editor > New query

INSERT INTO categorias_despesas (id, company_id, name, icon, color, created_at, updated_at)
SELECT gen_random_uuid()::text, NULL, 'Combustível', 'fuel', '#ef4444', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categorias_despesas WHERE company_id IS NULL AND name = 'Combustível');

INSERT INTO categorias_despesas (id, company_id, name, icon, color, created_at, updated_at)
SELECT gen_random_uuid()::text, NULL, 'Pedágio', 'road', '#f59e0b', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categorias_despesas WHERE company_id IS NULL AND name = 'Pedágio');

INSERT INTO categorias_despesas (id, company_id, name, icon, color, created_at, updated_at)
SELECT gen_random_uuid()::text, NULL, 'Alimentação', 'utensils', '#10b981', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categorias_despesas WHERE company_id IS NULL AND name = 'Alimentação');

INSERT INTO categorias_despesas (id, company_id, name, icon, color, created_at, updated_at)
SELECT gen_random_uuid()::text, NULL, 'Manutenção', 'wrench', '#6366f1', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categorias_despesas WHERE company_id IS NULL AND name = 'Manutenção');

INSERT INTO categorias_despesas (id, company_id, name, icon, color, created_at, updated_at)
SELECT gen_random_uuid()::text, NULL, 'Hospedagem', 'bed', '#8b5cf6', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categorias_despesas WHERE company_id IS NULL AND name = 'Hospedagem');

INSERT INTO categorias_despesas (id, company_id, name, icon, color, created_at, updated_at)
SELECT gen_random_uuid()::text, NULL, 'Outros', 'receipt', '#6b7280', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categorias_despesas WHERE company_id IS NULL AND name = 'Outros');
