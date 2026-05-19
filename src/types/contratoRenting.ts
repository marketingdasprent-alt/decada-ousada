// ============================================================
// Estado operacional (ciclo físico da viatura)
// ============================================================
export const CONTRATO_ESTADOS_OP = ['agendado', 'em_curso', 'devolvido', 'cancelado'] as const;
export type ContratoEstadoOperacional = (typeof CONTRATO_ESTADOS_OP)[number];

export const CONTRATO_ESTADO_OP_LABELS: Record<ContratoEstadoOperacional, string> = {
  agendado: 'Agendado',
  em_curso: 'Em Curso',
  devolvido: 'Devolvido',
  cancelado: 'Cancelado',
};

// ============================================================
// Estado financeiro (ciclo de facturação)
// ============================================================
export const CONTRATO_ESTADOS_FIN = ['pendente', 'facturado', 'pago', 'anulado'] as const;
export type ContratoEstadoFinanceiro = (typeof CONTRATO_ESTADOS_FIN)[number];

export const CONTRATO_ESTADO_FIN_LABELS: Record<ContratoEstadoFinanceiro, string> = {
  pendente: 'Pendente',
  facturado: 'Facturado',
  pago: 'Pago',
  anulado: 'Anulado',
};

// ============================================================
// Origem
// ============================================================
export const CONTRATO_ORIGENS = ['sistema', 'online', 'telefone', 'balcao'] as const;
export type ContratoOrigem = (typeof CONTRATO_ORIGENS)[number];

export const CONTRATO_ORIGEM_LABELS: Record<ContratoOrigem, string> = {
  sistema: 'Sistema',
  online: 'Online',
  telefone: 'Telefone',
  balcao: 'Balcão',
};

// ============================================================
// Tipo principal
// ============================================================
export type ContratoRenting = {
  id: string;
  org_id: string;
  codigo: number;

  reserva_id: string | null;

  cliente_id: string;

  viatura_id: string;
  matricula: string | null;
  grupo: string | null;

  estacao_entrega_id: string | null;
  data_inicio: string;

  estacao_recolha_id: string | null;
  data_fim: string;

  estacao_origem_viatura_id: string | null;

  estado_operacional: ContratoEstadoOperacional;
  estado_financeiro: ContratoEstadoFinanceiro;
  origem: ContratoOrigem;

  // Tarifário simples (MVP)
  tarifa_diaria: number | null;
  desconto_percentagem: number | null;
  taxa_iva: number;
  valor_total_manual: number | null;

  // Snapshot de totais (NULL até facturar; imutáveis após)
  total_subtotal: number | null;
  total_iva: number | null;
  total_final: number | null;
  facturado_em: string | null;

  voucher_codigo: string | null;

  numero_processo: string | null;
  voo_referencia: string | null;
  local_entrega: string | null;
  local_recolha: string | null;
  comentarios_entrega: string | null;
  comentarios_recolha: string | null;

  observacoes: string | null;

  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContratoRentingInsert = Omit<
  ContratoRenting,
  | 'id'
  | 'org_id'
  | 'codigo'
  | 'total_subtotal'
  | 'total_iva'
  | 'total_final'
  | 'facturado_em'
  | 'deleted_at'
  | 'created_by'
  | 'updated_by'
  | 'created_at'
  | 'updated_at'
>;

export type ContratoRentingUpdate = Partial<ContratoRentingInsert> & {
  deleted_at?: string | null;
};
