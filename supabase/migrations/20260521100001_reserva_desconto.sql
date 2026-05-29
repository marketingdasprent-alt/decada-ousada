-- ============================================================
-- Reserva — desconto e valor total manual
-- ============================================================
-- O resumo da reserva passa a permitir aplicar um desconto (%)
-- e sobrepor o total calculado manualmente.
--   • desconto             — percentagem 0-100
--   • valor_total_manual   — total introduzido à mão (NULL = automático)
-- ============================================================

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS desconto numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total_manual numeric(12, 2);

DO $$ BEGIN
  ALTER TABLE public.reservas
    ADD CONSTRAINT chk_reservas_desconto CHECK (desconto >= 0 AND desconto <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.reservas.desconto IS 'Percentagem de desconto aplicada ao total (0-100).';
COMMENT ON COLUMN public.reservas.valor_total_manual IS 'Total introduzido manualmente; NULL = usa o cálculo automático.';
