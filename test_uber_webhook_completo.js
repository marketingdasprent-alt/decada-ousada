// Script de verificação e teste completo do webhook da Uber
const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const INTEGRACAO_ID = "b1789816-92e3-48a4-b012-034c1a95d201";
const CLIENT_SECRET = "CQo6DJcxb9a1OiLejdAXdy-webPyhBrmRTA-a35g";

async function main() {
  // 1. Verificar estado da BD
  console.log("1. A verificar estado da integração na base de dados...");
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/plataformas_configuracao?id=eq.${INTEGRACAO_ID}&select=id,nome,plataforma,robot_target_platform,ativo,client_id,ultimo_sync`,
    { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
  );
  const rows = await getRes.json();

  if (!rows || rows.length === 0) {
    console.log("⚠️  Linha bloqueada por RLS. A verificar se o SQL foi aplicado via função...");
  } else {
    const row = rows[0];
    console.log(`   Nome: ${row.nome}`);
    console.log(`   Plataforma: ${row.plataforma} ${row.plataforma === 'uber' ? '✅' : '❌ AINDA É robot! Corre o SQL!'}`);
    console.log(`   Client ID: ${row.client_id}`);
    console.log(`   Último sync: ${row.ultimo_sync || 'Nunca'}`);
  }

  // 2. Testar o webhook com um payload simulado (sem HMAC para ver se encontra a integração)
  console.log("\n2. A testar se o webhook encontra a integração Uber Açores...");
  
  // Gerar HMAC com o client secret real para um teste válido
  const testPayload = JSON.stringify({
    event_id: `test-${Date.now()}`,
    event_type: "driver.payment",
    event_time: Math.floor(Date.now() / 1000),
    resource_href: "https://api.uber.com/v1/partners/payments/test",
    meta: { status: "PAID", resource_id: "test-payment" },
    identity: { driver_id: "test-driver-001" }
  });

  // Calcular HMAC
  const { createHmac } = await import('crypto');
  const hmac = createHmac('sha256', CLIENT_SECRET);
  hmac.update(testPayload);
  const signature = hmac.digest('hex');

  const webhookRes = await fetch(
    `${SUPABASE_URL}/functions/v1/uber-webhook?integracao_id=${INTEGRACAO_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-uber-signature": signature,
        "x-environment": "production"
      },
      body: testPayload
    }
  );

  const statusCode = webhookRes.status;
  const responseText = await webhookRes.text();
  let responseJson;
  try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

  console.log(`   Status HTTP: ${statusCode}`);
  
  if (statusCode === 200 && responseJson.success) {
    console.log("   ✅ WEBHOOK FUNCIONANDO! Evento recebido e processado com sucesso!");
    console.log(`   Domínio: ${responseJson.domain}`);
    console.log(`   Mensagem: ${responseJson.message}`);
  } else if (statusCode === 401) {
    console.log("   ❌ Assinatura HMAC inválida - o client_secret na BD pode estar errado");
    console.log(`   Detalhe: ${JSON.stringify(responseJson)}`);
  } else if (statusCode === 404) {
    console.log("   ❌ Integração não encontrada - o campo plataforma ainda é 'robot'!");
    console.log("   👉 Tens de correr o SQL manualmente no Supabase:");
    console.log(`   UPDATE plataformas_configuracao SET plataforma = 'uber', robot_target_platform = NULL WHERE id = '${INTEGRACAO_ID}';`);
    console.log(`   URL do editor SQL: https://supabase.com/dashboard/project/hkqzzxgeedsmjnhyquke/sql/new`);
  } else if (statusCode === 400) {
    console.log("   ⚠️  Client Secret em falta na BD");
    console.log(`   Detalhe: ${JSON.stringify(responseJson)}`);
  } else {
    console.log(`   Resposta: ${JSON.stringify(responseJson)}`);
  }

  // 3. Verificar se chegou algum evento à tabela de eventos
  console.log("\n3. A verificar tabela uber_webhook_events (últimos 3)...");
  const eventsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/uber_webhook_events?integracao_id=eq.${INTEGRACAO_ID}&order=created_at.desc&limit=3&select=event_type,processing_status,error_message,created_at`,
    { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
  );
  const events = await eventsRes.json();
  if (events && events.length > 0) {
    console.table(events.map(e => ({
      Tipo: e.event_type,
      Estado: e.processing_status,
      Erro: e.error_message || '-',
      Hora: new Date(e.created_at).toLocaleTimeString('pt-PT')
    })));
  } else {
    console.log("   Sem eventos registados ainda (normal antes da primeira viagem real).");
  }
}

main().catch(console.error);
