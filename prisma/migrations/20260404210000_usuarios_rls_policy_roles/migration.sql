-- Políticas por papel: evita overlap em anon/authenticator (performance advisor)
DROP POLICY IF EXISTS "Users can read own row" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own row" ON public.usuarios;
DROP POLICY IF EXISTS "Service role full access" ON public.usuarios;

CREATE POLICY "Users can read own row" ON public.usuarios
  FOR SELECT TO authenticated
  USING (supabase_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own row" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (supabase_user_id = (SELECT auth.uid()))
  WITH CHECK (supabase_user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access" ON public.usuarios
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
