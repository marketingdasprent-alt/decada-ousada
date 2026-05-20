import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Colaborador } from '@/types/movimento';

interface UseColaboradoresOptions {
  /** Se false, a query não é executada */
  enabled?: boolean;
}

/**
 * Lista os colaboradores internos (utilizadores) da organização atual.
 *
 * A policy RLS de `profiles` só deixa o utilizador comum ver o próprio
 * perfil, por isso usamos a função SECURITY DEFINER `listar_colaboradores`,
 * que devolve apenas (id, nome) dos membros da org.
 */
export function useColaboradores(options: UseColaboradoresOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['colaboradores'],
    queryFn: async (): Promise<Colaborador[]> => {
      const { data, error } = await supabase.rpc('listar_colaboradores');
      if (error) throw error;
      return (data ?? []) as Colaborador[];
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
