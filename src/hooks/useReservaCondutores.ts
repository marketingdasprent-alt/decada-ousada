import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CondutorFormItem, ReservaCondutor } from '@/types/reserva';

const QUERY_KEY_BASE = ['renting', 'reserva-condutores'] as const;

/** Carrega os condutores de uma reserva. */
export function useReservaCondutores(reservaId: string | null | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, reservaId ?? null],
    queryFn: async (): Promise<ReservaCondutor[]> => {
      if (!reservaId) return [];
      const { data, error } = await supabase
        .from('reserva_condutores')
        .select('id, org_id, reserva_id, cliente_id, is_principal, created_by, created_at')
        .eq('reserva_id', reservaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReservaCondutor[];
    },
    enabled: !!reservaId,
    staleTime: 30_000,
  });
}

interface SyncArgs {
  reservaId: string;
  desejados: CondutorFormItem[];
}

/**
 * Sincroniza a lista de condutores duma reserva contra o estado actual na BD:
 *   • Apaga os condutores que existem na BD mas não estão na lista desejada.
 *   • Insere os condutores que estão na lista mas ainda não existem.
 *   • Garante que apenas um condutor é principal — limpa a flag em todos e
 *     marca o desejado.
 */
export function useSyncReservaCondutores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reservaId, desejados }: SyncArgs): Promise<void> => {
      const { data: actuais, error: fetchErr } = await supabase
        .from('reserva_condutores')
        .select('id, cliente_id, is_principal')
        .eq('reserva_id', reservaId);
      if (fetchErr) throw fetchErr;

      const actuaisPorCliente = new Map((actuais ?? []).map((c) => [c.cliente_id, c]));
      const desejadosClientes = new Set(desejados.map((c) => c.cliente_id));

      // 1) Apagar os que sobram
      const idsApagar = (actuais ?? [])
        .filter((c) => !desejadosClientes.has(c.cliente_id))
        .map((c) => c.id);
      if (idsApagar.length > 0) {
        const { error } = await supabase.from('reserva_condutores').delete().in('id', idsApagar);
        if (error) throw error;
      }

      // 2) Inserir os que faltam (sempre is_principal=false; corrigimos depois)
      const aInserir = desejados
        .filter((c) => !actuaisPorCliente.has(c.cliente_id))
        .map((c) => ({
          reserva_id: reservaId,
          cliente_id: c.cliente_id,
          is_principal: false,
        }));
      if (aInserir.length > 0) {
        const { error } = await supabase.from('reserva_condutores').insert(aInserir);
        if (error) throw error;
      }

      // 3) Resetar todos para is_principal=false (necessário antes de marcar
      //    o novo principal por causa do índice único parcial).
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
          .eq('cliente_id', principal.cliente_id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEY_BASE, vars.reservaId] });
      qc.invalidateQueries({ queryKey: ['renting', 'reservas'] });
    },
  });
}
