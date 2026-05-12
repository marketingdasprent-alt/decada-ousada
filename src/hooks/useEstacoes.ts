import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Estacao {
  id: string;
  nome: string;
  morada: string | null;
  cidade: string | null;
  ativa: boolean;
}

interface UseEstacoesOptions {
  /** Se true, retorna apenas estações ativas (padrão: true) */
  apenasAtivas?: boolean;
  /** Se false, a query não é executada */
  enabled?: boolean;
}

export function useEstacoes(options: UseEstacoesOptions = {}) {
  const { apenasAtivas = true, enabled = true } = options;

  return useQuery({
    queryKey: ['estacoes', { apenasAtivas }],
    queryFn: async () => {
      let q = supabase
        .from('estacoes')
        .select('id, nome, morada, cidade, ativa')
        .order('nome');

      if (apenasAtivas) q = q.eq('ativa', true);

      const { data, error } = await q;
      if (error) throw error;
      return data as Estacao[];
    },
    enabled,
  });
}
