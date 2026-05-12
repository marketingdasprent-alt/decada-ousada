import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ViaturaBasic {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  status: string;
  categoria: string | null;
  km_atual: number | null;
  combustivel: string | null;
}

interface UseViaturasOptions {
  /** Se true, exclui viaturas com status 'vendida' (padrão: false) */
  excluirVendidas?: boolean;
  /** Filtrar por status específico */
  status?: string;
  /** Se false, a query não é executada */
  enabled?: boolean;
}

export function useViaturas(options: UseViaturasOptions = {}) {
  const { excluirVendidas = false, status, enabled = true } = options;

  return useQuery({
    queryKey: ['viaturas', { excluirVendidas, status }],
    queryFn: async () => {
      let q = supabase
        .from('viaturas')
        .select('id, matricula, marca, modelo, status, categoria, km_atual, combustivel')
        .order('matricula');

      if (excluirVendidas) q = q.not('status', 'eq', 'vendida');
      if (status) q = q.eq('status', status);

      const { data, error } = await q;
      if (error) throw error;
      return data as ViaturaBasic[];
    },
    enabled,
  });
}
