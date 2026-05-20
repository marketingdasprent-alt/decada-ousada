import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RentingTaxa } from '@/types/rentingTaxa';

interface UseRentingTaxasOptions {
  /** Quando true, devolve apenas taxas activas. */
  apenasAtivas?: boolean;
  enabled?: boolean;
}

/** Catálogo de taxas de renting (gerido na área de Tarifas). */
export function useRentingTaxas(options: UseRentingTaxasOptions = {}) {
  const { apenasAtivas = false, enabled = true } = options;

  return useQuery({
    queryKey: ['renting-taxas', { apenasAtivas }],
    queryFn: async (): Promise<RentingTaxa[]> => {
      let q = supabase
        .from('renting_taxas')
        .select(
          'id, org_id, nome, descricao, percentagem, valor_fixo, aplicar_automaticamente, ativa, created_at, updated_at'
        )
        .order('nome', { ascending: true });
      if (apenasAtivas) q = q.eq('ativa', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RentingTaxa[];
    },
    enabled,
    staleTime: 60_000,
  });
}
