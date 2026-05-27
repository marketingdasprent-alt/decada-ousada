# Máquina de estados da viatura

> Documento de referência. Captura o **estado actual** das transições da viatura e fixa o **modelo canónico** para a Fase 2 (contrato-centric).
>
> **Não introduz transições novas.** Serve como contrato entre os triggers SQL, hooks aplicacionais e UI — todos têm de respeitar esta tabela.

## 1. Estados

O campo `viaturas.status` aceita um destes valores:

| Estado | Significado | Aceita motorista? |
|---|---|---|
| `disponivel` | Livre. Pode ser alocada a contrato, reserva, manutenção, transferência. | Não |
| `em_uso` | Alocada a contrato/motorista activo. | Sim |
| `reservada` | Comprometida com reserva futura (rent-a-car). | Não |
| `em_recolha` | Em processo físico de recolha do cliente. Intermédio. | Sim (a sair) |
| `manutencao` | Em reparação, manutenção, inspecção (ticket de assistência aberto). | Não |
| `inativo` | Avariada/imobilizada sem previsão. Saída temporária do parque. | Não |
| `vendida` | Saída definitiva. Não voltam a ver-se em listas. Tem flag `is_vendida = true`. | Não |

**Outras flags relevantes:**

- `viaturas.is_vendida boolean` — congela linha sem perder histórico.
- `viaturas.estacao_id uuid` — onde está fisicamente.
- `viaturas.km_atual integer` — fonte de verdade do KM.

## 2. Transições actuais (quem dispara)

| De | Para | Disparador | Local |
|---|---|---|---|
| qualquer | `em_uso` | `ContratoEntregaStep.handleConfirm` (criar contrato + alocar viatura) | [src/components/calendario/ContratoEntregaStep.tsx:159](../../src/components/calendario/ContratoEntregaStep.tsx#L159) |
| `em_uso` | `em_recolha` | `RecolhaCheckinStep` (passo "fazer depois") | [src/components/calendario/RecolhaCheckinStep.tsx:110](../../src/components/calendario/RecolhaCheckinStep.tsx#L110) |
| `em_recolha` ou `em_uso` | `disponivel` | `RecolhaCheckinStep` (concluir) ou `movimento_sync_viatura` ao concluir movimento | [supabase/migrations/20260520000001_create_movimentos.sql:166](../../supabase/migrations/20260520000001_create_movimentos.sql#L166) |
| qualquer | `manutencao` | Abrir ticket de assistência aceite, ou `movimento_sync_viatura` em `reparacao/manutencao/inspecao` a decorrer | [supabase/migrations/20260520000001_create_movimentos.sql:161](../../supabase/migrations/20260520000001_create_movimentos.sql#L161) |
| qualquer | `inativo` | `movimento_sync_viatura` em `impro` a decorrer | [supabase/migrations/20260520000001_create_movimentos.sql:160](../../supabase/migrations/20260520000001_create_movimentos.sql#L160) |
| `manutencao` ou `inativo` | `disponivel` | Concluir ticket de assistência / concluir/cancelar movimento | mesmas refs |
| qualquer | `vendida` | Marcar viatura como vendida (UI admin) | — |

## 3. Regras invioláveis

1. **Uma viatura tem um e um só estado.** Conflito → o componente que faz UPDATE valida; em caso de race, último write vence (não há lock pessimista).
2. **Estado deriva sempre de uma entidade origem** (contrato activo, ticket de assistência, movimento). Não há transição sem evento que a justifique.
3. **Status `vendida` é terminal.** Não há transição de volta. Para "reabrir", criar nova viatura.
4. **Status `em_uso` implica `motorista_viaturas.status='ativo'`** para esta viatura. Se um falhar, o outro tem de falhar — preferencialmente numa transacção/RPC.
5. **`km_atual` só aumenta.** Triggers comparam antes de atualizar (já implementado em `movimento_sync_viatura`).

## 4. Calendário é leitor

A partir da Fase 2, `calendario_eventos` deixa de ser escrito pela UI. As inserções vêm:

- da criação de contrato (gera evento `entrega` na `data_inicio` e `recolha` na `data_fim`),
- da criação de movimento (gera evento `manutencao`/`reparacao`/`transferencia`),
- de regras recorrentes da viatura (inspecção em `data_proxima_inspecao`, etc.).

Implementação: triggers SQL ou hooks aplicacionais consistentes (decisão na Fase 2). **A tabela `calendario_eventos` continua a existir** como cache temporal — apenas o canal de escrita muda.

## 5. Implicações para módulos comerciais

Estes estados são **transversais** — não dependem de o cliente ter `aluguer`, `tvde` ou ambos activos. Numa org só-TVDE:

- `em_uso` significa viatura alocada a motorista TVDE.
- `reservada` provavelmente não é usada (não há reservas no fluxo TVDE).
- `manutencao` continua a fazer sentido se a org tiver módulo `assistencia`.

Não há intenção de criar estados específicos por módulo. Se aparecer essa pressão, **discutir antes** — provavelmente a solução é uma **sub-tipagem** (`em_uso_tvde`, `em_uso_renting`) só se o domínio exigir distinção, não para UI.

## 6. Aberto para a Fase 2

- [ ] Substituir UPDATEs manuais espalhados por RPC `viatura_transicao(viatura_id, novo_estado, origem_tipo, origem_id)` que valida transição + escreve audit.
- [ ] Adicionar tabela `viatura_estado_historico` para audit (quem mudou, quando, porquê).
- [ ] Decidir geração de eventos do calendário (trigger SQL vs hook aplicacional).

---

_Última actualização: 2026-05-25 · Fase 1 (Fundações invisíveis)_
