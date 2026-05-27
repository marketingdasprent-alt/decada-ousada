# Máquina de estados do contrato (renting)

> Documento de referência. Captura os **estados canónicos** de `contratos_renting`, as transições, e os **invariantes** que os triggers garantem.
>
> Espelho do que existe em [viatura-estados.md](./viatura-estados.md) e [fase-2-plano-de-acao.md](./fase-2-plano-de-acao.md).

---

## 1. Dois eixos de estado

O contrato tem **dois enums** que vivem em paralelo — um operacional, outro financeiro.

### 1.1 `estado_operacional` — ciclo de vida físico
[`contrato_estado_operacional_enum`](../../supabase/migrations/20260518000010_create_contratos_renting.sql)

| Estado | Significado | Viatura derivada |
|---|---|---|
| `agendado` | Criado, viatura ainda não entregue ao cliente | `reservada` |
| `em_curso` | Viatura entregue, contrato activo | `em_uso` |
| `devolvido` | Viatura devolvida, contrato fechado | `disponivel` (se nada mais o ocupa) |
| `cancelado` | Anulado antes de produzir efeitos | `disponivel` (se nada mais o ocupa) |

### 1.2 `estado_financeiro` — ciclo de facturação
[`contrato_estado_financeiro_enum`](../../supabase/migrations/20260518000010_create_contratos_renting.sql)

| Estado | Significado |
|---|---|
| `pendente` | Contrato existe mas ainda não foi facturado |
| `facturado` | Fatura emitida — **contrato imutável** (regra fiscal SAF-T) |
| `pago` | Fatura paga |
| `anulado` | Anulação fiscal |

Os dois eixos avançam **independentemente**. Um contrato pode estar em `em_curso + pendente`, ou `devolvido + facturado`, ou `agendado + pendente`, etc.

---

## 2. Transições válidas

### 2.1 `estado_operacional`

```
       criar
         │
         ▼
    ┌─────────┐    entrega física    ┌──────────┐    recolha    ┌───────────┐
    │ agendado├─────────────────────►│ em_curso ├──────────────►│ devolvido │
    └────┬────┘                      └─────┬────┘               └───────────┘
         │                                 │
         │                                 │
         ▼                                 ▼
    ┌────────────┐                    ┌────────────┐
    │ cancelado  │                    │ cancelado  │
    └────────────┘                    └────────────┘
```

**Disparado por:**
- `agendado` → `em_curso`: handler de **entrega** (futuro — para já não há fluxo automatizado)
- `em_curso` → `devolvido`: handler de **recolha** (futuro)
- `agendado` ou `em_curso` → `cancelado`: acção manual no UI

### 2.2 `estado_financeiro`

```
              emitir fatura          confirmar pagamento
   pendente ────────────────► facturado ────────────────► pago
        │                          │
        │                          │
        ▼                          ▼
    cancelado/                  anulado
    (eliminação)
```

**Disparado por:**
- `pendente` → `facturado`: integração futura (Primavera). Por agora, manual.
- `facturado` → `pago`: confirmação de pagamento (manual ou via integração bancária).
- `facturado` → `anulado`: nota de crédito (manual, restrito a admin).

---

## 3. Regras invioláveis (garantidas por triggers)

Listadas no schema (ver `pg_trigger` em `contratos_renting`):

