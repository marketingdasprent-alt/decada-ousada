const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

async function diagnostic() {
  const headers = { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" };
  
  console.log("=== DIAGNÓSTICO BOLT TOTAL ===");

  // 1. Todas as integrações (para ver quais são Bolt/Robot)
  const resConfig = await fetch(`${SUPABASE_URL}/rest/v1/plataformas_configuracao?select=id,nome,plataforma,robot_target_platform,ativo,ultimo_sync`, { headers });
  const configs = await resConfig.json();
  console.log("\n1. Todas as Integrações Ativas:");
  console.table(configs.filter(c => c.ativo));

  // 2. Procurar resumos por nome do motorista (Sonia, Cesar)
  const resEntries = await fetch(`${SUPABASE_URL}/rest/v1/bolt_resumos_semanais?motorista_nome=ilike.*sonia*&select=motorista_nome,periodo,periodo_inicio,motorista_id&limit=10`, { headers });
  console.log("\n2. Resumos Semanais encontrados para 'Sonia':");
  console.table(await resEntries.json());

  // 3. Verificar logs de sincronização recentes (últimos 10)
  const resLogs = await fetch(`${SUPABASE_URL}/rest/v1/bolt_sync_logs?select=created_at,status,tipo,mensagem&order=created_at.desc&limit=10`, { headers });
  console.log("\n3. Últimos 10 Logs de Sincronização:");
  console.table(await resLogs.json());
  
  // 4. Verificar se existem 'Contas' (financeiro) para este período
  // Tentamos ver se há faturas ou recibos recentes
  const resContas = await fetch(`${SUPABASE_URL}/rest/v1/financeiro_recebimentos?created_at=gte.2026-04-20T00:00:00Z&select=id,motorista_id,valor_total,plataforma&limit=5`, { headers });
  if (resContas.ok) {
    console.log("\n4. 'Contas' (recebimentos) gerados desde 20/04:");
    console.table(await resContas.json());
  }
}




diagnostic();
