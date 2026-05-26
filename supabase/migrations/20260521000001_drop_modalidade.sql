-- ============================================================
-- Remover `modalidade` — redundante com `regime`
-- ============================================================
-- `regime` e `modalidade` representavam o mesmo conceito
-- (rent_a_car / tvde — determina a taxa de IVA). Ficou `regime`
-- como campo único; a `modalidade` é removida de reservas e
-- contratos_renting. A derivação do IVA passou a usar `regime`.
-- A tabela org_definicoes (taxas de IVA) mantém-se.
-- Decisão acordada com a equipa (2026-05-21).
-- ============================================================

ALTER TABLE public.contratos_renting DROP COLUMN IF EXISTS modalidade;
ALTER TABLE public.reservas          DROP COLUMN IF EXISTS modalidade;

-- O enum deixa de ter colunas dependentes.
DROP TYPE IF EXISTS public.contrato_modalidade_enum;