| Trigger | Garante |
|---|---|
| `trg_contratos_renting_validar_reserva` ([migration 20260518000010](../../supabase/migrations/20260518000010_create_contratos_renting.sql)) | Cada contrato com `reserva_id` aponta para reserva válida, ainda não atribuída a outro contrato |
| `trg_contratos_renting_audit` ([migration 20260518000010](../../supabase/migrations/20260518000010_create_contratos_renting.sql)) | Log de auditoria em `contratos_edicoes` para qualquer alteração |
| `trg_contratos_renting_freeze` ([migration 20260519000010](../../supabase/migrations/20260519000010_contratos_totais.sql)) | Snapshot dos totais (`total_subtotal`, `total_iva`, `total_final`) é congelado quando passa a `facturado` — não pode ser alterado mesmo que coberturas/extras mudem depois |
| `trg_contratos_imutabilidade_facturados` ([migration 20260519000020](../../supabase/migrations/20260519000020_contratos_alinhar_reserva.sql)) | Quando `estado_financeiro = 'facturado'`, todos os UPDATEs de campos contratuais (datas, valores, viatura) são rejeitados |
| `trg_contratos_disponibilidade` ([código existente]) | Após mudanças de `estado_operacional`, `viatura_id` ou `deleted_at`, chama `recalcular_disponibilidade_viatura()` que sincroniza `viaturas.status` segundo a regra canónica |
| `trg_contrato_renting_cascata_open` ([migration 20260520300001](../../supabase/migrations/20260520300001_contrato_renting_cascata.sql)) | Ao **INSERT**: avança `reserva.estado='em_curso'` + cria 2 eventos no calendário (entrega/recolha) |
| `trg_contrato_renting_cascata_estado` ([migration 20260520400001](../../supabase/migrations/20260520400001_contrato_renting_cascata_estado.sql)) | Ao **UPDATE OF estado_operacional**: mapeia mudança para reserva (`cancelado` de `agendado` → `confirmada`; `cancelado` de `em_curso` → `cancelada`; `devolvido` → `concluida`) + apaga eventos derivados do calendário |

### Invariantes-chave

1. **Reserva e contrato têm a mesma viatura.** Forçado pelo `trg_contratos_renting_validar_reserva` + bloqueio UI em [ContratoForm.tsx](../../src/pages/renting/ContratoForm.tsx) + validação cruzada no `onSubmit`. Defesa em 3 camadas.
2. **Contrato facturado é imutável.** SAF-T. Para corrigir → nota de crédito (anulado) + novo contrato.
3. **Status da viatura deriva do contrato**, não o contrário. A função `recalcular_disponibilidade_viatura()` é a fonte canónica.
4. **Soft-delete preserva história.** `deleted_at IS NOT NULL` não dispara cascata de fecho — para "fechar" um contrato passa a `devolvido` ou `cancelado`.

---

## 4. Cascatas operacionais (sumário)

| Ao acontecer | A cascata faz |
|---|---|
| `INSERT contratos_renting` | reserva→`em_curso` + 2 eventos no calendário + viatura recalculada |
| `UPDATE estado_operacional` | viatura recalculada |
| `UPDATE viatura_id` | velha + nova viatura recalculadas |
| `UPDATE estado_financeiro='facturado'` | totais congelados + tabela passa a imutável |
| `UPDATE deleted_at` (soft delete) | viatura recalculada |

---

## 5. Implicações para módulos comerciais

Estes estados são **transversais** ao regime do contrato (`rent_a_car` ou `tvde`). Não há intenção de criar estados específicos por regime — a única diferença é o cálculo financeiro (cobrança única vs. semanal) e a UI que apresenta diferentes campos. A máquina de estados é a mesma.

Se aparecer pressão para criar estados específicos (`tvde_em_partilha`, `aluguer_diaria`, etc.), **discutir antes** — provavelmente o domínio quer uma sub-tipagem (estado + flag), não estados extra.

---

## 6. Itens em aberto

- [ ] **Handler de entrega física** que faz `agendado → em_curso`. Hoje a passagem só ocorre via UI manual em `ContratoForm`. Devia ser disparada por evento de calendário de tipo `entrega` quando o colaborador faz check-in.
- [ ] **Handler de recolha física** que faz `em_curso → devolvido`. Mesmo padrão.
- [x] ~~**Cascata inversa em cancelamento**~~ — implementada em [migration 20260520400001](../../supabase/migrations/20260520400001_contrato_renting_cascata_estado.sql).
- [ ] **Integração Primavera** para passagem `pendente → facturado` automática.
- [ ] **Renomear `contratos_renting` → `contratos`** quando o fluxo legacy (`contratos` tabela antiga via `gerar_contrato_atomico`) for descontinuado. O nome histórico "renting" é confuso porque a tabela suporta ambos os regimes (`rent_a_car` e `tvde`). Documentado via `COMMENT ON TABLE` em produção.

---

_Última actualização: 2026-05-26 · Fase 2d (polish)_
