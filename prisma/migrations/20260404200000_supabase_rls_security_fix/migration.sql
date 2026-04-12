-- Trigger: search_path fix (Supabase advisor: function_search_path_mutable)
CREATE OR REPLACE FUNCTION public.set_expense_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- RLS em tabelas públicas: bloqueia acesso via PostgREST sem políticas;
-- Prisma (role dono / superuser em dev) não é afetado pelo RLS padrão.
ALTER TABLE public.categorias_despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adiantamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acertos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

-- RLS initplan: (SELECT auth.*()) evita reavaliação por linha
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