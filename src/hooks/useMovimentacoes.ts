import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Movimentacao {
  id: string;
  org_id: string;
  viatura_id: string;
  estacao_origem_id: string | null;
  estacao_destino_id: string;
  data_movimentacao: string;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
}

const QUERY_KEY = ['renting', 'movimentacoes'] as const;

// renting_movimentacoes é uma tabela nova — ainda não está em types.ts
// (regenerar). Daí o acesso sem tipo (`as never`) a esta tabela.
const TABELA = 'renting_movimentacoes' as never;

/** Histórico de movimentações de viaturas entre estações. */
export function useMovimentacoes() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Movimentacao[]> => {
      const { data, error } = await supabase
        .from(TABELA)
        .select('*')
        .order('data_movimentacao', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Movimentacao[];
    },
    staleTime: 30_000,
  });
}

interface CriarMovimentacaoArgs {
  viatura_id: string;
  estacao_destino_id: string;
  observacoes?: string | null;
}

/** Cria uma movimentação — a viatura passa para a estação destino (trigger na BD). */
export function useCriarMovimentacao() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: CriarMovimentacaoArgs): Promise<void> => {
      // org_id e estacao_origem_id são preenchidos por trigger na BD.
      const { error } = await supabase.from(TABELA).insert({
        viatura_id: args.viatura_id,
        estacao_destino_id: args.estacao_destino_id,
        observacoes: args.observacoes || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['viaturas'] });
      toast({
        title: 'Viatura movimentada',
        description: 'A viatura foi movida para a nova estação.',
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : 'Erro inesperado';
      toast({ title: 'Erro ao movimentar', description, variant: 'destructive' });
    },
  });
}
