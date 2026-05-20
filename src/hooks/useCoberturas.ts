import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Cobertura, CoberturaInsert, CoberturaUpdate } from '@/types/cobertura';

const QUERY_KEY = ['renting', 'coberturas'] as const;

interface UseCoberturasOptions {
  /** Quando true, devolve apenas coberturas activas (para selects no form). */
  apenasAtivas?: boolean;
}

export function useCoberturas(options: UseCoberturasOptions = {}) {
  const { apenasAtivas = false } = options;

  return useQuery({
    queryKey: [...QUERY_KEY, { apenasAtivas }],
    queryFn: async (): Promise<Cobertura[]> => {
      let q = supabase.from('coberturas').select('*').order('nome', { ascending: true });
      if (apenasAtivas) q = q.eq('ativo', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Cobertura[];
    },
    staleTime: 60_000,
  });
}

export function useCreateCobertura() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cobertura: CoberturaInsert) => {
      const { data, error } = await supabase.from('coberturas').insert(cobertura).select().single();
      if (error) throw error;
      return data as Cobertura;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Cobertura criada' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar cobertura',
        description: error instanceof Error ? error.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCobertura() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...patch }: CoberturaUpdate & { id: string }) => {
      const { error } = await supabase.from('coberturas').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Cobertura actualizada' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao actualizar cobertura',
        description: error instanceof Error ? error.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCobertura() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coberturas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Cobertura eliminada' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao eliminar cobertura',
        description: error instanceof Error ? error.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}
