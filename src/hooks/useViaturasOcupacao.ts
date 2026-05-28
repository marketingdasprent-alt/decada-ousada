// Ocupação atual das viaturas (sem depender do RPC de disponibilidade unificada).
// Consulta diretamente as fontes que ocupam uma viatura e devolve, por viatura,
// o conjunto de fontes ativas. Usado para derivar o estado (em reserva / em
// contrato / em movimentação / manutenção) na listagem da Frota.
//
// "Ativo" = qualquer registo cujo estado ainda não terminou, mesmo que o período
// comece no futuro (uma reserva/contrato agendado já conta como ocupação).

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OcupacaoFonte = 'reserva' | 'contrato' | 'movimento' | 'reparacao';

export function useViaturasOcupacao(enabled = true) {
  return useQuery({
    queryKey: ['viaturas-ocupacao-atual'],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<Map<string, Set<string>>> => {
      const map = new Map<string, Set<string>>();
      const add = (id: string | null | undefined, fonte: OcupacaoFonte) => {
        if (!id) return;
        let set = map.get(id);
        if (!set) {
          set = new Set<string>();
          map.set(id, set);
        }
        set.add(fonte);
      };

      const [reservas, contratos, movimentos, reparacoes] = await Promise.all([
        supabase
          .from('reservas')
          .select('viatura_id')
          .not('viatura_id', 'is', null)
          .in('estado', ['pendente', 'confirmada', 'em_curso']),
        supabase
          .from('contratos_renting')
          .select('viatura_id')
          .is('deleted_at', null)
          .not('viatura_id', 'is', null)
          .in('estado_operacional', ['agendado', 'em_curso']),
        supabase
          .from('movimentos')
          .select('viatura_id')
          .not('viatura_id', 'is', null)
          .in('estado', ['planeado', 'a_decorrer']),
        supabase
          .from('viatura_reparacoes')
          .select('viatura_id')
          .not('viatura_id', 'is', null)
          .not('data_entrada', 'is', null)
          .is('data_saida', null),
      ]);

      (reservas.data ?? []).forEach((r: { viatura_id: string | null }) =>
        add(r.viatura_id, 'reserva')
      );
      (contratos.data ?? []).forEach((r: { viatura_id: string | null }) =>
        add(r.viatura_id, 'contrato')
      );
      (movimentos.data ?? []).forEach((r: { viatura_id: string | null }) =>
        add(r.viatura_id, 'movimento')
      );
      (reparacoes.data ?? []).forEach((r: { viatura_id: string | null }) =>
        add(r.viatura_id, 'reparacao')
      );

      return map;
    },
  });
}
