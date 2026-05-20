-- ============================================================
-- Catálogo de Coberturas (renting) + FK no contrato
-- ============================================================
-- Catálogo simples de coberturas/seguros que podem ser associados
-- a um contrato. "Cobertura simples": é só uma referência (FK única
-- no contrato), sem integração no cálculo de preço.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coberturas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE
                DEFAULT public.get_current_org_id(),

  nome          varchar(100) NOT NULL,
  descricao     text,
  valor_diario  numeric(10, 2),   -- preço/dia informativo (não entra no cálculo automático)
  ativo         boolean NOT NULL DEFAULT true,

  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT chk_coberturas_valor_nao_negativo CHECK (valor_diario IS NULL OR valor_diario >= 0)
);

CREATE INDEX IF NOT EXISTS idx_coberturas_org ON public.coberturas (org_id);
CREATE INDEX IF NOT EXISTS idx_coberturas_ativo
  ON public.coberturas (org_id, ativo) WHERE ativo = true;

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.touch_cobertura_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coberturas_touch ON public.coberturas;
CREATE TRIGGER trg_coberturas_touch
  BEFORE UPDATE ON public.coberturas
  FOR EACH ROW EXECUTE FUNCTION public.touch_cobertura_updated_at();


-- ============================================================
-- RLS — leitura para quem gere contratos, escrita só admin
-- ============================================================
ALTER TABLE public.coberturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coberturas_select" ON public.coberturas;
DROP POLICY IF EXISTS "coberturas_insert" ON public.coberturas;
DROP POLICY IF EXISTS "coberturas_update" ON public.coberturas;
DROP POLICY IF EXISTS "coberturas_delete" ON public.coberturas;

CREATE POLICY "coberturas_select" ON public.coberturas
  FOR SELECT TO authenticated
  USING (org_id = get_current_org_id() AND has_renting_contratos_access());

CREATE POLICY "coberturas_insert" ON public.coberturas
  FOR INSERT TO authenticated
  WITH CHECK (
    (org_id IS NULL OR org_id = get_current_org_id())
    AND is_current_user_admin()
  );

CREATE POLICY "coberturas_update" ON public.coberturas
  FOR UPDATE TO authenticated
  USING (org_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (org_id = get_current_org_id() AND is_current_user_admin());

CREATE POLICY "coberturas_delete" ON public.coberturas
  FOR DELETE TO authenticated
  USING (org_id = get_current_org_id() AND is_current_user_admin());


-- ============================================================
-- FK no contrato — cobertura única (MVP). ON DELETE SET NULL:
-- apagar a cobertura do catálogo não destrói o contrato.
-- ============================================================
ALTER TABLE public.contratos_renting
  ADD COLUMN IF NOT EXISTS cobertura_id uuid
    REFERENCES public.coberturas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_renting_cobertura
  ON public.contratos_renting (cobertura_id)
  WHERE cobertura_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON TABLE public.coberturas IS
  'Catálogo de coberturas/seguros de renting. Geridas em /renting/catalogos (admin).';
COMMENT ON COLUMN public.contratos_renting.cobertura_id IS
  'Cobertura associada ao contrato. FK única (MVP). Multi-cobertura fica para v2.';
