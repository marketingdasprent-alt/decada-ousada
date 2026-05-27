-- ============================================================
-- Permitir SELECT em tabelas financeiras a qualquer cargo com
-- permissão `financeiro_recibos` (não apenas is_admin).
-- ============================================================
-- Antes: policies exigiam is_current_user_admin() → bloqueavam toda a gente
-- exceto users com profiles.is_admin=true. Cargos "Financeiro" e "Gestor
-- Documental" tinham permissão configurada mas RLS rejeitava.
-- ============================================================

-- Helper: verifica se o user actual pode ver dados financeiros
CREATE OR REPLACE FUNCTION public.can_view_financeiro()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_current_user_admin()
      OR public.has_permission(auth.uid(), 'financeiro_recibos');
$$;

-- ==================== BOLT ====================
DROP POLICY IF EXISTS "mt_bolt_resumos_all" ON public.bolt_resumos_semanais;
CREATE POLICY "mt_bolt_resumos_all" ON public.bolt_resumos_semanais
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "Financeiro pode ver resumos Bolt" ON public.bolt_resumos_semanais;

-- bolt_viagens (selecionar)
DROP POLICY IF EXISTS "mt_bolt_viagens_select" ON public.bolt_viagens;
CREATE POLICY "mt_bolt_viagens_select" ON public.bolt_viagens
  FOR SELECT TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "mt_bolt_drivers_all" ON public.bolt_drivers;
CREATE POLICY "mt_bolt_drivers_all" ON public.bolt_drivers
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

-- ==================== UBER ====================
DROP POLICY IF EXISTS "mt_uber_transactions_all" ON public.uber_transactions;
CREATE POLICY "mt_uber_transactions_all" ON public.uber_transactions
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "mt_uber_drivers_all" ON public.uber_drivers;
CREATE POLICY "mt_uber_drivers_all" ON public.uber_drivers
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "mt_uber_vehicles_all" ON public.uber_vehicles;
CREATE POLICY "mt_uber_vehicles_all" ON public.uber_vehicles
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "mt_uber_atividade_all" ON public.uber_atividade_motoristas;
CREATE POLICY "mt_uber_atividade_all" ON public.uber_atividade_motoristas
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

-- ==================== COMBUSTÍVEIS ====================
DROP POLICY IF EXISTS "mt_bp_transacoes_all" ON public.bp_transacoes;
CREATE POLICY "mt_bp_transacoes_all" ON public.bp_transacoes
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "mt_repsol_transacoes_all" ON public.repsol_transacoes;
CREATE POLICY "mt_repsol_transacoes_all" ON public.repsol_transacoes
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "mt_edp_transacoes_all" ON public.edp_transacoes;
CREATE POLICY "mt_edp_transacoes_all" ON public.edp_transacoes
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

-- ==================== RECIBOS / FINANCEIRO ====================
DROP POLICY IF EXISTS "mt_motorista_financeiro_all" ON public.motorista_financeiro;
CREATE POLICY "mt_motorista_financeiro_all" ON public.motorista_financeiro
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());

DROP POLICY IF EXISTS "mt_recibos_importados_all" ON public.recibos_importados;
CREATE POLICY "mt_recibos_importados_all" ON public.recibos_importados
  FOR ALL TO authenticated
  USING (org_id = get_current_org_id() AND can_view_financeiro())
  WITH CHECK (org_id = get_current_org_id() AND can_view_financeiro());
