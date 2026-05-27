# Smoke tests — playbook

> Playbook de verificações rápidas a correr depois de mudanças sensíveis na BD ou em fluxos de cascata. **Não substituem testes automáticos** (que ainda não existem no projecto) — são uma rede curta para apanhar regressões antes de afectarem operação.
>
> Tudo aqui é **não destrutivo** e **reversível**. Lê a secção "Reverter" antes de começar.

---

## Quando correr

| Mudança | Smoke test |
|---|---|
| Nova migration com trigger em `contratos_renting`, `reservas` ou `viaturas` | 1 + 2 + 4 |
| Nova migration com trigger em `movimentos` | 3 |
| Mudança no `ContratoForm` | 1 |
| Mudança na cascata de eventos do calendário | 1 + 3 |
| Aplicação manual de SQL via dashboard | sempre que envolver triggers ou funções com side-effects |

---

## Princípios

1. **Estado limpo antes** — captura baseline (contagens, status) para comparar deltas.
2. **Idempotente** — correr 2× não deve causar dano. Triggers com `IF NEW = OLD` guards seguem este princípio.
3. **Reversível** — todo o teste em produção deve ter como apagar/reverter o que criou. **Não usar dados reais** quando possível — criar viaturas/clientes/reservas de teste.
4. **Aborto rápido** — se algo correr mal, primeiro `ALTER TABLE ... DISABLE TRIGGER`, depois investiga. **Não tentes fixar à pressa**.

---

## Smoke test 1 — Criar contrato_renting (cascata directa)

Valida `trg_contrato_renting_cascata_open` + `trg_contratos_disponibilidade`.

### Baseline

```sql
SELECT
  (SELECT COUNT(*) FROM contratos_renting WHERE deleted_at IS NULL) AS contratos_total,
  (SELECT COUNT(*) FROM calendario_eventos WHERE origem_tipo = 'contrato_renting') AS eventos_contrato;
```

### Encontra reserva de teste

```sql
SELECT id, codigo, viatura_id, matricula, cliente_nome
FROM reservas
WHERE estado = 'confirmada'
  AND cliente_id IS NOT NULL
  AND viatura_id IS NOT NULL
  AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 3;
```

Guarda `id` e `viatura_id` da reserva escolhida.

### Acção

UI: `/renting/contratos/novo?reserva_id={ID_RESERVA}` → "Abrir Contrato".

### Validação

Substituir `{ID_RESERVA}` e `{VIATURA_ID}` pelos valores capturados acima.

```sql
SELECT 'reserva.estado' AS check, estado::text AS resultado
FROM reservas WHERE id = '{ID_RESERVA}'
UNION ALL
SELECT 'viatura.status' AS check, status::text AS resultado
FROM viaturas WHERE id = '{VIATURA_ID}'
UNION ALL
SELECT 'eventos_gerados' AS check, COUNT(*)::text AS resultado
FROM calendario_eventos
WHERE origem_tipo = 'contrato_renting'
  AND origem_id = (SELECT id FROM contratos_renting WHERE reserva_id = '{ID_RESERVA}' ORDER BY created_at DESC LIMIT 1);
```

### Resultado esperado

| check | resultado |
|---|---|
| `reserva.estado` | `em_curso` |
| `viatura.status` | `reservada` (contrato fica `agendado` por defeito) |
| `eventos_gerados` | `2` (entrega + recolha) |

### Reverter

```sql
-- Soft-delete do contrato (idempotente)
UPDATE contratos_renting SET deleted_at = NOW()
WHERE reserva_id = '{ID_RESERVA}' AND deleted_at IS NULL;

-- Reverter reserva para confirmada
UPDATE reservas SET estado = 'confirmada' WHERE id = '{ID_RESERVA}';

-- Apagar eventos derivados
DELETE FROM calendario_eventos
WHERE origem_tipo = 'contrato_renting'
  AND origem_id IN (SELECT id FROM contratos_renting WHERE reserva_id = '{ID_RESERVA}');
```

---

## Smoke test 2 — Cancelar contrato agendado (cascata inversa)

Valida `trg_contrato_renting_cascata_estado`.

### Pré-requisito

Ter um contrato `agendado` com reserva `em_curso` (resultado do smoke test 1).

### Acção

```sql
UPDATE contratos_renting
SET estado_operacional = 'cancelado'
WHERE id = '{CONTRATO_ID}';
```

### Validação

```sql
SELECT 'reserva.estado' AS check, estado::text AS resultado
FROM reservas WHERE id = (SELECT reserva_id FROM contratos_renting WHERE id = '{CONTRATO_ID}')
UNION ALL
SELECT 'viatura.status' AS check, status::text AS resultado
FROM viaturas WHERE id = (SELECT viatura_id FROM contratos_renting WHERE id = '{CONTRATO_ID}')
UNION ALL
SELECT 'eventos_residuais' AS check, COUNT(*)::text AS resultado
FROM calendario_eventos
WHERE origem_tipo = 'contrato_renting'
  AND origem_id = '{CONTRATO_ID}';
```

