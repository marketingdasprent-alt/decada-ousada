import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RentingCobertura } from '@/types/rentingCobertura';

interface UseRentingCoberturasOptions {
  /** Quando true, devolve apenas coberturas activas. */
  apenasAtivas?: boolean;
  enabled?: boolean;
}

/** Catálogo de coberturas de renting (gerido na área de Tarifas). */
export function useRentingCoberturas(options: UseRentingCoberturasOptions = {}) {
  const { apenasAtivas = false, enabled = true } = options;

  return useQuery({
    queryKey: ['renting-coberturas', { apenasAtivas }],
    queryFn: async (): Promise<RentingCobertura[]> => {
      let q = supabase
        .from('renting_coberturas')
        .select(
          'id, org_id, nome, descricao, preco_dia, franquia_valor, ativa, created_at, updated_at'
        )
        .order('nome', { ascending: true });
      if (apenasAtivas) q = q.eq('ativa', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RentingCobertura[];
    },
    enabled,
    staleTime: 60_000,
  });
}
