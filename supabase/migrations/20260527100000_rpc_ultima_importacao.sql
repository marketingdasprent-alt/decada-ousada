-- ============================================================
-- RPC: get_ultima_importacao_por_integracao
-- ============================================================
-- Devolve numa única chamada, para cada integração:
--   - última data de envio (max updated_at / created_at)
--   - última semana coberta (max periodo_inicio) + periodo_fim correspondente
--
-- Usada pelo wizard de importação para mostrar o badge "última importação"
-- por conta sem fazer N+1 queries do frontend.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_ultima_importacao_por_integracao(
  p_plataforma text,
  p_ids uuid[]
)
RETURNS TABLE (
  integracao_id uuid,
  ultima_data timestamptz,
  periodo_inicio date,
  periodo_fim date
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_plataforma = 'bolt' THEN
    RETURN QUERY
      WITH ultimo_update AS (
        SELECT brs.integracao_id, MAX(COALESCE(brs.updated_at, brs.created_at)) AS d
        FROM public.bolt_resumos_semanais brs
        WHERE brs.integracao_id = ANY(p_ids)
        GROUP BY brs.integracao_id
      ),
      ultimo_periodo AS (
        SELECT DISTINCT ON (brs.integracao_id)
          brs.integracao_id, brs.periodo_inicio, brs.periodo_fim
        FROM public.bolt_resumos_semanais brs
        WHERE brs.integracao_id = ANY(p_ids)
          AND brs.periodo_inicio IS NOT NULL
        ORDER BY brs.integracao_id, brs.periodo_inicio DESC
      )
      SELECT
        COALESCE(uu.integracao_id, up.integracao_id),
        uu.d,
        up.periodo_inicio,
        up.periodo_fim
      FROM ultimo_update uu
      FULL OUTER JOIN ultimo_periodo up ON up.integracao_id = uu.integracao_id;

  ELSIF p_plataforma = 'uber' THEN
    RETURN QUERY
      SELECT
        ut.integracao_id,
        MAX(COALESCE(ut.updated_at, ut.created_at)),
        NULL::date,
        NULL::date
      FROM public.uber_transactions ut
      WHERE ut.integracao_id = ANY(p_ids)
      GROUP BY ut.integracao_id;

  ELSIF p_plataforma = 'bp' THEN
    RETURN QUERY
      SELECT
        bp.integracao_id,
        MAX(COALESCE(bp.updated_at, bp.created_at)),
        NULL::date,
        NULL::date
      FROM public.bp_transacoes bp
      WHERE bp.integracao_id = ANY(p_ids)
      GROUP BY bp.integracao_id;

  ELSIF p_plataforma = 'repsol' THEN
    RETURN QUERY
      SELECT
        rt.integracao_id,
        MAX(rt.created_at),
        NULL::date,
        NULL::date
      FROM public.repsol_transacoes rt
      WHERE rt.integracao_id = ANY(p_ids)
      GROUP BY rt.integracao_id;

  ELSIF p_plataforma = 'edp' THEN
    RETURN QUERY
      SELECT
        et.integracao_id,
        MAX(et.created_at),
        NULL::date,
        NULL::date
      FROM public.edp_transacoes et
      WHERE et.integracao_id = ANY(p_ids)
      GROUP BY et.integracao_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ultima_importacao_por_integracao(text, uuid[])
  TO authenticated;