### Resultado esperado

| check | resultado |
|---|---|
| `reserva.estado` | `confirmada` (volta a estar disponível) |
| `viatura.status` | `reservada` (a reserva ainda a ocupa) |
| `eventos_residuais` | `0` (apagados) |

### Reverter

```sql
UPDATE contratos_renting SET estado_operacional = 'agendado'
WHERE id = '{CONTRATO_ID}';
```
*(o trigger só age na mudança `agendado→cancelado`, voltar a `agendado` não recria eventos automaticamente — terás de os recriar manualmente se precisares)*

---

## Smoke test 3 — Criar movimento (gerar evento no calendário)

Valida `trg_movimento_calendario_sync`.

### Acção

Cria movimento de teste com idempotência por `(origem_tipo, origem_id)`:

```sql
INSERT INTO movimentos (
  tipo, estado, viatura_id, matricula,
  data_partida, data_chegada,
  estacao_origem_id, estacao_destino_id,
  motivo
)
SELECT
  'transferencia', 'planeado', v.id, v.matricula,
  NOW(), NOW() + INTERVAL '2 hours',
  v.estacao_id, v.estacao_id,
  'Smoke test'
FROM viaturas v
WHERE v.matricula = '{MATRICULA_TESTE}'
LIMIT 1
RETURNING id;
```

Guarda o `id` retornado.

### Validação

```sql
SELECT tipo, titulo, data_inicio, origem_tipo, origem_id
FROM calendario_eventos
WHERE origem_tipo = 'movimento' AND origem_id = '{MOVIMENTO_ID}';
```

### Resultado esperado

Uma linha com:
- `tipo` = `transferencia`
- `titulo` começa com "Transferência —"
- `origem_tipo` = `movimento`

### Reverter

```sql
DELETE FROM calendario_eventos WHERE origem_id = '{MOVIMENTO_ID}';
DELETE FROM movimentos WHERE id = '{MOVIMENTO_ID}';
```

---

## Smoke test 4 — Concluir contrato (cascata para devolvido)

### Pré-requisito

Contrato em `em_curso`.

### Acção

```sql
UPDATE contratos_renting SET estado_operacional = 'devolvido' WHERE id = '{CONTRATO_ID}';
```

### Validação

```sql
SELECT
  (SELECT estado::text FROM reservas WHERE id = (SELECT reserva_id FROM contratos_renting WHERE id = '{CONTRATO_ID}')) AS reserva_estado,
  (SELECT status FROM viaturas WHERE id = (SELECT viatura_id FROM contratos_renting WHERE id = '{CONTRATO_ID}')) AS viatura_status,
  (SELECT COUNT(*) FROM calendario_eventos WHERE origem_tipo = 'contrato_renting' AND origem_id = '{CONTRATO_ID}') AS eventos_residuais;
```

### Resultado esperado

- `reserva_estado` = `concluida`
- `viatura_status` = `disponivel` (se nada mais ocupa)
- `eventos_residuais` = `0`

---

## Quando algo corre mal — kill switch

Se um trigger novo está a corromper dados ou bloquear operações, **desactiva imediatamente** sem perder lógica:

```sql
-- Desactivar (não apaga, só pára)
ALTER TABLE contratos_renting DISABLE TRIGGER trg_contrato_renting_cascata_open;
ALTER TABLE contratos_renting DISABLE TRIGGER trg_contrato_renting_cascata_estado;
ALTER TABLE movimentos        DISABLE TRIGGER trg_movimento_calendario_sync;

-- Reactivar quando o problema estiver resolvido
ALTER TABLE contratos_renting ENABLE TRIGGER trg_contrato_renting_cascata_open;
-- ... etc.
```

Os dados criados durante o período desactivado **não sofrem cascata**, mas a integridade base é preservada (FKs, CHECKs continuam activos).

---

## Smoke tests para fases futuras

À medida que novas cascatas chegarem, adicionar templates aqui:

- [ ] Quando o **handler automático de entrega** for implementado (`agendado → em_curso` por evento do calendário) — validar que a transição acontece e a viatura passa a `em_uso`.
- [ ] Quando o **handler automático de recolha** for implementado (`em_curso → devolvido` por evento) — validar que viatura passa a `disponivel` e cobrança final é gerada.
- [ ] Quando a **integração Primavera** estiver activa — validar que `estado_financeiro` passa a `facturado` após emissão.

---

_Última actualização: 2026-05-26 · Fase 2d (polish). Validado com a reserva #14 (Teste Decada Ousada)._
