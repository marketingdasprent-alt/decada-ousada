-- Corrige a policy mt_profiles_select para permitir que qualquer membro
-- da organização veja os perfis dos colegas da mesma org.
-- A policy anterior exigia admin ou admin_utilizadores, o que impedia
-- que roles como gestor_tvde vissem nomes de criadores em relatórios de eventos.
-- A filtragem por get_current_org_id() mantém o isolamento multi-tenant.

DROP POLICY IF EXISTS "mt_profiles_select" ON public.profiles;

CREATE POLICY "mt_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR org_id = get_current_org_id()
  );
