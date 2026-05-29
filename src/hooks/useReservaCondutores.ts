import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { CondutorFormItem, ReservaCondutor } from '@/types/reserva';

const QUERY_KEY_BASE = ['renting', 'reserva-condutores'] as const;

/** Carrega os condutores de uma reserva (clientes ou motoristas). */
export function useReservaCondutores(reservaId: string | null | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, reservaId ?? null],
    queryFn: async (): Promise<ReservaCondutor[]> => {
      if (!reservaId) return [];
      const { data, error } = await supabase
        .from('reserva_condutores')
        .select(
          'id, org_id, reserva_id, cliente_id, motorista_id, is_principal, created_by, created_at' as string
        )
        .eq('reserva_id', reservaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReservaCondutor[];
    },
    enabled: !!reservaId,
    staleTime: 30_000,
  });
}

interface SyncArgs {
  reservaId: string;
  desejados: CondutorFormItem[];
  /** 'cliente' (rent-a-car) ou 'motorista' (TVDE) — define a coluna usada. */
  tipo: 'cliente' | 'motorista';
}

/**
 * Sincroniza a lista de condutores duma reserva contra o estado actual na BD.
 * `pessoa_id` é escrito em cliente_id ou motorista_id conforme o `tipo`.
 */
export function useSyncReservaCondutores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reservaId, desejados, tipo }: SyncArgs): Promise<void> => {
      const coluna = tipo === 'motorista' ? 'motorista_id' : 'cliente_id';

      const { data: actuais, error: fetchErr } = await supabase
        .from('reserva_condutores')
        .select('id, cliente_id, motorista_id, is_principal' as string)
        .eq('reserva_id', reservaId);
      if (fetchErr) throw fetchErr;

      type Linha = { id: string; cliente_id: string | null; motorista_id: string | null };
      const pessoaIdDe = (r: Linha) => r.cliente_id ?? r.motorista_id ?? '';

      const lista = (actuais ?? []) as unknown as Linha[];
      const actuaisPorPessoa = new Map(lista.map((c) => [pessoaIdDe(c), c]));
      const desejadosIds = new Set(desejados.map((c) => c.pessoa_id));

      // 1) Apagar os que sobram
      const idsApagar = lista.filter((c) => !desejadosIds.has(pessoaIdDe(c))).map((c) => c.id);
      if (idsApagar.length > 0) {
        const { error } = await supabase.from('reserva_condutores').delete().in('id', idsApagar);
        if (error) throw error;
      }

      // 2) Inserir os que faltam (org_id é preenchido por trigger na BD)
      const aInserir = desejados
        .filter((c) => !actuaisPorPessoa.has(c.pessoa_id))
        .map((c) => ({ reserva_id: reservaId, [coluna]: c.pessoa_id, is_principal: false }));
      if (aInserir.length > 0) {
        const { error } = await supabase
          .from('reserva_condutores')
          .insert(aInserir as unknown as TablesInsert<'reserva_condutores'>[]);
        if (error) throw error;
      }

      // 3) Resetar todos para is_principal=false (índice único parcial).
      const { error: errReset } = await supabase
        .from('reserva_condutores')
        .update({ is_principal: false })
        .eq('reserva_id', reservaId)
        .eq('is_principal', true);
      if (errReset) throw errReset;

      // 4) Marcar o principal desejado (se houver)
      const principal = desejados.find((c) => c.is_principal);
      if (principal) {
        const { error } = await supabase
          .from('reserva_condutores')
          .update({ is_principal: true })
          .eq('reserva_id', reservaId)
          .eq(coluna as string, principal.pessoa_id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEY_BASE, vars.reservaId] });
      qc.invalidateQueries({ queryKey: ['renting', 'reservas'] });
    },
  });
}
