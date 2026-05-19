export const RESERVA_ESTADOS = [
  'pendente',
  'confirmada',
  'em_curso',
  'concluida',
  'cancelada',
  'expirada',
] as const;

export type ReservaEstado = (typeof RESERVA_ESTADOS)[number];

// Estados que ocupam slot na timeline e bloqueiam novas reservas
export const RESERVA_ESTADOS_ACTIVOS: readonly ReservaEstado[] = [
  'pendente',
  'confirmada',
  'em_curso',
] as const;

export const ESTADO_LABELS: Record<ReservaEstado, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  em_curso: 'Em Contrato',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

export const RENOVACAO_OPCOES = [
  'primeiro_dia_mes',
  'mesmo_dia_cada_mes',
  'intervalo_dias',
] as const;
export type RenovacaoOpcao = (typeof RENOVACAO_OPCOES)[number];

export const RENOVACAO_OPCAO_LABELS: Record<RenovacaoOpcao, string> = {
  primeiro_dia_mes: 'Ao primeiro dia de cada mês',
  mesmo_dia_cada_mes: 'No mesmo dia em cada mês',
  intervalo_dias: 'A cada intervalo específico de dias',
};

export type Reserva = {
  id: string;
  org_id: string;
  codigo: number;
  viatura_id: string | null;
  matricula: string | null;
  grupo: string | null;
  estacao_entrega_id: string | null;
  estacao_recolha_id: string | null;
  data_inicio: string;
  data_fim: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  condutor_id: string | null;
  condutor_nome: string | null;
  estado: ReservaEstado;
  valor_total: number | null;
  observacoes: string | null;
  observacoes_internas: string | null;
  // Longa duração / renovação
  aluguer_longa_duracao: boolean;
  renovacao_opcao: RenovacaoOpcao | null;
  renovacao_intervalo_dias: number | null;
  // Financeiro / kms
  franquia_valor: number | null;
  caucao_valor: number | null;
  kms_incluidos: number | null;
  km_adicional_valor: number | null;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReservaInsert = Omit<
  Reserva,
  'id' | 'codigo' | 'deleted_at' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>;

export type ReservaUpdate = Partial<ReservaInsert> & { deleted_at?: string | null };
