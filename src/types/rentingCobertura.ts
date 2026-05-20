// ============================================================
// Catálogo de Coberturas de renting (tabela renting_coberturas)
// ============================================================
// Gerido na área de Tarifas (/renting/tarifas/coberturas).
// O contrato consome este catálogo — 1 cobertura por contrato.
export type RentingCobertura = {
  id: string;
  org_id: string;
  nome: string;
  descricao: string | null;
  preco_dia: number;
  franquia_valor: number | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};
