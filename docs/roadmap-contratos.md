# Roadmap — Módulo Contratos (Renting)

> Base: Any Rent (anyrent.pt). Replica funcional faseada.
> Princípio: **tabelas focadas com pattern reutilizado** (não super-tabela polimórfica).
> Sem deadline rígido. Objectivo: uso interno Década Ousada + SaaS futuro.

---

## Decisões arquitecturais (aprovadas)

### Estados em 2 dimensões
```
estado_operacional: agendado → em_curso → devolvido + cancelado
estado_financeiro:  pendente → facturado → pago + anulado
```
Mapeia directamente os filtros do Any Rent (`Recolha Pendente`, `Faturado`, `Liquidado`).

### Cálculo de preço — híbrido
- Contrato **com `estado_financeiro = 'pendente'`** → cálculo em tempo real (view ou client-side).
- Contrato **facturado** → snapshot persistido em `total_subtotal`, `total_iva`, `total_final`. Imutável (compliance SAF-T).

### Pacotes — expandidos (v2)
Adicionar pacote = inserir linhas em `contrato_extras`/`taxas`/`coberturas` com `origem_pacote_id` preenchido. Cálculo é `SUM` simples.

### Catálogos — admin centralizada (v1)
Página única `/admin/renting/catalogos` com tabs. Componente `<CatalogoAdmin tabela=X>` parameterizado. Hook abstracto `useCatalogo<T>`.

### Numeração — `BIGINT IDENTITY` por org
Formato `2026-NNNN` é só para o PDF impresso (formatação UI).

### Reclamações — usar `assistencia_tickets`
Não criar tabela nova. Adicionar `contrato_id UUID NULL` em `assistencia_tickets` (v2).

### Anti-overbooking — defesa em profundidade
1. EXCLUDE constraint dentro de `contratos` (mesma viatura, mesma org, períodos sobrepostos)
2. Trigger `BEFORE INSERT/UPDATE` que valida contra `reservas` activas (cross-table)
3. RPC `contrato_tem_conflito` valida ambos para o pré-check de UX

### Cliente — sem snapshot
FK `ON DELETE RESTRICT`. Nunca fica NULL. Snapshot é redundante e abre porta a inconsistências.

---

## Estado actual (2026-05-18)

**Feito:**
- ✅ Migration [supabase/migrations/20260518000001_create_contratos_renting.sql](../supabase/migrations/20260518000001_create_contratos_renting.sql) — schema corrigido (sem ALD, sem snapshot cliente, 2 estados, cross-table validation)
- ✅ Tipos [src/types/contratoRenting.ts](../src/types/contratoRenting.ts)
- ✅ Hook [src/hooks/useContratosRenting.ts](../src/hooks/useContratosRenting.ts) — CRUD + conflito cross-table

**Por aplicar:** migration ainda não correu no Supabase.

---

## MVP — abrir contratos (~1 semana)

Objectivo: criar/editar/listar contratos. Cliente + viatura + datas. Sem extras, taxas, coberturas, pacotes.

### Sprint MVP.1 — Aplicar schema (1h)
- [ ] Aplicar migration no Supabase
- [ ] Inserir permissão `renting_contratos` em `recursos`
- [ ] Adicionar label em [src/utils/recursoLabels.ts](../src/utils/recursoLabels.ts)

### Sprint MVP.2 — Lista (1 dia)
- [ ] Página [src/pages/renting/RentingContratos.tsx](../src/pages/renting/RentingContratos.tsx) (substituir placeholder)
- [ ] `src/components/renting/contratos/`:
  - `ContratosFiltros.tsx` (código, matrícula, estado_op, estado_fin, datas, estação)
  - `ContratosTabela.tsx`
  - `EstadoOperacionalBadge.tsx` + `EstadoFinanceiroBadge.tsx`
  - `contratosUtils.ts`

### Sprint MVP.3 — Form básico (2 dias)
- [ ] Rota `/renting/contratos/novo` e `/renting/contratos/:id` em [WebAppRoutes.tsx](../src/routes/WebAppRoutes.tsx)
- [ ] Páginas:
  - `src/pages/renting/ContratoNovo.tsx` (~50 linhas, só compõe)
  - `src/pages/renting/ContratoEditar.tsx` (~70 linhas, só compõe)
- [ ] `src/components/renting/contratos/`:
  - `contratoForm.schema.ts` (Zod)
  - `ContratoFormGeral.tsx` (tab Geral — entrega, recolha, viatura, cliente, estações, observações)
  - `ContratoFormSidebar.tsx` (resumo lateral à Any Rent)
  - `ContratoTabsPlaceholder.tsx` (tabs Condutores/Extras/Taxas/Coberturas/Fecho/Anexos/Outros com "Em desenvolvimento")
- [ ] Componente `<TabsNav>` para a barra de tabs reutilizável

### Sprint MVP.4 — Fluxo reserva→contrato (½ dia)
- [ ] Botão "Criar contrato" no `ReservaDialog` (quando reserva = `confirmada`)
- [ ] Navega para `/renting/contratos/novo?reserva_id=X` — pré-preenche cliente/viatura/datas

**Critério MVP:** consegues criar contrato manualmente ou a partir de reserva. Lista com filtros funcional. 2 estados visíveis. Anti-overbooking testado.

---

## v1 — usável em produção interna (~3 semanas)

