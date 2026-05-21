import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RentingExtra } from '@/types/rentingExtra';

interface UseRentingExtrasOptions {
  /** Quando true, devolve apenas extras activos. */
  apenasAtivos?: boolean;
  enabled?: boolean;
}

/** Catálogo de extras de renting (gerido na área de Tarifas). */
export function useRentingExtras(options: UseRentingExtrasOptions = {}) {
  const { apenasAtivos = false, enabled = true } = options;

  return useQuery({
    queryKey: ['renting-extras', { apenasAtivos }],
    queryFn: async (): Promise<RentingExtra[]> => {
      let q = supabase
        .from('renting_extras')
        .select(
          'id, org_id, nome, descricao, preco_unidade, tipo_calculo, quantidade_maxima, ativo, created_at, updated_at'
        )
        .order('nome', { ascending: true });
      if (apenasAtivos) q = q.eq('ativo', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RentingExtra[];
    },
    enabled,
    staleTime: 60_000,
  });
}
