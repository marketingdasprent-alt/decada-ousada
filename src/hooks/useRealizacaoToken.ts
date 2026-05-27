import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TokenRealizacaoInfo {
  evento_id: string;
  contrato_id: string;
  tipo: 'entrega' | 'recolha';
  matricula: string;
  cidade: string | null;
  data_inicio: string;
}

/** Cria token de deep-link para um evento de calendário. */
export function useGerarTokenRealizacao() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (eventoId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('gerar_token_realizacao', {
        p_evento_id: eventoId,
      });
      if (error) throw error;
      return data as string;
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao gerar QR',
        description: err instanceof Error ? err.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}

/** Carrega os dados associados a um token (página /check-out/:token). */
export function useConsumirTokenRealizacao(token: string | null) {
  return useQuery({
    queryKey: ['realizacao-token', token],
    queryFn: async (): Promise<TokenRealizacaoInfo | null> => {
      if (!token) return null;
      const { data, error } = await supabase.rpc('consumir_token_realizacao', {
        p_token: token,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return row as TokenRealizacaoInfo;
    },
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * Polling do evento — usado pelo laptop enquanto espera que o
 * telemóvel realize. Devolve o `realizado_em` quando aparece.
 */
export function usePollEventoRealizado(eventoId: string | null, enabled = true) {
  const [realizado, setRealizado] = useState<{
    em: string;
    por_id: string | null;
  } | null>(null);

  useEffect(() => {
    if (!eventoId || !enabled) return;
    setRealizado(null);
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;
      const { data, error } = await supabase
        .from('calendario_eventos')
        .select('realizado_em, realizado_por_id')
        .eq('id', eventoId)
        .maybeSingle();
      if (error || !data || cancelled) return;
      if (data.realizado_em) {
        setRealizado({
          em: data.realizado_em as string,
          por_id: (data.realizado_por_id as string | null) ?? null,
        });
      }
    };

    check();
    const interval = setInterval(check, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [eventoId, enabled]);

  return realizado;
}

interface RealizarFromTokenArgs {
  token: string;
  eventoId: string;
  contratoId: string;
  tipo: 'entrega' | 'recolha';
}

/**
 * Confirma a realização no telemóvel: muda o estado_operacional do
 * contrato (trigger marca o evento como realizado) + marca o token
 * como usado.
 */
export function useRealizarFromToken() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ token, contratoId, tipo }: RealizarFromTokenArgs): Promise<void> => {
      const novoEstado = tipo === 'entrega' ? 'em_curso' : 'devolvido';
      const { error: e1 } = await supabase
        .from('contratos_renting')
        .update({ estado_operacional: novoEstado })
        .eq('id', contratoId);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from('realizacao_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', token);
      if (e2) throw e2;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['realizacao-token', vars.token] });
      qc.invalidateQueries({ queryKey: ['calendario-eventos'] });
      toast({
        title: vars.tipo === 'entrega' ? 'Entrega confirmada' : 'Recolha confirmada',
        description: 'O evento ficou marcado como realizado.',
      });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao confirmar',
        description: err instanceof Error ? err.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}
