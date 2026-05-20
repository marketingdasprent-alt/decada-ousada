// ============================================================
// Catálogo de Coberturas (renting)
// ============================================================
export type Cobertura = {
  id: string;
  org_id: string;
  nome: string;
  descricao: string | null;
  valor_diario: number | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CoberturaInsert = {
  nome: string;
  descricao?: string | null;
  valor_diario?: number | null;
  ativo?: boolean;
};

export type CoberturaUpdate = Partial<CoberturaInsert>;
