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

## 4b. Triggers AFTER UPDATE — invariante de coexistência

Há **três triggers AFTER UPDATE** em `contratos_renting` que tocam no calendário e/ou na
reserva. O PostgreSQL corre triggers do mesmo nível por **ordem alfabética do nome**, logo:

1. `trg_contrato_renting_cascata_estado` — sincroniza reserva + apaga eventos
2. `trg_contrato_renting_cascata_realizacao` — marca evento `realizado_em`/`realizado_por_id`
3. `trg_contrato_renting_cascata_versao` — cria evento `troca`/`upgrade` ao mudar viatura numa versão

**Invariante (porque não se contradizem):** cada um só age em condições **mutuamente
exclusivas** dentro de uma mesma transição:

- **cancelamento** (`→ cancelado`): `cascata_estado` apaga os eventos. `cascata_realizacao` não age (não é entrega/devolução). `cascata_versao` não age (`viatura_id` não muda).
- **devolução** (`em_curso → devolvido`): `cascata_estado` **mantém** os eventos (só cancelamento apaga — ver migration `20260521000006`). `cascata_realizacao` marca a `recolha` como realizada. `cascata_versao` não age.
- **entrega** (`agendado → em_curso`): `cascata_realizacao` marca a `entrega`. Os outros não agem.
- **nova versão** (UPDATE de `viatura_id` numa linha com `contrato_anterior_id`): `cascata_versao` cria `troca`/`upgrade` + recolha nova. `estado_operacional` não muda nesse UPDATE, logo `cascata_estado`/`cascata_realizacao` não agem.

**Cuidado ao mexer:** se algum dia um único UPDATE alterar **ao mesmo tempo** `estado_operacional`
**e** `viatura_id`, dois destes triggers correm na mesma transição e a ordem alfabética passa a
importar (ex.: `cascata_estado` apaga eventos que `cascata_versao` acabou de criar, ou vice-versa).
A UI actual nunca faz isso — mas SQL livre permite. Se for preciso, consolidar num único trigger
ou tornar a ordem explícita.

---

## 5. Implicações para módulos comerciais

Estes estados são **transversais** ao regime do contrato (`rent_a_car` ou `tvde`). Não há intenção de criar estados específicos por regime — a única diferença é o cálculo financeiro (cobrança única vs. semanal) e a UI que apresenta diferentes campos. A máquina de estados é a mesma.

Se aparecer pressão para criar estados específicos (`tvde_em_partilha`, `aluguer_diaria`, etc.), **discutir antes** — provavelmente o domínio quer uma sub-tipagem (estado + flag), não estados extra.

---

## 6. Itens em aberto

- [x] ~~**Handler de entrega física** (`agendado → em_curso`)~~ — feito via fluxo de realização por QR ([RealizarEntregaPage](../../src/pages/renting/RealizarEntregaPage.tsx)) e via Check Out drawer. A mudança de estado dispara `trg_contrato_renting_cascata_realizacao` que marca o evento `entrega`.
- [x] ~~**Handler de recolha física** (`em_curso → devolvido`)~~ — mesmo fluxo, marca o evento `recolha`. Fotos/km/combustível registados em `contrato_media` (via `contrato_renting_id`).
- [x] ~~**Cascata inversa em cancelamento**~~ — implementada em [migration 20260520400001](../../supabase/migrations/20260520400001_contrato_renting_cascata_estado.sql).
- [ ] **Integração Primavera** para passagem `pendente → facturado` automática. ATENÇÃO: a imutabilidade fiscal actual (`trg_contratos_imutabilidade_facturados`) ainda **não cobre** `viatura_id`/`cliente_id`/`data_inicio`/`data_fim`/`regime` — alargar antes de ligar a Primavera.
- [ ] **Renomear `contratos_renting` → `contratos`** quando o fluxo legacy (`contratos` tabela antiga via `gerar_contrato_atomico`) for descontinuado. O nome histórico "renting" é confuso porque a tabela suporta ambos os regimes (`rent_a_car` e `tvde`). Documentado via `COMMENT ON TABLE` em produção.

---

_Última actualização: 2026-05-28 · realização por QR + invariante de triggers_
