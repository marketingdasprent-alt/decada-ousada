import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EventoPendenteRenting {
  id: string;
  titulo: string;
  cidade: string | null;
  data_inicio: string;
  matricula_devolver: string | null;
  origem_id: string;
  contrato_codigo: number | null;
}

interface UseOptions {
  tipo: 'entrega' | 'recolha';
  enabled?: boolean;
}

const QUERY_KEY_BASE = ['calendario', 'eventos-pendentes-renting'] as const;

/**
 * Lista eventos de renting que ainda não foram realizados.
 * Tipo: 'entrega' (carro a entregar) ou 'recolha' (carro a recolher).
 */
export function useEventosPendentesRenting({ tipo, enabled = true }: UseOptions) {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, tipo],
    queryFn: async (): Promise<EventoPendenteRenting[]> => {
      const { data, error } = await supabase
        .from('calendario_eventos')
        .select(
          `id, titulo, cidade, data_inicio, matricula_devolver, origem_id,
           contratos_renting:contratos_renting!calendario_eventos_origem_id_fkey(codigo)`
        )
        .eq('origem_tipo', 'contrato_renting')
        .eq('tipo', tipo)
        .is('realizado_em', null)
        .order('data_inicio', { ascending: true });

      // FK lógica (não enforçada) — se a join falhar, faz fallback sem código
      if (error) {
        const { data: fallback, error: e2 } = await supabase
          .from('calendario_eventos')
          .select('id, titulo, cidade, data_inicio, matricula_devolver, origem_id')
          .eq('origem_tipo', 'contrato_renting')
          .eq('tipo', tipo)
          .is('realizado_em', null)
          .order('data_inicio', { ascending: true });
        if (e2) throw e2;
        return (fallback ?? []).map((e) => ({
          id: e.id,
          titulo: e.titulo,
          cidade: e.cidade,
          data_inicio: e.data_inicio,
          matricula_devolver: e.matricula_devolver,
          origem_id: e.origem_id as string,
          contrato_codigo: null,
        }));
      }

      return (data ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        titulo: e.titulo as string,
        cidade: (e.cidade as string | null) ?? null,
        data_inicio: e.data_inicio as string,
        matricula_devolver: (e.matricula_devolver as string | null) ?? null,
        origem_id: e.origem_id as string,
        contrato_codigo: (e.contratos_renting as { codigo?: number } | null)?.codigo ?? null,
      }));
    },
    enabled,
    staleTime: 30_000,
  });
}

interface RealizarArgs {
  /** ID do contrato_renting (vem do origem_id do evento). */
  contratoId: string;
  /** entrega → estado_operacional=em_curso; recolha → devolvido. */
  tipo: 'entrega' | 'recolha';
}

/**
 * Marca o evento como realizado mudando o estado_operacional do contrato.
 * O trigger `cascata_realizacao` propaga para calendario_eventos.
 */
export function useRealizarEventoRenting() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ contratoId, tipo }: RealizarArgs) => {
      const novoEstado = tipo === 'entrega' ? 'em_curso' : 'devolvido';
      const { error } = await supabase
        .from('contratos_renting')
        .update({ estado_operacional: novoEstado })
        .eq('id', contratoId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEY_BASE, vars.tipo] });
      qc.invalidateQueries({ queryKey: ['calendario-eventos'] });
      qc.invalidateQueries({ queryKey: ['renting', 'contratos'] });
      toast({
        title: vars.tipo === 'entrega' ? 'Entrega realizada' : 'Recolha realizada',
        description: 'O evento ficou marcado como realizado.',
      });
    },
    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao realizar', description, variant: 'destructive' });
    },
  });
}
