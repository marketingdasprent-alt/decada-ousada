-- ============================================================
-- Condutores — suportar motoristas (TVDE) além de clientes
-- ============================================================
-- Numa reserva/contrato de regime TVDE os condutores são
-- motoristas (motoristas_ativos); em rent-a-car são clientes.
-- As tabelas de condutores passam a aceitar um OU outro:
-- exatamente um de (cliente_id, motorista_id) por linha.
-- ============================================================

-- ── reserva_condutores ───────────────────────────────────────
ALTER TABLE public.reserva_condutores
  ADD COLUMN IF NOT EXISTS motorista_id uuid
  REFERENCES public.motoristas_ativos(id) ON DELETE RESTRICT;

ALTER TABLE public.reserva_condutores ALTER COLUMN cliente_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.reserva_condutores
    ADD CONSTRAINT chk_reserva_condutor_pessoa
    CHECK (num_nonnulls(cliente_id, motorista_id) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS reserva_condutores_reserva_motorista_unique
  ON public.reserva_condutores (reserva_id, motorista_id);

CREATE INDEX IF NOT EXISTS idx_reserva_condutores_motorista
  ON public.reserva_condutores (motorista_id);

-- ── contrato_condutores ──────────────────────────────────────
ALTER TABLE public.contrato_condutores
  ADD COLUMN IF NOT EXISTS motorista_id uuid
  REFERENCES public.motoristas_ativos(id) ON DELETE RESTRICT;

ALTER TABLE public.contrato_condutores ALTER COLUMN cliente_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.contrato_condutores
    ADD CONSTRAINT chk_contrato_condutor_pessoa
    CHECK (num_nonnulls(cliente_id, motorista_id) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS contrato_condutores_contrato_motorista_unique
  ON public.contrato_condutores (contrato_id, motorista_id);

CREATE INDEX IF NOT EXISTS idx_contrato_condutores_motorista
  ON public.contrato_condutores (motorista_id);

-- Sem sobreposição de vigência para o mesmo motorista no contrato.
DO $$ BEGIN
  ALTER TABLE public.contrato_condutores
    ADD CONSTRAINT contrato_condutores_motorista_sem_sobreposicao
    EXCLUDE USING gist (contrato_id WITH =, motorista_id WITH =, vigencia WITH &&);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
