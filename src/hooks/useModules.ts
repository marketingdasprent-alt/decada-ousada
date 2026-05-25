import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Modulo, OrganizacaoModulo } from '@/types/modulo';

/**
 * Lê os módulos activos da organização actual.
 *
 * RLS filtra automaticamente por `org_id = get_current_org_id()` — não é
 * preciso passar org_id na query. Devolve a lista de registos + helper
 * `has(modulo)` para verificações pontuais.
 *
 * Uso típico:
 *   const { has, isLoading } = useModules();
 *   if (!isLoading && !has('tvde')) return <NotEnabled module="tvde" />;
 */
export function useModules() {
  const query = useQuery({
    queryKey: ['organizacao_modulos'],
    queryFn: async (): Promise<OrganizacaoModulo[]> => {
      // Tabela ainda não está nos tipos auto-gerados (migração nova); cast até regenerar.
      const { data, error } = await (supabase as any)
        .from('organizacao_modulos')
        .select('*')
        .eq('ativo', true);
      if (error) throw error;
      return (data ?? []) as OrganizacaoModulo[];
    },
    staleTime: 5 * 60 * 1000, // 5 min — mudanças são raras (admin only)
  });

  const activos = useMemo(() => new Set((query.data ?? []).map((m) => m.modulo)), [query.data]);

  const has = (modulo: Modulo) => activos.has(modulo);

  return {
    ...query,
    modulos: query.data ?? [],
    activos,
    has,
  };
}
