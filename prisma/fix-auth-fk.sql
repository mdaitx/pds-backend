-- Remove a FK de usuarios.supabase_user_id para auth.users.
-- Execute no Supabase Dashboard > SQL Editor se o Prisma reclamar de referência cruzada (P4002).
-- O app não precisa dessa FK; supabase_user_id é apenas um identificador armazenado como string.
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS users_supabase_user_id_fkey;
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_supabase_user_id_fkey;
