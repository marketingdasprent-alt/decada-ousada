-- Permitir que a landing page (anon) insira leads da Década Ousada
-- O org_id é fixo: '11111111-1111-1111-1111-111111111111' (Década Ousada)

DROP POLICY IF EXISTS "anon_leads_insert" ON public.leads_dasprent;

CREATE POLICY "anon_leads_insert" ON public.leads_dasprent
  FOR INSERT TO anon
  WITH CHECK (org_id = '11111111-1111-1111-1111-111111111111');

-- Corrigir leads existentes que ficaram sem org_id (capturados antes ou durante a falha)
UPDATE public.leads_dasprent
SET org_id = '11111111-1111-1111-1111-111111111111'
WHERE org_id IS NULL;
