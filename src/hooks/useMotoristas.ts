import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Motorista } from '@/types/motorista';

interface UseMotoristaOptions {
  /** Se true, retorna apenas motoristas com status_ativo=true (padrão: false) */
  apenasAtivos?: boolean;
  /** Se false, a query não é executada */
  enabled?: boolean;
}

export function useMotoristas(options: UseMotoristaOptions = {}) {
  const { apenasAtivos = false, enabled = true } = options;

  return useQuery({
    queryKey: ['motoristas', { apenasAtivos }],
    queryFn: async () => {
      let q = supabase
        .from('motoristas_ativos')
        .select('*')
        .order('nome');

      if (apenasAtivos) q = q.eq('status_ativo', true);

      const { data, error } = await q;
      if (error) throw error;
      return data as Motorista[];
    },
    enabled,
  });
}
