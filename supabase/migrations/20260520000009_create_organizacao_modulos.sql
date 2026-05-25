-- ============================================================
-- Fase 1.1 — Módulos por organização
-- ============================================================
-- Cada organização activa um conjunto de módulos do produto.
-- Permite vender o sistema com pacotes (TVDE-only, aluguer-only,
-- ou ambos). UI/rotas/menus passam a consultar esta tabela para
-- decidir o que mostrar. RBAC continua por cima (módulo activo
-- != utilizador tem permissão).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizacao_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.get_current_org_id()
    REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  modulo text NOT NULL CHECK (modulo IN (
    'aluguer',      -- rent-a-car curto + renting longo (flag interna no contrato)
    'tvde',         -- operação TVDE (motoristas parceiros, share, turnos)
    'assistencia',  -- tickets/manutenção/reparações
    'frota'         -- gestão base de viaturas (transversal)
  )),
  ativo boolean NOT NULL DEFAULT true,
  ativado_em timestamptz NOT NULL DEFAULT now(),
  desativado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, modulo)
);

CREATE INDEX IF NOT EXISTS idx_org_modulos_org ON public.organizacao_modulos(org_id);
CREATE INDEX IF NOT EXISTS idx_org_modulos_ativo
  ON public.organizacao_modulos(org_id, modulo) WHERE ativo = true;

-- updated_at trigger (assume função util_set_updated_at já existe no projecto)
CREATE OR REPLACE FUNCTION public.tg_organizacao_modulos_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizacao_modulos_updated_at ON public.organizacao_modulos;
CREATE TRIGGER trg_organizacao_modulos_updated_at
  BEFORE UPDATE ON public.organizacao_modulos
  FOR EACH ROW EXECUTE FUNCTION public.tg_organizacao_modulos_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.organizacao_modulos ENABLE ROW LEVEL SECURITY;

-- Política RESTRICTIVE de isolamento por org (consistente com rls_org_isolation)
DROP POLICY IF EXISTS rls_org_isolation ON public.organizacao_modulos;
CREATE POLICY rls_org_isolation ON public.organizacao_modulos
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (org_id = public.get_current_org_id())
  WITH CHECK (org_id IS NULL OR org_id = public.get_current_org_id());

-- Qualquer utilizador autenticado da org pode LER os módulos (para o hook useModules)
DROP POLICY IF EXISTS "Utilizadores da org podem ver módulos" ON public.organizacao_modulos;
CREATE POLICY "Utilizadores da org podem ver módulos"
  ON public.organizacao_modulos FOR SELECT TO authenticated
  USING (true);  -- RESTRICTIVE acima já filtra por org_id

-- Só admins podem activar/desactivar módulos
DROP POLICY IF EXISTS "Admins gerem módulos" ON public.organizacao_modulos;
CREATE POLICY "Admins gerem módulos"
  ON public.organizacao_modulos FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ============================================================
-- Helper: tem_modulo(modulo)
-- ============================================================
-- Usado tanto em policies de outras tabelas como no SQL geral.
CREATE OR REPLACE FUNCTION public.tem_modulo(p_modulo text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizacao_modulos
    WHERE org_id = public.get_current_org_id()
      AND modulo = p_modulo
      AND ativo = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.tem_modulo(text) TO authenticated;

-- ============================================================
-- Seed para orgs existentes — tudo activo (Década Ousada faz TVDE
-- + rent-a-car + assistência; Distância Arrojada idem por defeito).
-- Orgs criadas no futuro decidem no onboarding.
-- ============================================================
INSERT INTO public.organizacao_modulos (org_id, modulo, ativo)
SELECT o.id, m.modulo, true
FROM public.organizacoes o
CROSS JOIN (VALUES ('aluguer'), ('tvde'), ('assistencia'), ('frota')) AS m(modulo)
ON CONFLICT (org_id, modulo) DO NOTHING;
