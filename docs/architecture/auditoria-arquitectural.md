# Auditoria Arquitectural — WeGest

> Snapshot estático do código em `Movimentacoes @ 52911be`.
> Não verificado em runtime contra a base de dados em produção.
> Foco: dívida estrutural que rasga em features futuras ou no
> onboarding de clientes SaaS. Estilo, formatação e nitpicks não
> entram aqui.

---

## Resumo executivo

- **Identidade `empresas` ↔ `organizacoes` ainda não foi colapsada.** A tabela legacy `empresas` (TEXT id, 2 linhas) continua a ser o eixo do gerador de PDF de contratos, do template editor e do dialog de geração de documentos. A coluna `org_id` em `empresas` foi adicionada por backfill manual ([20260520900001](../../supabase/migrations/20260520900001_backfill_empresas_org_id.sql)) com mapeamento hardcoded de 2 códigos. Onboarding de uma 4ª org parte sem template e sem entrada em `empresas` — o fluxo de PDF rebenta.
- **Módulos SaaS são aspiracionais.** O hook `useModules` está em modo fail-open porque a tabela `organizacao_modulos` **não existe** (nenhuma migration cria). Nenhuma rota declara `requiredModule=`. O catálogo está documentado em `src/types/modulo.ts` mas não tem enforcement em RLS, UI ou hooks.
- **`document_templates` colapsa 5 tipos diferentes em `tipo='contrato_tvde'`.** O hack actual em [generateContratoPdf.ts:54-55](../../src/utils/generateContratoPdf.ts) usa `ilike 'Contrato TVDE%'` para distinguir o template de contrato dos templates de IBAN, Procedimentos, etc.
- **Onboarding de nova org não é provisioning completo.** A edge function `register-org` cria org + admin + cargo + permissões. Não cria: entrada em `empresas`, `document_templates` semente, `organizacao_modulos`, `estacoes`, `viatura_tipos`. Cliente SaaS novo entra sem capacidade de emitir contratos.
- **Sistema funciona, e há boas surpresas.** A cascata SQL de contratos (3 triggers principais + imutabilidade) é coerente. O `rls_org_isolation` aplica-se automaticamente a todas as tabelas com `org_id` via `DO $$ ... $$`. O versionamento de contratos é bem feito (RPC + snapshot + UNIQUE parcial).

---

## Matriz de priorização

