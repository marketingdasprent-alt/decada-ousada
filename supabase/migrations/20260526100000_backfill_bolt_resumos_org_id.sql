-- ============================================================
-- Backfill org_id em tabelas de import (bolt/uber/bp/repsol/edp)
-- ============================================================
-- As edge functions de import corriam com service_role e não passavam org_id,
-- ficando o default `get_current_org_id()` a devolver NULL. Resultado:
-- registos invisíveis ao user via RLS multi-tenant.
--
-- Este backfill preenche org_id usando a integração associada (via integracao_id).
-- ============================================================

UPDATE public.bolt_resumos_semanais brs
SET org_id = pc.org_id
FROM public.plataformas_configuracao pc
WHERE brs.integracao_id = pc.id
  AND brs.org_id IS NULL
  AND pc.org_id IS NOT NULL;

UPDATE public.bp_transacoes t
SET org_id = pc.org_id
FROM public.plataformas_configuracao pc
WHERE t.integracao_id = pc.id
  AND t.org_id IS NULL
  AND pc.org_id IS NOT NULL;

UPDATE public.repsol_transacoes t
SET org_id = pc.org_id
FROM public.plataformas_configuracao pc
WHERE t.integracao_id = pc.id
  AND t.org_id IS NULL
  AND pc.org_id IS NOT NULL;

UPDATE public.uber_transactions t
SET org_id = pc.org_id
FROM public.plataformas_configuracao pc
WHERE t.integracao_id = pc.id
  AND t.org_id IS NULL
  AND pc.org_id IS NOT NULL;

UPDATE public.uber_drivers t
SET org_id = pc.org_id
FROM public.plataformas_configuracao pc
WHERE t.integracao_id = pc.id
  AND t.org_id IS NULL
  AND pc.org_id IS NOT NULL;

UPDATE public.uber_vehicles t
SET org_id = pc.org_id
FROM public.plataformas_configuracao pc
WHERE t.integracao_id = pc.id
  AND t.org_id IS NULL
  AND pc.org_id IS NOT NULL;
