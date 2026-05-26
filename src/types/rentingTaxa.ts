// ============================================================
// Catálogo de Taxas de renting (tabela renting_taxas)
// ============================================================
// Gerido na área de Tarifas (/renting/tarifas/taxas).
// Uma taxa é percentagem XOR valor fixo. O contrato consome
// este catálogo — várias taxas por contrato.
export type RentingTaxa = {
  id: string;
  org_id: string;
  nome: string;
  descricao: string | null;
  /** Percentagem (0-100) — exclusivo com valor_fixo. */
  percentagem: number | null;
  /** Valor fixo (€) — exclusivo com percentagem. */
  valor_fixo: number | null;
  /** Se true, é adicionada automaticamente a novas reservas/contratos. */
  aplicar_automaticamente: boolean;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};
