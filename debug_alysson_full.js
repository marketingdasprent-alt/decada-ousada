import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function debugAlysson() {
  console.log("=== DIAGNÓSTICO COMPLETO: ALYSSON ===\n");

  // 1. Buscar na motoristas_ativos
  console.log("1. Buscando em motoristas_ativos...");
  const { data: motoristas } = await supabase
    .from('motoristas_ativos')
    .select('id, nome, recibo_verde, status_ativo')
    .or('nome.ilike.%alysson%,nome.ilike.%caldeira%');
  
  console.log("   motoristas_ativos:", motoristas?.length ? motoristas : "NÃO ENCONTRADO");
  
  // 2. Buscar na uber_drivers
  console.log("\n2. Buscando em uber_drivers...");
  const { data: uberDrivers, error: uberErr } = await supabase
    .from('uber_drivers')
    .select('uber_driver_id, full_name, motorista_id')
    .or('full_name.ilike.%alysson%,full_name.ilike.%caldeira%');
  
  console.log("   uber_drivers:", uberDrivers?.length ? uberDrivers : "NÃO ENCONTRADO");
  if (uberErr) console.log("   ERRO:", uberErr);

  // 3. Buscar na uber_atividade_motoristas
  console.log("\n3. Buscando em uber_atividade_motoristas...");
  const { data: atividade, error: ativErr } = await supabase
    .from('uber_atividade_motoristas')
    .select('uber_driver_id, driver_name, viagens_concluidas, periodo')
    .or('driver_name.ilike.%alysson%,driver_name.ilike.%caldeira%');
  
  console.log("   uber_atividade_motoristas:", atividade?.length ? atividade : "NÃO ENCONTRADO");
  if (ativErr) console.log("   ERRO:", ativErr);

  // 4. Buscar transações Uber
  console.log("\n4. Buscando em uber_transactions...");
  // Primeiro: total geral
  const { count: totalTx } = await supabase
    .from('uber_transactions')
    .select('*', { count: 'exact', head: true });
  console.log("   Total geral de transações Uber:", totalTx);

  // Se temos uber_driver_id do passo 3, buscar transações pelo ID
  if (atividade && atividade.length > 0) {
    const driverId = atividade[0].uber_driver_id;
    console.log(`\n   Buscando transações para uber_driver_id=${driverId}...`);
    const { data: txData, count: txCount, error: txErr } = await supabase
      .from('uber_transactions')
      .select('id, uber_driver_id, gross_amount, occurred_at', { count: 'exact' })
      .eq('uber_driver_id', driverId)
      .limit(5);
    
    console.log("   Transações encontradas:", txCount);
    if (txData && txData.length > 0) {
      txData.forEach(t => console.log(`   - ID: ${t.id} | Valor: €${t.gross_amount} | Data: ${t.occurred_at}`));
    }
    if (txErr) console.log("   ERRO:", txErr);
  }

  // 5. Verificar plataformas_configuracao (integrações Uber)
  console.log("\n5. Integrações Uber configuradas...");
  const { data: configs } = await supabase
    .from('plataformas_configuracao')
    .select('id, nome, plataforma, ativo, ultimo_sync, last_webhook_at')
    .in('plataforma', ['uber', 'robot']);
  
  console.log("   configurações encontradas:", configs?.length || 0);
  configs?.forEach(c => {
    console.log(`   - ${c.nome} (${c.plataforma}) | Ativo: ${c.ativo} | Último sync: ${c.ultimo_sync || 'nunca'} | Último webhook: ${c.last_webhook_at || 'nunca'}`);
  });

  // 6. Se temos motorista_id, verificar bp_transacoes
  if (motoristas && motoristas.length > 0) {
    const motoristaId = motoristas[0].id;
    console.log(`\n6. BP Transações para motorista_id=${motoristaId}...`);
    const { count: bpCount } = await supabase
      .from('bp_transacoes')
      .select('*', { count: 'exact', head: true })
      .eq('motorista_id', motoristaId);
    console.log("   BP transações:", bpCount);
  }

  console.log("\n=== FIM DO DIAGNÓSTICO ===");
}

debugAlysson();
