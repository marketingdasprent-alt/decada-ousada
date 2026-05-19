import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  ContratoRenting,
  ContratoEstadoOperacional,
  ContratoEstadoFinanceiro,
  ContratoRentingInsert,
  ContratoRentingUpdate,
} from '@/types/contratoRenting';

const QUERY_KEY_BASE = ['renting', 'contratos'] as const;

export interface UseContratosRentingOptions {
  estadoOperacional?: ContratoEstadoOperacional;
  estadoFinanceiro?: ContratoEstadoFinanceiro;
  viaturaId?: string;
  clienteId?: string;
  limit?: number;
  enabled?: boolean;
}

const SELECT_COLUMNS = `
  id, org_id, codigo,
  reserva_id,
  cliente_id,
  viatura_id, matricula, grupo,
  estacao_entrega_id, data_inicio,
  estacao_recolha_id, data_fim,
  estacao_origem_viatura_id,
  estado_operacional, estado_financeiro, origem,
  tarifa_diaria, desconto_percentagem, taxa_iva, valor_total_manual,
  total_subtotal, total_iva, total_final, facturado_em,
  voucher_codigo,
  numero_processo, voo_referencia,
  local_entrega, local_recolha,
  comentarios_entrega, comentarios_recolha,
  observacoes,
  deleted_at, created_by, updated_by, created_at, updated_at
`;

export function useContratosRenting(options: UseContratosRentingOptions = {}) {
  const {
    estadoOperacional,
    estadoFinanceiro,
    viaturaId,
    clienteId,
    limit = 1000,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: [
      ...QUERY_KEY_BASE,
      {
        estadoOperacional: estadoOperacional ?? null,
        estadoFinanceiro: estadoFinanceiro ?? null,
        viaturaId: viaturaId ?? null,
        clienteId: clienteId ?? null,
        limit,
      },
    ],
    queryFn: async (): Promise<ContratoRenting[]> => {
      let q = supabase
        .from('contratos_renting')
        .select(SELECT_COLUMNS)
        .is('deleted_at', null)
        .order('data_inicio', { ascending: false })
        .limit(limit);

      if (estadoOperacional) q = q.eq('estado_operacional', estadoOperacional);
      if (estadoFinanceiro) q = q.eq('estado_financeiro', estadoFinanceiro);
      if (viaturaId) q = q.eq('viatura_id', viaturaId);
      if (clienteId) q = q.eq('cliente_id', clienteId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContratoRenting[];
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled,
  });
}

// ────────────────────────────────────────────────────────────
// Totais (view contrato_renting_totais)
// ────────────────────────────────────────────────────────────

export interface ContratoTotais {
  contrato_id: string;
  dias: number;
  estado_financeiro: string;
  subtotal: number;
  iva: number;
  total: number;
  facturado_em: string | null;
  is_snapshot: boolean;
}

export function useContratoTotais(id: string | null | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, 'totais', id],
    queryFn: async (): Promise<ContratoTotais | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contrato_renting_totais')
        .select('*')
        .eq('contrato_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as ContratoTotais | null;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useContratoRenting(id: string | null | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, 'detail', id],
    queryFn: async (): Promise<ContratoRenting | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contratos_renting')
        .select(SELECT_COLUMNS)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as ContratoRenting | null;
    },
    enabled: !!id,
  });
}

// ────────────────────────────────────────────────────────────
// Tratamento de erros (overbooking + conflito com reserva)
// ────────────────────────────────────────────────────────────

function isConflictError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as { code?: string }).code;
  if (code === '23P01') return true; // exclusion_violation
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('contratos_no_overbooking') ||
    message.includes('Conflito: viatura já tem reserva')
  );
}

function contratoErrorMessage(error: unknown): { title: string; description: string } {
  if (isConflictError(error)) {
    return {
      title: 'Conflito de disponibilidade',
      description: 'A viatura já tem contrato ou reserva activa sobreposta neste período.',
    };
  }
  const description = error instanceof Error ? error.message : 'Erro inesperado';
  return { title: 'Erro', description };
}

// ────────────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────────────

export function useCreateContratoRenting() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: ContratoRentingInsert): Promise<ContratoRenting> => {
      const { data, error } = await supabase
        .from('contratos_renting')
        .insert(payload)
        .select(SELECT_COLUMNS)
        .single();
      if (error) throw error;
      return data as ContratoRenting;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY_BASE });
      toast({ title: 'Contrato criado', description: 'O contrato foi aberto com sucesso.' });
    },
    onError: (error: unknown) => {
      const { title, description } = contratoErrorMessage(error);
      toast({ title, description, variant: 'destructive' });
    },
  });
}

export function useUpdateContratoRenting() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: ContratoRentingUpdate & { id: string }): Promise<ContratoRenting> => {
      const { data, error } = await supabase
        .from('contratos_renting')
        .update(patch)
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single();
      if (error) throw error;
      return data as ContratoRenting;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY_BASE });
      toast({ title: 'Contrato actualizado', description: 'As alterações foram guardadas.' });
    },
    onError: (error: unknown) => {
      const { title, description } = contratoErrorMessage(error);
      toast({ title, description, variant: 'destructive' });
    },
  });
}

/** Soft delete — marca deleted_at. Hard delete fica para admin via BD. */
export function useDeleteContratoRenting() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('contratos_renting')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY_BASE });
      toast({ title: 'Contrato eliminado', description: 'O contrato foi removido.' });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : 'Erro inesperado';
      toast({ title: 'Erro ao eliminar', description, variant: 'destructive' });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Pré-check de conflito (UX). Valida contratos E reservas.
// ────────────────────────────────────────────────────────────

export interface UseContratoConflitoArgs {
  viaturaId: string | null | undefined;
  dataInicio: Date | null | undefined;
  dataFim: Date | null | undefined;
  /** ID do próprio contrato (ao editar) — para se excluir do check. */
  excluirId?: string | null;
  /** ID da reserva associada (não conta como conflito consigo mesma). */
  reservaId?: string | null;
}

export function useContratoConflito(args: UseContratoConflitoArgs) {
  const { viaturaId, dataInicio, dataFim, excluirId, reservaId } = args;

  const enabled =
    !!viaturaId && !!dataInicio && !!dataFim && dataFim.getTime() > dataInicio.getTime();

  return useQuery({
    queryKey: [
      'renting',
      'contratos',
      'conflito',
      viaturaId ?? null,
      dataInicio?.toISOString() ?? null,
      dataFim?.toISOString() ?? null,
      excluirId ?? null,
      reservaId ?? null,
    ],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('contrato_tem_conflito', {
        p_viatura_id: viaturaId!,
        p_data_inicio: dataInicio!.toISOString(),
        p_data_fim: dataFim!.toISOString(),
        p_excluir_id: excluirId ?? null,
        p_reserva_id: reservaId ?? null,
      });
      if (error) throw error;
      return Boolean(data);
    },
    enabled,
    staleTime: 10_000,
  });
}
