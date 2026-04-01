

## Sistema de Cobrança de Reparações em Parcelas Semanais — IMPLEMENTADO ✅

### O que foi feito

1. **Migração DB**: Adicionadas colunas `motorista_responsavel_id`, `cobrar_motorista`, `valor_a_cobrar`, `num_parcelas`, `data_inicio_cobranca` a `viatura_reparacoes`. Criada tabela `reparacao_parcelas` com RLS e indexes.

2. **ViaturaTabReparacoes.tsx**: Formulário atualizado com seleção de motorista responsável, checkbox "Cobrar ao motorista", campos de valor/parcelas/data início, preview do valor por parcela, e visualização do progresso de cobrança na lista.

3. **ContasResumoTab.tsx**: Query de parcelas pendentes por semana integrada. Valor de reparações descontado do líquido. Nova coluna "Reparações" na tabela e nos cards mobile.

4. **MotoristaResumoDialog.tsx**: Despesa "Reparações" agora mostra o valor real das parcelas da semana (antes era placeholder a 0).
