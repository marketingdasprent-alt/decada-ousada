import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { ContratoTaxa, TaxaFormItem } from '@/types/contratoRenting';

const QUERY_KEY_BASE = ['renting', 'contrato-taxas'] as const;

/** Valor de uma taxa: percentagem × subtotal, ou valor fixo. */
export function calcTaxaValor(item: TaxaFormItem, subtotal: number): number {
  if (item.percentagem != null) {
    return Math.round(subtotal * (item.percentagem / 100) * 100) / 100;
  }
  return item.valor_fixo ?? 0;
}

/** Carrega as taxas de um contrato. */
export function useContratoTaxas(contratoId: string | null | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, contratoId ?? null],
    queryFn: async (): Promise<ContratoTaxa[]> => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from('contrato_taxas')
        .select(
          'id, org_id, contrato_id, taxa_id, taxa_nome, percentagem, valor_fixo, base_calculo, valor_calculado, created_by, created_at'
        )
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContratoTaxa[];
    },
    enabled: !!contratoId,
    staleTime: 30_000,
  });
}

interface SyncArgs {
  contratoId: string;
  desejadas: TaxaFormItem[];
  /** Subtotal do contrato — base de cálculo das taxas percentuais. */
  subtotal: number;
}

/**
 * Sincroniza as taxas de um contrato (replace-all): apaga as linhas
 * actuais e reinsere as desejadas. valor_calculado depende do subtotal
 * (que muda) — reinserir garante que fica sempre fresco.
 */
export function useSyncContratoTaxas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contratoId, desejadas, subtotal }: SyncArgs): Promise<void> => {
      const { error: delErr } = await supabase
        .from('contrato_taxas')
        .delete()
        .eq('contrato_id', contratoId);
      if (delErr) throw delErr;

      if (desejadas.length === 0) return;

      const rows = desejadas.map((t) => ({
        contrato_id: contratoId,
        taxa_id: t.taxa_id,
        taxa_nome: t.taxa_nome,
        percentagem: t.percentagem,
        valor_fixo: t.valor_fixo,
        base_calculo: t.percentagem != null ? subtotal : null,
        valor_calculado: calcTaxaValor(t, subtotal),
      }));
      // org_id é preenchido por trigger na BD — daí o cast.
      const { error: insErr } = await supabase
        .from('contrato_taxas')
        .insert(rows as TablesInsert<'contrato_taxas'>[]);
      if (insErr) throw insErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEY_BASE, vars.contratoId] });
    },
  });
}
