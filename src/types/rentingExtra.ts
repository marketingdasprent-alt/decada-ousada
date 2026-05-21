// ============================================================
// Catálogo de Extras de renting (tabela renting_extras)
// ============================================================
// Gerido na área de Tarifas (/renting/tarifas/extras).
// O contrato consome este catálogo — vários extras por contrato.
export const EXTRA_TIPOS_CALCULO = ['dia', 'fixo'] as const;
export type ExtraTipoCalculo = (typeof EXTRA_TIPOS_CALCULO)[number];

export const EXTRA_TIPO_CALCULO_LABELS: Record<ExtraTipoCalculo, string> = {
  dia: 'por dia',
  fixo: 'preço fixo',
};

export type RentingExtra = {
  id: string;
  org_id: string;
  nome: string;
  descricao: string | null;
  preco_unidade: number;
  tipo_calculo: ExtraTipoCalculo;
  quantidade_maxima: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};