| Item | Severidade | Custo | Gatilho |
|---|---|---|---|
| 1. Identidade `empresas` ↔ `organizacoes` | Alta | 3–5d | Antes do 4º cliente SaaS pago |
| 2. Taxonomia `document_templates.tipo` | Média | 1–2d | Antes de adicionar 6º tipo de template |
| 12. Módulos SaaS sem enforcement | Alta | 2–3d | Antes do 1º cliente SaaS que **não compra TVDE** |
| 15. Onboarding incompleto | Alta | 2–3d | Antes do 4º cliente SaaS pago (junto com #1) |
| 8. `generateDocumentFromTemplate` 800 linhas | Média | 3–5d | Quando aparecer 2º domínio de template (factura) |
| 9. `calendario_eventos` semântica por `tipo` | Média | 1d (documentar) / 4d (refactor) | Antes de migrar para calendário read-only completo |
| 4. Schema drift / migrations duplicadas | Média | 1d | Quando rebentar deploy num ambiente fresco |
| 13. Hooks `useReserva*` ↔ `useContrato*` | Baixa | 2d | Apenas refactor oportunístico |
| 14. Imutabilidade fiscal — gaps | Média | 1d | Antes de integração Primavera |
| 11. Versionamento — extensão a reservas/movimentos | Baixa | — | Não pagar até pedido legal/auditoria concreto |
| 3. Tipo `Motorista` re-exportado por página | Baixa | 0.5d | Refactor oportunístico |
| 10. Convenções PT/EN | Baixa | 0.5d | Quando se editar `contrato.ts` legacy |
| 5. Cascata triggers — ordem e contradições | Baixa | 0.5d (documentar) | Imediato (já parcialmente coberto em `contrato-estados.md`) |
| 6. RLS `org_isolation` | Baixa | — | Não há dívida significativa |
| 7. State machines | Baixa | — | Não há dívida significativa |

---

## Áreas auditadas

### 1. Identidade `empresas` ↔ `organizacoes`

**Estado actual:**

Existem duas hierarquias paralelas:

- `organizacoes` (UUID id, codigo TEXT UNIQUE) — eixo multi-tenant moderno. Criada em [20260513100001_create_organizacoes.sql](../../supabase/migrations/20260513100001_create_organizacoes.sql).
- `empresas` (TEXT id, 2 linhas: `'decada_ousada'`, `'distancia_arrojada'`) — criada em [20260514200001_create_empresas_table.sql](../../supabase/migrations/20260514200001_create_empresas_table.sql) para sustentar o gerador de PDF de contratos TVDE. Tem `nome_completo`, `nif`, `sede`, `licenca_tvde`, `representante`, `papel_timbrado` — tudo dados fiscais que `organizacoes` não armazena.

`empresas.org_id` foi adicionado tarde e populado por backfill manual com mapeamento hardcoded de 2 códigos (`decada` e `distancia`). 15 ficheiros em `src/` continuam a usar `empresa_id` como chave primária de fluxo (templates, geração de PDF, dialog de documentos).

Há ainda uma camada extra em `src/config/empresas.ts` — um objecto literal hardcoded com `EMPRESAS = { decada_ousada, distancia_arrojada }` que serve de fallback quando a query à BD falha (ver [useEmpresas.ts:23](../../src/hooks/useEmpresas.ts)).

**O que é dívida:**

Para uma nova org SaaS gerar contratos, é preciso (a) criar uma linha em `empresas` com o ID que ela escolheu, (b) ligar `empresas.org_id` para a `organizacoes.id` correspondente, (c) criar pelo menos um `document_template` com `empresa_id` igual ao ID inventado. Nada disto está automatizado. O ID em `empresas` é TEXT escolhido manualmente — colide num produto multi-tenant.

**Impacto:**

- Cliente SaaS novo não consegue emitir o primeiro contrato sem intervenção SQL.
- Os campos fiscais (`nif`, `licenca_tvde`, `sede`, `representante`) deviam viver em `organizacoes` — actualmente `organizacoes.nif` existe mas é apenas para registo administrativo, não para placeholders de templates.
- O hardcoded em `src/config/empresas.ts` não escala — sempre que aparecer org nova, é commit.
- Bloqueia decisão de "uma org = uma empresa" vs "uma org = várias empresas" (relevante se um grupo tiver duas sociedades).

**Severidade:** Alta
**Custo:** 3–5 dias (migrar campos fiscais para `organizacoes`, deprecar `empresas`, refactor de gerador de PDF e templates para usar `org_id`).
**Recomendação:** Antes do 4º cliente. Decidir se `organizacoes` cresce com campos fiscais ou se `empresas` vira tabela 1:N por org (suportar "Grupo Tal" com várias sociedades).

---

### 2. Taxonomia de `document_templates`

**Estado actual:**

`document_templates.tipo` é declarado `TEXT NOT NULL DEFAULT 'contrato_tvde'` em [20251118172455](../../supabase/migrations/20251118172455_62b00031-bb2e-4201-a75a-9a72f4c9eb9c.sql). Sem CHECK constraint. Na prática há 5 templates por empresa, todos com `tipo='contrato_tvde'`, distinguidos por prefixo do nome (`Contrato TVDE - X`, `IBAN - X`, `Procedimentos - X`, etc.). [generateContratoPdf.ts:54-55](../../src/utils/generateContratoPdf.ts) faz `.in('tipo', ['contrato_tvde', 'contrato']).ilike('nome', 'Contrato TVDE%')` para isolar o template certo.

[GenerateDocumentsDialog.tsx:266-269](../../src/components/motoristas/GenerateDocumentsDialog.tsx) repete o padrão: filtra `tipo === 'contrato_tvde' || tipo === 'contrato'` para distinguir contratos de outros documentos.

**O que é dívida:**

Tipo é catch-all com convenção tácita no `nome`. Adicionar um 6º tipo de template ("Termo de Responsabilidade", "Vistoria de Entrega") exige editar o filtro em 3 sítios e esperar que ninguém crie templates com nomes ambíguos.

**Impacto:**

- Bug silencioso se um admin nomear template `Contrato TVDE - Anexo Z` — o regex apanha-o como template principal e o PDF do contrato sai com conteúdo errado.
- UI de templates não tem onde categorizar — vai escalar mal.

**Severidade:** Média
**Custo:** 1–2 dias (criar enum `document_template_tipo` com `contrato_renting | contrato_tvde | iban | procedimentos | termo_responsabilidade | outro`, backfill por nome, ajustar 3 callsites).
**Recomendação:** Antes do 6º tipo de template ou quando aparecer fluxo de vistoria/termo de responsabilidade.

---

### 3. Tipo `Motorista` duplicado (re-export)

**Estado actual:**

Verificado: não há dois tipos distintos. [src/pages/Motoristas.tsx:32-33](../../src/pages/Motoristas.tsx) faz `import type { Motorista } from '@/types/motorista'; export type { Motorista };`. 13 ficheiros importam de `@/pages/Motoristas`, 5 ficheiros importam directamente de `@/types/motorista`. É inconsistência de import path, não duplicação de definição.

**O que é dívida:**

Acoplamento desnecessário a um path de página. Se a rota mudar de nome (`/motoristas` → `/condutores`) é trabalho de import-rename em 13 ficheiros sem motivo de domínio.

**Impacto:** Baixo. Não rebenta nada.

**Severidade:** Baixa
**Custo:** 0.5 dia (search-replace em 13 imports + remover o `export type` da página).
**Recomendação:** Refactor oportunístico — fazer junto com qualquer trabalho que toque em `MotoristaCard`/`MotoristaDialog`.

---

### 4. Schema drift `types.ts` ↔ migrations

**Estado actual:**

Inspeccionados:

- `contrato_condutores.motorista_id` em [types.ts:1921, 1936, 1951](../../src/integrations/supabase/types.ts) **está sincronizado** com a migration [20260520800001_condutores_bifurcacao_motorista.sql](../../supabase/migrations/20260520800001_condutores_bifurcacao_motorista.sql) — sem drift aqui.
- Há **migrations duplicadas** com nomes idênticos em pastas diferentes:
  - `20260519000040_create_contrato_condutores.sql` (linhas 1–95) vs `20260520000002_create_contrato_condutores.sql` (linhas 1–126). Conteúdo divergente — a 20000002 tem coluna `vigencia` e `data_inicio`/`data_fim`, a 19000040 não.
  - `20260519200001_create_renting_grupos.sql` vs `20260519200006_extend_renting_grupos.sql` (relacionado mas não duplicado).
  - `20260520000001_create_contrato_coberturas.sql` (sub-nome distinto).
- A tabela `organizacao_modulos` é usada em [useModules.ts](../../src/hooks/useModules.ts) com `(supabase as any).from('organizacao_modulos')` mas **não existe migration** que a crie. O hook trata 42P01 como fail-open.
- `motorista_id` em `calendario_eventos` aparece em [types.ts:1171](../../src/integrations/supabase/types.ts) mas as cascatas SQL ([20260520300002](../../supabase/migrations/20260520300002_calendario_origem_e_movimentos.sql)) não preenchem este campo. Coluna existe e está autenticada na DB, mas não tem semântica clara no fluxo novo.

**O que é dívida:**

Migrations duplicadas significam que reproduzir uma BD fresca **não dá o mesmo resultado** que a BD actual. A duplicação de `create_contrato_condutores` aplica DDL conflitantes em sequência — só funciona porque a 2ª usa `IF NOT EXISTS`. A ausência de migration para `organizacao_modulos` significa que num deploy limpo, o hook arranca em fail-open permanente (todos os módulos contam como activos sem que ninguém os tenha activado).

**Impacto:**

- Não é possível pôr um cliente SaaS num cluster Supabase separado correndo só as migrations — a BD não fica funcional.
- `organizacao_modulos` não dá feature flags reais hoje.

**Severidade:** Média
**Custo:** 1 dia (consolidar as 2 migrations de `contrato_condutores`, criar a migration formal de `organizacao_modulos` com semente para as 3 orgs existentes).
**Recomendação:** Antes do próximo deploy num ambiente diferente do actual (staging novo, cliente self-hosted).

---

### 5. Cascata de triggers em `contratos_renting`

**Estado actual:**

Inventário completo dos triggers (em `contratos_renting`):

| Ordem | Trigger | Quando | Acção |
|---|---|---|---|
| BEFORE INSERT/UPDATE | `trg_contratos_renting_validar_reserva` | sempre | Garante que `reserva_id` aponta para reserva válida e não atribuída |
| BEFORE UPDATE | `trg_contratos_renting_freeze` | UPDATE de coberturas | Congela snapshot dos totais quando `facturado` |
| BEFORE UPDATE | `trg_contratos_imutabilidade_facturados` | UPDATE de 9 colunas | Bloqueia mudanças financeiras quando `facturado` |
| BEFORE UPDATE | `trg_contratos_renting_versao_imutavel` | UPDATE geral | Bloqueia edição de versões `substituido_em IS NOT NULL` |
| AFTER INSERT | `trg_contrato_renting_cascata_open` | INSERT | Avança reserva→em_curso + cria 2 eventos no calendário |
| AFTER UPDATE OF estado_operacional | `trg_contrato_renting_cascata_estado` | mudança de estado | Cascata inversa: reserva + apaga eventos |
| AFTER UPDATE | `trg_contrato_renting_cascata_versao` | UPDATE geral | Cascata de versionamento → calendário (troca/upgrade) |
| AFTER INSERT/UPDATE/DELETE | `trg_contratos_renting_audit` | sempre | Log em `contratos_edicoes` |
| AFTER (em `viaturas`/`reservas` espelho) | `trg_contratos_disponibilidade` | mudança de `estado_operacional`, `viatura_id`, `deleted_at` | Recalcula `viaturas.status` |

**O que é dívida:**

A ordem entre triggers AFTER UPDATE não é determinística no PostgreSQL — corre por ordem alfabética. Há **3 triggers AFTER UPDATE concorrentes** (`cascata_estado`, `cascata_versao`, `audit`) que tocam em tabelas relacionadas. Hoje não há contradição porque cada um só age em condições mutuamente exclusivas (versão substituída vs mudança de estado operacional vs sempre), mas isso é convenção tácita — não está documentado nem testado.

Caso concreto observável: se uma versão nova de contrato muda `viatura_id` **e** `estado_operacional` num único UPDATE (não acontece hoje no fluxo da UI, mas SQL livre permite), `cascata_versao` cria evento `troca`, `cascata_estado` apaga eventos derivados. Dependendo da ordem, ficamos com calendário sem `troca` ou com `troca` órfã.

**Impacto:**

- Hoje: nenhum, porque a UI faz UPDATEs limitados.
- Futuro: bug subtil quando aparecer fluxo automatizado (handler de entrega/recolha referido em [contrato-estados.md:125](contrato-estados.md)).

**Severidade:** Baixa (latente)
**Custo:** 0.5 dia (documentar invariante "cascata_estado e cascata_versao não se sobrepõem porque X" no doc de estados; opcionalmente consolidar num único trigger).
**Recomendação:** Documentar antes de implementar o handler de entrega/recolha automatizado.

---

### 6. RLS `org_isolation`

**Estado actual:**

[20260520000006_rls_org_isolation.sql](../../supabase/migrations/20260520000006_rls_org_isolation.sql) aplica uma policy RESTRICTIVE `rls_org_isolation` automaticamente a **todas as tabelas com coluna `org_id`** via `DO $$ ... $$`. Excluídas explicitamente: `user_org_ativa`, `user_organizacoes`, `convites`, `profiles`. Política: `USING (org_id = get_current_org_id())` + `WITH CHECK (org_id IS NULL OR org_id = get_current_org_id())`.

Tabelas com `org_id` enumeradas em [20260513100003_add_org_id_to_all_tables.sql](../../supabase/migrations/20260513100003_add_org_id_to_all_tables.sql) são 60+. Como o DO block do isolamento corre **a posteriori** sobre `information_schema.columns`, qualquer tabela nova com `org_id` está coberta automaticamente desde que tenha sido criada antes da última execução do bloco.

**O que é dívida:**

Hoje, a migration do isolamento é one-shot. Tabelas criadas **depois** dela (eg. `renting_grupos`, `contrato_coberturas`, `movimentos`) só ficam isoladas se a migration for re-executada ou se cada uma das suas migrations replicar o bloco. Verificação rápida: `20260519200001_create_renting_grupos.sql` cria a tabela mas não vi confirmação de que tem a policy `rls_org_isolation`.

Não verificado em runtime se as policies foram aplicadas a todas as tabelas pós-migration.

**Impacto:**

- Risco baixo no estado actual (1 dono, 3 orgs com cargo `admin` cruzando).
- Em SaaS público com tabelas novas via migrations futuras, qualquer tabela nova com `org_id` esquece a policy → leakage cross-org.

**Severidade:** Baixa (depende de re-execução manual)
**Custo:** —
**Recomendação:** Em produção, correr o DO block periodicamente ou criar trigger DDL que adicione `rls_org_isolation` automaticamente em `CREATE TABLE`. Em alternativa, adicionar checklist obrigatório no AGENTS.md para tabelas com `org_id`.

---

### 7. State machines de `contratos_renting`

**Estado actual:**

`estado_operacional` (`agendado | em_curso | devolvido | cancelado`) e `estado_financeiro` (`pendente | facturado | pago | anulado`). Transições documentadas em [contrato-estados.md](contrato-estados.md). UI de transição em [ContratoEstadoActions.tsx](../../src/components/renting/contratos/ContratoEstadoActions.tsx) com:

- `entrega`: `agendado → em_curso`
- `devolucao`: `em_curso → devolvido`
- `cancelar`: `agendado | em_curso → cancelado`

`devolvido → ?` e `cancelado → ?` não estão disponíveis na UI — terminais. Triggers SQL aceitam qualquer transição (não há CHECK explícito). UI esconde acções se `estado_financeiro = facturado`.

**O que é dívida:**

Pequena: não há enforcement SQL das transições. Um update directo `UPDATE contratos_renting SET estado_operacional = 'agendado' WHERE id = ... AND estado_operacional = 'devolvido'` passa. A UI é o único guardião — em mobile/integração isto pode escapar.

**Impacto:** Baixo (só admin/RPC chega a UPDATEs livres).

**Severidade:** Baixa
**Custo:** —
**Recomendação:** Não pagar. O guardião da imutabilidade fiscal (estado_financeiro) é a única peça crítica e já está coberta.

---

### 8. PDF / `generateDocumentFromTemplate`

**Estado actual:**

[generateDocumentFromTemplate.ts](../../src/utils/generateDocumentFromTemplate.ts) tem 795 linhas. Centrado em `motoristaData: Record<string, any>` + `documentData: Record<string, any>`. [generateContratoPdf.ts](../../src/utils/generateContratoPdf.ts) (144 linhas) mapeia condutor principal (cliente OU motorista) para a forma esperada pela função antiga — comentário no código admite "HACK pragmático".

A função usa `Record<string, any>` extensivamente (motoristaData, documentData, empresaData aninhado). Lê templates da BD por ID, parse de placeholders `{{motorista_nome}}` etc., trata papel timbrado, paginação, ano com 5 dígitos. Suporta `print | download | skipOutput`.

**O que é dívida:**

- 800 linhas num único ficheiro com lógica de parsing + render + storage + filename.
- Tipagem `any` impossibilita refactor seguro — qualquer nova placeholder rebenta silenciosamente (placeholder não substituído fica como `{{xpto}}` no PDF).
- A função foi feita para motoristas TVDE. Cada novo domínio (factura, recibo, vistoria) vai precisar do mesmo padrão de adaptação que `generateContratoPdf.ts` faz.
- Ausência de testes — o único feedback é visual no PDF gerado.

**Impacto:**

- Adicionar 2º domínio (factura) vai duplicar o adaptador ou cresce esta função para 1500 linhas.
- Onboarding SaaS depende disto: cada org precisa dos seus templates e cada template tem que conhecer os mesmos placeholders.

**Severidade:** Média
**Custo:** 3–5 dias (extrair render de placeholders para função pura tipada, dividir em `parseTemplate`, `renderPdf`, `uploadPdf`; substituir `any` por tipos discriminados).
**Recomendação:** Quando aparecer 2º domínio (factura/recibo) ou quando o gerador for adaptado para outra org com placeholders próprios.

---

### 9. `calendario_eventos` — semântica híbrida

**Estado actual:**

Tabela criada em [20260209161546](../../supabase/migrations/20260209161546_f98277ac-6fe5-417b-b2eb-d428665100c2.sql) com `tipo IN ('tarefa','reuniao','afazer','outro')`. Constraint foi alterada 3 vezes:

- [20260209173829](../../supabase/migrations/20260209173829_2e9aa3c3-23a6-418e-b47a-1a67796e17da.sql) → `('entrega','recolha','devolucao','troca','upgrade')`
- [20260512000001](../../supabase/migrations/20260512000001_add_lista_espera_tipo.sql) → adiciona `'lista_espera'`
- Triggers actuais geram também `'transferencia'`, `'reparacao'`, `'manutencao'`, `'inspecao'`, `'impro'` (ver [movimento_calendario_sync](../../supabase/migrations/20260520300002_calendario_origem_e_movimentos.sql)). **Estes tipos não estão na CHECK constraint actual** — não verificado em runtime mas isto seria um INSERT a falhar.

Colunas com significado dependente do `tipo`:
- `matricula_devolver`: usado em entrega/recolha como matrícula da viatura entregue/recolhida. Em troca/upgrade serve como matrícula da viatura **antiga**. Em manutencao/inspecao é a viatura em serviço.
- `motorista_id`: legacy de eventos manuais TVDE ([20260414150000](../../supabase/migrations/20260414150000_add_motorista_to_calendario.sql)). Triggers novos não preenchem.
- `cidade`: preenchida em troca/upgrade (cidade da estação), `NULL` em entrega/recolha geradas pela cascata_open.
- `origem_tipo + origem_id`: chave estrangeira lógica (não enforçada) para `contrato_renting` ou `movimento`. `NULL` para eventos manuais legacy.

**O que é dívida:**

- A CHECK constraint está desalinhada com os tipos que os triggers tentam inserir. Não verificado se o INSERT está a passar (talvez por o trigger correr em SECURITY DEFINER e a constraint estar desactivada, ou simplesmente porque o constraint na DB já foi actualizado fora de migration). Suspeito de drift entre migration e BD real.
- Significado por coluna depende do `tipo` — overload semântico clássico. Sem enum tipado nem documento de mapping.
- `motorista_id` é dead code para cascatas mas continua acessível pela UI legacy.

**Impacto:**

- Bug latente: novo cliente SaaS faz `psql` para migrar e o trigger rebenta por CHECK violation.
- Quando o calendário virar read-only completo (planeado em memory), perceber semântica por tipo é obrigatório.

**Severidade:** Média
**Custo:** 1 dia documentar / 4 dias refactor estrutural
**Recomendação:** Primeiro passo: actualizar a CHECK constraint com todos os tipos efectivamente usados pelas cascatas. Segundo: documentar em [calendario-tipos.md](./) o mapping tipo×coluna×origem. Refactor estrutural só vale quando o calendário virar read-only oficial.

---

### 10. Convenções PT/EN

**Estado actual:**

Domínio é maioritariamente PT-PT, alinhado com AGENTS.md. Encontrei estes mistos:

- [src/types/contrato.ts:17](../../src/types/contrato.ts) usa `status: string` num tipo PT-PT (tabela `contratos` legacy). O fluxo novo (`contratos_renting`) usa `estado_operacional` + `estado_financeiro`. Mistura **estado** com **status** consoante a tabela.
- `viaturas.status` é a coluna na BD ([recalcular_disponibilidade_viatura](../../supabase/migrations/20260520300002_calendario_origem_e_movimentos.sql) usa `viaturas.status`). PT-PT diria `estado`. Está cravado fundo (60+ ficheiros usam-no).
- `motoristas.status_ativo` (snake_case, mix `status` + `ativo`) em [src/types/motorista.ts:30](../../src/types/motorista.ts).
- Funções RPC em `gerarContratoAtomico` ([useContratos.ts](../../src/hooks/useContratos.ts)) usam `p_xxx` prefix em snake_case PT-PT — consistente internamente.

Não encontrei `vehicle_id`, `driver_id` no domínio core (só em integrações externas — `bolt_*`, `uber_*` — onde o naming sai da API original).

**O que é dívida:**

- `status` vs `estado` é o único mix significativo. Mudar `viaturas.status` para `viaturas.estado` é trabalho de migration + 60 callsites.
- `contratos.status` (tabela legacy) deveria desaparecer com a renomeação `contratos_renting → contratos` referida em [contrato-estados.md:129](contrato-estados.md).

**Impacto:** Confunde devs novos. Não rebenta features.

**Severidade:** Baixa
**Custo:** 0.5 dia (junto com renomeação contratos_renting → contratos)
**Recomendação:** Não pagar isoladamente. Fazer junto com o cleanup planeado de `contratos_renting → contratos`.

---

### 11. Versionamento

**Estado actual:**

Implementado em `contratos_renting` via [20260521000001_contratos_renting_versionamento.sql](../../supabase/migrations/20260521000001_contratos_renting_versionamento.sql):

- 4 colunas: `versao`, `contrato_anterior_id`, `substituido_em`, `motivo_versao`.
- UNIQUE parcial em `reserva_id` filtrado por `substituido_em IS NULL`.
- Trigger `trg_contratos_renting_versao_imutavel` bloqueia edição.
- RPC `criar_versao_contrato_renting(uuid, text)` clona linha + relações m:n.
- Cascata para calendário em [20260521000004](../../supabase/migrations/20260521000004_cascata_versao_calendario.sql).

`reservas`, `movimentos`, `clientes`, `motoristas` não têm versionamento.

**O que é dívida:**

Nenhuma actualmente — o versionamento existe onde fiscalmente importa (contrato). Se aparecer pressão para versionar reservas (modificações da reserva pelo cliente final), o padrão está estabelecido.

**Impacto:** Nenhum hoje.

**Severidade:** Baixa
**Custo:** —
**Recomendação:** Não pagar antes de pedido concreto (auditoria fiscal ou cliente B2B com requisitos).

---

### 12. Módulos SaaS

**Estado actual:**

Catálogo declarado em [src/types/modulo.ts](../../src/types/modulo.ts): `'aluguer' | 'tvde' | 'assistencia' | 'frota'`. Hook [useModules.ts](../../src/hooks/useModules.ts) lê de `organizacao_modulos` mas trata 42P01 como fail-open ("todos os módulos contam como activos"). [ProtectedRoute.tsx:131-152](../../src/components/auth/ProtectedRoute.tsx) suporta `requiredModule={...}` mas **nenhuma rota usa este prop** (procura por `requiredModule=` em `src/` devolve 0 matches).

Não existe migration que crie `organizacao_modulos`. Não há UI de admin para activar/desactivar módulos por org.

`useLabel` em [src/hooks/useLabel.ts](../../src/hooks/useLabel.ts) usa `activos` para escolher rótulos por módulo — single uso real.

**O que é dívida:**

Sistema aspiracional inteiro. RLS não respeita módulos. Não há gates em queries, hooks ou rotas. Cliente SaaS que não comprar TVDE pode aceder à rota `/motoristas` e ver tudo.

**Impacto:**

- Bloqueador comercial real assim que aparecer primeiro cliente que **não** quer TVDE (eg. rent-a-car puro). O cliente vê interfaces que não comprou e funcionalidades que não tem licença para.
- Impede pricing tiered por módulo.

**Severidade:** Alta
**Custo:** 2–3 dias (criar migration de `organizacao_modulos` com semente, UI admin de toggle, aplicar `requiredModule` às rotas pertinentes, decidir se aplica fail-open ou fail-closed).
**Recomendação:** Antes do 1º cliente SaaS que pede subset de módulos. Hoje, as 3 orgs internas usam todos os módulos — não há pressão.

---

### 13. Hooks duplicados

**Estado actual:**

Pares quase-idênticos (mesma forma, dados diferentes):

| Hook | Linhas | Hook par | Linhas |
|---|---|---|---|
| `useReservaCondutores.ts` | 112 | `useContratoCondutores.ts` | 114 |
| `useReservaAnexos.ts` | ~ | `useContratoAnexos.ts` | ~ |
| `useReservas.ts` | ~ | `useContratosRenting.ts` | ~ |

Comparei `useReservaCondutores` vs `useContratoCondutores` lado-a-lado: 90% de código duplicado, diferenças apenas em `reserva_id` ↔ `contrato_id` e nome da tabela. Lógica de `chaveCondutor`, `syncCondutores`, queryKey idêntica.

Outros pares (`useRentingCoberturas` vs `useContratoCoberturas`, `useRentingExtras` vs `useContratoExtras`, `useRentingTaxas` vs `useContratoTaxas`) seguem mesmo padrão: um lado é catálogo (definições por org), outro é instância (linhas concretas por contrato).

**O que é dívida:**

Bug fix em `useReservaCondutores` exige espelho manual em `useContratoCondutores`. Aconteceu já: o commit `52911be` ("persistir condutores no onSubmit") tocou só num lado.

**Impacto:** Custo de manutenção e risco de drift.

**Severidade:** Baixa
**Custo:** 2 dias (extrair hook factory `createCondutoresHook({ entityIdColumn, table })` ou padrão similar).
**Recomendação:** Refactor oportunístico. Pagar quando aparecer 3º par (eg. `useFacturaCondutores`).

---

### 14. Imutabilidade fiscal

**Estado actual:**

Dois triggers:

- `trg_contratos_imutabilidade_facturados` ([20260519000020](../../supabase/migrations/20260519000020_contratos_alinhar_reserva.sql)): bloqueia UPDATEs de 9 colunas (`tarifa_diaria`, `desconto_percentagem`, `taxa_iva`, `valor_total_manual`, `franquia_valor`, `caucao_valor`, `kms_incluidos`, `km_adicional_valor`, `estado_financeiro`) **quando OLD.estado_financeiro = 'facturado' AND NEW.estado_financeiro = 'facturado'**. Permite transição `facturado → anulado`.
- `trg_contratos_renting_versao_imutavel` ([20260521000001](../../supabase/migrations/20260521000001_contratos_renting_versionamento.sql)): bloqueia tudo em versões substituídas (`OLD.substituido_em IS NOT NULL`).

**O que é dívida:**

Gap no `imutabilidade_facturados`: não cobre `data_inicio`, `data_fim`, `viatura_id`, `cliente_id`, `regime`. Tecnicamente, um contrato **facturado mas não substituído** pode ter datas/viatura/cliente alterados. SAF-T exige imutabilidade desses campos numa factura emitida — alterar viatura num contrato já facturado destrói o vínculo fiscal.

`contratos_edicoes` (log de auditoria) captura mudanças, mas não impede.

`contrato_coberturas`, `contrato_extras`, `contrato_taxas` (relacionais) não têm triggers de imutabilidade. O snapshot dos totais via `trg_contratos_renting_freeze` calcula no momento da facturação, mas as linhas-fonte continuam mutáveis.

**Impacto:**

- Risco fiscal antes da integração Primavera (que vai fazer o `pendente → facturado` automático).
- Quando integração for activada, qualquer edição manual a um contrato facturado mas ainda não substituído desalinha a factura emitida com a BD.

**Severidade:** Média
**Custo:** 1 dia (alargar `trg_contratos_imutabilidade_facturados` para cobrir as colunas em falta + decidir política para tabelas relacionadas: bloquear DML em `contrato_coberturas` quando contrato pai facturado).
**Recomendação:** Antes da integração Primavera (referida em [contrato-estados.md:128](contrato-estados.md)).

---

### 15. Onboarding de nova org

**Estado actual:**

[supabase/functions/register-org/index.ts](../../supabase/functions/register-org/index.ts) é a edge function que cria:

1. Linha em `organizacoes` (nome, codigo, nif, morada, telefone).
2. User em `auth.users` via admin API.
3. Linha em `cargos` (`'Administrador'` para a org).
4. Update de `profiles` (org_id, cargo_id, is_admin).
5. Upsert em `user_organizacoes` (role `'owner'`).
6. Upsert em `user_org_ativa`.
7. INSERT em `cargo_permissoes` para todos os recursos.

Não cria:

- Linha em `empresas` (necessária para gerador de PDF de contratos).
- `document_templates` semente (sem template, sem PDF).
- Linha em `organizacao_modulos` (tabela nem existe).
- `estacoes` iniciais.
- `viatura_tipos`, `viatura_marcas`, `viatura_combustiveis` (cada org tem o seu catálogo — ver `add_org_id_to_viatura_tipos`).
- `renting_grupos`, `renting_tarifas`, `renting_coberturas`, `renting_extras`, `renting_taxas` (catálogos comerciais).

**O que é dívida:**

Provisioning automático é apenas 30% do que um cliente novo precisa para emitir o primeiro contrato. Os outros 70% são manuais (SQL ou UI admin com muitos passos).

**Impacto:**

- Tempo até primeiro contrato útil de um cliente novo: várias horas de SQL por engenheiro.
- Bloqueia self-service SaaS — não é viável dizer "regista a tua empresa em wegest.pt".

**Severidade:** Alta
**Custo:** 2–3 dias (estender `register-org` para criar entrada em `empresas` com `org_id = novo`, clonar templates por defeito a partir de uma org template, criar estações/catálogos básicos com dados configuráveis no form de registo).
**Recomendação:** Junto com #1 (consolidar `empresas` ↔ `organizacoes`). Antes do 4º cliente SaaS pago.

---

## Não é dívida (boas surpresas)

- **Cascata de contrato é coerente.** Os 3 triggers principais (`cascata_open`, `cascata_estado`, `cascata_versao`) cobrem o ciclo de vida completo de forma atómica. Soft-delete, versionamento e imutabilidade fiscal cooperam bem. A documentação em [contrato-estados.md](contrato-estados.md) está alinhada com o código real.
- **RLS multi-tenant via DO block.** A abordagem de aplicar `rls_org_isolation` automaticamente a tabelas com `org_id` é elegante — desde que se garanta re-execução em novas tabelas.
- **Versionamento de contratos é production-ready.** RPC bem feita, com guards anti-facturado, anti-substituido, anti-soft-deleted, multi-tenant. UNIQUE parcial em `reserva_id` resolve o overbooking de forma natural.
- **Triggers seguem o padrão SECURITY DEFINER + SET search_path = public.** Hardening contra search_path attacks aplicado consistentemente.
- **Hook `useModules` tem failure-mode pragmático.** Fail-open enquanto a migration não chega — não bloqueia produção. Comentário no código deixa o caminho de regresso claro.
- **AGENTS.md é fonte de verdade real.** Convenções aplicam-se em código novo (`contratos_renting`, hooks novos, `react-hook-form + zod`). A dívida está principalmente no código pré-AGENTS.md.
- **State machine de viatura.** Vive numa função canónica (`recalcular_disponibilidade_viatura`) chamada por trigger — sem cálculo duplicado no frontend.

---

## Próximos passos sugeridos

Por ordem de retorno por dia investido:

1. **Aplicar migration formal para `organizacao_modulos`** + ligar `requiredModule` às rotas pertinentes (1 dia). Resolve o paradoxo "temos catálogo, não temos enforcement". Permite começar a vender módulos.
2. **Estender `register-org` + colapsar `empresas` ↔ `organizacoes`** (3–5 dias, fazer em conjunto). Sem isto, o "S" do SaaS é falso. Mover campos fiscais para `organizacoes`, manter `empresas` como tabela 1:N por org se necessário (grupos com várias sociedades) ou deprecar.
3. **Taxonomia explícita em `document_templates.tipo`** + clonar templates default no onboarding (1–2 dias). Pré-requisito para self-service.
4. **Documentar semântica de `calendario_eventos` por tipo** + reconciliar CHECK constraint com tipos efectivamente usados (1 dia). Bloqueia bug latente.
5. **Alargar imutabilidade fiscal** para cobrir `data_inicio/fim/viatura_id/cliente_id/regime` quando facturado (1 dia). Antes de Primavera.

Total estimado para deixar o sistema apto a aceitar 4º cliente SaaS: **8–12 dias-dev**.

---

_Auditoria estática (Movimentacoes @ 52911be) · 2026-05-27_
