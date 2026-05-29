-- ============================================================
-- Disponibilidade da viatura — Renting (reservada / em uso)
-- ============================================================
-- Regra de negócio: uma viatura com RESERVA de renting confirmada
-- fica 'reservada'; com CONTRATO de renting em curso fica 'em_uso'.
-- Quando o renting termina (cancelado/concluído/devolvido), volta
-- a 'disponivel'. A indisponibilidade é GERAL — a viatura sai de
-- todos os seletores (renting e TVDE filtram status='disponivel').
--
-- Estados manuais/operacionais (manutencao, inativo, vendida,
-- em_recolha) têm prioridade e NUNCA são tocados pelo automatismo,
-- para não interferir com a gestão de frota do lado TVDE.
-- ============================================================

-- ── Função: recalcula o status da viatura a partir do renting ──
CREATE OR REPLACE FUNCTION public.recalcular_disponibilidade_viatura(p_viatura_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_novo   text;
BEGIN
  IF p_viatura_id IS NULL THEN RETURN; END IF;

  SELECT status INTO v_status FROM public.viaturas WHERE id = p_viatura_id;
  IF v_status IS NULL THEN RETURN; END IF;

  -- Estados manuais/operacionais têm prioridade — não mexer.
  IF v_status IN ('manutencao', 'inativo', 'vendida', 'em_recolha') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contratos_renting c
    WHERE c.viatura_id = p_viatura_id
      AND c.deleted_at IS NULL
      AND c.estado_operacional = 'em_curso'
  ) THEN
    v_novo := 'em_uso';
  ELSIF EXISTS (
    SELECT 1 FROM public.contratos_renting c
    WHERE c.viatura_id = p_viatura_id
      AND c.deleted_at IS NULL
      AND c.estado_operacional = 'agendado'
  ) OR EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.viatura_id = p_viatura_id
      AND r.deleted_at IS NULL
      AND r.estado = 'confirmada'
  ) THEN
    v_novo := 'reservada';
  ELSE
    v_novo := 'disponivel';
  END IF;

  IF v_novo IS DISTINCT FROM v_status THEN
    UPDATE public.viaturas SET status = v_novo WHERE id = p_viatura_id;
  END IF;
END;
$$;

-- ── Trigger nas reservas ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_reservas_disponibilidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_disponibilidade_viatura(OLD.viatura_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalcular_disponibilidade_viatura(NEW.viatura_id);
  IF TG_OP = 'UPDATE' AND OLD.viatura_id IS DISTINCT FROM NEW.viatura_id THEN
    PERFORM public.recalcular_disponibilidade_viatura(OLD.viatura_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservas_disponibilidade ON public.reservas;
CREATE TRIGGER trg_reservas_disponibilidade
  AFTER INSERT OR DELETE OR UPDATE OF estado, viatura_id, deleted_at
  ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.trg_reservas_disponibilidade();

-- ── Trigger nos contratos ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_contratos_disponibilidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_disponibilidade_viatura(OLD.viatura_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalcular_disponibilidade_viatura(NEW.viatura_id);
  IF TG_OP = 'UPDATE' AND OLD.viatura_id IS DISTINCT FROM NEW.viatura_id THEN
    PERFORM public.recalcular_disponibilidade_viatura(OLD.viatura_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_disponibilidade ON public.contratos_renting;
CREATE TRIGGER trg_contratos_disponibilidade
  AFTER INSERT OR DELETE OR UPDATE OF estado_operacional, viatura_id, deleted_at
  ON public.contratos_renting
  FOR EACH ROW EXECUTE FUNCTION public.trg_contratos_disponibilidade();

-- ── Backfill seguro — só promove viaturas que estão 'disponivel' ──
-- (nunca rebaixa 'em_uso'/'inativo'/etc. — não toca na frota TVDE)
UPDATE public.viaturas v SET status = 'em_uso'
WHERE v.status = 'disponivel'
  AND EXISTS (
    SELECT 1 FROM public.contratos_renting c
    WHERE c.viatura_id = v.id AND c.deleted_at IS NULL
      AND c.estado_operacional = 'em_curso'
  );

UPDATE public.viaturas v SET status = 'reservada'
WHERE v.status = 'disponivel'
  AND (
    EXISTS (
      SELECT 1 FROM public.contratos_renting c
      WHERE c.viatura_id = v.id AND c.deleted_at IS NULL
        AND c.estado_operacional = 'agendado'
    )
    OR EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.viatura_id = v.id AND r.deleted_at IS NULL
        AND r.estado = 'confirmada'
    )
  );
