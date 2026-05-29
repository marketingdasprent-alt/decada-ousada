-- ============================================================
-- renting_movimentacoes — histórico de movimentação de viaturas
-- ============================================================
-- Regista a mudança de uma viatura de uma estação para outra.
-- Ao inserir uma movimentação, a viatura passa a estar na
-- estação de destino (trigger). A página Movimentações lista
-- o histórico.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.renting_movimentacoes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  viatura_id         uuid NOT NULL REFERENCES public.viaturas(id) ON DELETE CASCADE,
  estacao_origem_id  uuid REFERENCES public.estacoes(id) ON DELETE SET NULL,
  estacao_destino_id uuid NOT NULL REFERENCES public.estacoes(id) ON DELETE RESTRICT,
  data_movimentacao  timestamptz NOT NULL DEFAULT now(),
  observacoes        text,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renting_movimentacoes_viatura
  ON public.renting_movimentacoes (viatura_id);
CREATE INDEX IF NOT EXISTS idx_renting_movimentacoes_org
  ON public.renting_movimentacoes (org_id);
CREATE INDEX IF NOT EXISTS idx_renting_movimentacoes_data
  ON public.renting_movimentacoes (data_movimentacao DESC);

-- ── Trigger: preencher org_id e estação de origem a partir da viatura ──
CREATE OR REPLACE FUNCTION public.set_renting_movimentacao_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM public.viaturas WHERE id = NEW.viatura_id;
  END IF;
  IF NEW.estacao_origem_id IS NULL THEN
    SELECT estacao_id INTO NEW.estacao_origem_id FROM public.viaturas WHERE id = NEW.viatura_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_renting_movimentacoes_defaults ON public.renting_movimentacoes;
CREATE TRIGGER trg_renting_movimentacoes_defaults
  BEFORE INSERT ON public.renting_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_renting_movimentacao_defaults();

-- ── Trigger: aplicar a movimentação — viatura passa para a estação destino ──
CREATE OR REPLACE FUNCTION public.aplicar_renting_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.viaturas
  SET estacao_id = NEW.estacao_destino_id
  WHERE id = NEW.viatura_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_renting_movimentacoes_aplicar ON public.renting_movimentacoes;
CREATE TRIGGER trg_renting_movimentacoes_aplicar
  AFTER INSERT ON public.renting_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_renting_movimentacao();

-- ── RLS — multi-tenant ──────────────────────────────────────
ALTER TABLE public.renting_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mt_renting_movimentacoes_select" ON public.renting_movimentacoes;
DROP POLICY IF EXISTS "mt_renting_movimentacoes_insert" ON public.renting_movimentacoes;
DROP POLICY IF EXISTS "mt_renting_movimentacoes_delete" ON public.renting_movimentacoes;

CREATE POLICY "mt_renting_movimentacoes_select" ON public.renting_movimentacoes
  FOR SELECT TO authenticated
  USING (
    org_id = get_current_org_id()
    AND (
      is_current_user_admin()
      OR has_permission(auth.uid(), 'renting_reservas')
      OR has_permission(auth.uid(), 'renting_contratos')
    )
  );

CREATE POLICY "mt_renting_movimentacoes_insert" ON public.renting_movimentacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    (org_id IS NULL OR org_id = get_current_org_id())
    AND (
      is_current_user_admin()
      OR has_permission(auth.uid(), 'renting_reservas')
      OR has_permission(auth.uid(), 'renting_contratos')
    )
  );

CREATE POLICY "mt_renting_movimentacoes_delete" ON public.renting_movimentacoes
  FOR DELETE TO authenticated
  USING (org_id = get_current_org_id() AND is_current_user_admin());

-- Isolamento multi-tenant (RESTRICTIVE — abrange tabelas criadas depois).
DROP POLICY IF EXISTS rls_org_isolation ON public.renting_movimentacoes;
CREATE POLICY rls_org_isolation ON public.renting_movimentacoes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (org_id = get_current_org_id())
  WITH CHECK (org_id IS NULL OR org_id = get_current_org_id());

COMMENT ON TABLE public.renting_movimentacoes IS
  'Histórico de movimentação de viaturas entre estações. Ao inserir, a viatura passa para a estação destino.';
