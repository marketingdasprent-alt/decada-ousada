const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const INTEGRACAO_ID = "b1789816-92e3-48a4-b012-034c1a95d201";

async function checkDados() {
  const headers = { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` };

  console.log("=== VERIFICAÇÃO DE DADOS REAIS DA UBER ===\n");

  // 1. Eventos recebidos via webhook (inclui o nosso teste de há pouco)
  console.log("1. Eventos recebidos via Webhook (uber_webhook_events)...");
  const evRes = await fetch(
    `${SUPABASE_URL}/rest/v1/uber_webhook_events?integracao_id=eq.${INTEGRACAO_ID}&order=created_at.desc&limit=10&select=event_id,event_type,processing_status,error_message,created_at`,
    { headers }
  );
  const events = await evRes.json();
  if (events?.length > 0) {
    console.table(events.map(e => ({
      "Tipo de Evento": e.event_type || "(sem tipo)",
      "Estado": e.processing_status,
      "Erro": e.error_message || "-",
      "Hora": new Date(e.created_at).toLocaleString('pt-PT')
    })));
    console.log(`Total: ${events.length} evento(s) encontrado(s)\n`);
  } else {
    console.log("   Nenhum evento recebido da Uber ainda.\n");
  }

  // 2. Transações/viagens gravadas
  console.log("2. Transações financeiras da Uber (uber_transactions)...");
  const txRes = await fetch(
    `${SUPABASE_URL}/rest/v1/uber_transactions?integracao_id=eq.${INTEGRACAO_ID}&order=created_at.desc&limit=10&select=uber_transaction_id,transaction_type,status,gross_amount,currency,occurred_at,created_at`,
    { headers }
  );
  const txs = await txRes.json();
  if (txs?.length > 0) {
    console.table(txs.map(t => ({
      "ID Transação": t.uber_transaction_id?.substring(0, 20) + "...",
      "Tipo": t.transaction_type,
      "Estado": t.status,
      "Valor": t.gross_amount ? `${t.gross_amount} ${t.currency}` : "-",
      "Data": t.occurred_at ? new Date(t.occurred_at).toLocaleString('pt-PT') : "-"
    })));
    console.log(`Total: ${txs.length} transação(ões)\n`);
  } else {
    console.log("   Nenhuma transação real da Uber guardada ainda.\n");
  }

  // 3. Motoristas Uber identificados
  console.log("3. Motoristas Uber identificados (uber_drivers)...");
  const drvRes = await fetch(
    `${SUPABASE_URL}/rest/v1/uber_drivers?integracao_id=eq.${INTEGRACAO_ID}&select=uber_driver_id,full_name,status,motorista_id,created_at&order=created_at.desc&limit=10`,
    { headers }
  );
  const drivers = await drvRes.json();
  if (drivers?.length > 0) {
    console.table(drivers.map(d => ({
      "Nome Uber": d.full_name || d.uber_driver_id,
      "Estado": d.status || "-",
      "Ligado ao motorista?": d.motorista_id ? "✅ Sim" : "❌ Não",
    })));
    console.log(`Total: ${drivers.length} motorista(s) Uber\n`);
  } else {
    console.log("   Nenhum motorista Uber registado ainda.\n");
  }

  console.log("=== DIAGNÓSTICO ===");
  if (!events?.length && !txs?.length) {
    console.log(`
❓ Ainda SEM dados reais da Uber.

Isto é NORMAL se:
  → Nenhum motorista fez corrida desde que o webhook foi configurado hoje
  → A Uber só envia webhooks quando há eventos novos (pagamentos, corridas)
  
O que esperar quando houver corridas:
  → A Uber envia um webhook automaticamente
  → O nosso servidor recebe e guarda em uber_webhook_events
  → A transação fica guardada em uber_transactions
  → Os dados aparecem nos recibos do motorista

⚠️  ATENÇÃO: O Webhook da Uber normalmente envia dados de PAGAMENTOS SEMANAIS,
   não de corridas individuais. Os dados chegam normalmente ao fim de semana
   quando a Uber processa o pagamento semanal da frota.
`);
  }
}

checkDados().catch(console.error);