Objectivo: Década Ousada usa diariamente. Tem cálculo de preço, extras, taxas, cobertura simples.

### Sprint v1.1 — Cálculo de preço simples (1 dia)
- [ ] View SQL `contrato_totais` (lê `tarifa_diaria * dias` + `valor_total_manual` se preenchido)
- [ ] Hook `useContratoTotais(id)`
- [ ] Componente `<ResumoContrato>` no Form (replica painel direito do Any Rent)
- [ ] Trigger ao mudar `estado_financeiro` para `'facturado'`: copia totais para snapshot columns

### Sprint v1.2 — Catálogo Extras (3 dias)
- [ ] Migration `extras` + `contrato_extras` (com `origem_pacote_id NULL` desde já para v2)
- [ ] Hook genérico `useCatalogo<T>(tabela, options)`
- [ ] Hook `useContratoExtras(contratoId)`
- [ ] Tab "Extras" no Form (grid checkboxes com snapshot de valor)
- [ ] Página `/admin/renting/catalogos` com tab Extras (CRUD)

### Sprint v1.3 — Catálogo Taxas (1 dia, reusa pattern)
- [ ] Migration `taxas` + `contrato_taxas`
- [ ] Reusa hook genérico
- [ ] Tab "Taxas" no Form
- [ ] Tab Taxas em `/admin/renting/catalogos`

### Sprint v1.4 — Cobertura simples (1 dia)
- [ ] Migration `coberturas` (catálogo)
- [ ] Adicionar coluna `cobertura_id UUID NULL REFERENCES coberturas(id)` a `contratos`
- [ ] Select de cobertura no Form (não tab dedicada — só dropdown)
- [ ] Tab Coberturas em `/admin/renting/catalogos`

### Sprint v1.5 — Condutores (2 dias)
- [ ] Migration `contrato_condutores`
- [ ] Hook `useContratoCondutores`
- [ ] Tab "Condutores" no Form
- [ ] Constraint: 1 condutor principal por contrato

### Sprint v1.6 — Anexos (1 dia, reusa `cliente_anexos`)
- [ ] Migration `contrato_anexos` + storage bucket `contrato-anexos`
- [ ] Tab "Anexos" (replica `ClienteAnexosTab.tsx`)

**Critério v1:** Década Ousada factura contratos reais via WeGest. Cálculo de preço automático. Anexos guardados.

---

## v2 — SaaS premium (~1-2 meses, on-demand)

Cada item é independente. Implementar quando 1º cliente SaaS pedir.

### Pacotes (expandidos)
- Catálogo `pacotes` + `pacote_itens(pacote_id, tipo, item_id, quantidade)` (polimórfico aqui é OK — pacote é composição por natureza)
- Adicionar pacote ao contrato = inserir linhas em `contrato_extras`/`taxas`/`coberturas` com `origem_pacote_id`
- Cálculo continua `SUM` simples
- Tab "Pacotes" no Form
- Catálogo `pacotes` em `/admin/renting/catalogos`

### Multi-cobertura
- Substituir `cobertura_id` única por `contrato_coberturas`
- Migration de migração de dados

### Tab Fecho complexa
- `contrato_artigos` (linhas manuais com tipo, descrição, unidades, valor, isento IVA)
- Função SQL para cálculo com tarifas progressivas (dia 1-7 vs dia 8+)
- Desconto por linha vs desconto global

### Reclamações
- Adicionar `contrato_id UUID NULL` em `assistencia_tickets`
- Tab "Outros" com lista de tickets relacionados + botão "Nova reclamação"

### ALD (Aluguer Longa Duração)
- Tabela `contrato_series` (parent)
- Adicionar `serie_id UUID NULL REFERENCES contrato_series(id)` em `contratos`
- pg_cron job gera contrato-filho ao fim de cada período

### Relatório de Saída (PDF)
- Edge Function gera PDF do contrato com dados + assinatura cliente
- Template configurável por org

### Outras tabs Any Rent
- **Via Verde** (integração API portagens) — requer cliente real com Via Verde
- **Geo-localização** (tracking GPS) — requer hardware
- **Caixa** (recebimentos detalhados MB/MBWay/cartão)
- **QR Code** (digitalização)

---

## Fora do scope (sem plano)

Funcionalidades do Any Rent que não vamos replicar a não ser que cliente real peça:
- Plano de Faturação (renovação mensal automática de facturas)
- Upgrade/Downgrade mantendo tarifa original
- Vouchers de marketing (códigos promocionais geríveis)
- Pesquisa por QR code físico colado na viatura

---

## Dependências

```
MVP (Sprints MVP.1-4)
 │
 ├─→ v1.1 (Cálculo simples)
 │    │
 │    └─→ v1.2 (Extras) ─┬─→ v1.3 (Taxas)
 │                       └─→ v1.4 (Coberturas)
 │
 ├─→ v1.5 (Condutores) — independente
 └─→ v1.6 (Anexos) — independente

v2 inteira é independente entre si e da v1, mas requer MVP+v1 estáveis.
```

---

## Próximo passo

**Sprint MVP.1, tarefa 1:** aplicar [migration de contratos](../supabase/migrations/20260518000001_create_contratos_renting.sql) ao Supabase via SQL Editor.

Confirma quando aplicada (e dá feedback de qualquer erro) para arrancar **MVP.2 (Lista)**.

---

_Última actualização: 2026-05-18 · v2 (revisto após auditoria crítica)_
