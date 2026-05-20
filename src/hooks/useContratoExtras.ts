import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { ContratoExtra, ExtraFormItem } from '@/types/contratoRenting';

const QUERY_KEY_BASE = ['renting', 'contrato-extras'] as const;

/** Custo de um extra: 'fixo' = preço × qtd ; 'dia' = preço × qtd × dias. */
export function calcExtraTotal(item: ExtraFormItem, dias: number): number {
  const base = item.preco_unidade * item.quantidade;
  return item.tipo_calculo === 'fixo' ? base : base * dias;
}

/** Carrega os extras de um contrato. */
export function useContratoExtras(contratoId: string | null | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, contratoId ?? null],
    queryFn: async (): Promise<ContratoExtra[]> => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from('contrato_extras')
        .select(
          'id, org_id, contrato_id, extra_id, extra_nome, preco_unidade, tipo_calculo, quantidade, total, created_by, created_at'
        )
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContratoExtra[];
    },
    enabled: !!contratoId,
    staleTime: 30_000,
  });
}

interface SyncArgs {
  contratoId: string;
  desejados: ExtraFormItem[];
  /** Nº de dias do contrato — necessário para o total dos extras 'dia'. */
  dias: number;
}

/**
 * Sincroniza os extras de um contrato (replace-all): apaga as linhas
 * actuais e reinsere as desejadas. O `total` depende de quantidade e
 * dias (que mudam) — reinserir garante que fica sempre fresco.
 */
export function useSyncContratoExtras() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contratoId, desejados, dias }: SyncArgs): Promise<void> => {
      const { error: delErr } = await supabase
        .from('contrato_extras')
        .delete()
        .eq('contrato_id', contratoId);
      if (delErr) throw delErr;

      if (desejados.length === 0) return;

      const rows = desejados.map((e) => ({
        contrato_id: contratoId,
        extra_id: e.extra_id,
        extra_nome: e.extra_nome,
        preco_unidade: e.preco_unidade,
        tipo_calculo: e.tipo_calculo,
        quantidade: e.quantidade,
        total: calcExtraTotal(e, dias),
      }));
      // org_id é preenchido por trigger na BD — daí o cast.
      const { error: insErr } = await supabase
        .from('contrato_extras')
        .insert(rows as TablesInsert<'contrato_extras'>[]);
      if (insErr) throw insErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEY_BASE, vars.contratoId] });
    },
  });
}
