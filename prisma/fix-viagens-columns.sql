-- Corrige nomes das colunas na tabela viagens.
-- Execute no Supabase SQL Editor se GET /trips retornar 500.
-- Se der erro "column does not exist", ignore as linhas que falharam (a tabela já está correta).

-- Renomeia colunas (se a migração manual create_viagens.sql foi usada)
ALTER TABLE viagens RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE viagens RENAME COLUMN "updatedAt" TO updated_at;

-- Adiciona final_km se não existir
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS final_km INTEGER;
