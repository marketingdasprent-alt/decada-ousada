import { createClient } from '@supabase/supabase-js';

// Usar diretamente as chaves do ambiente local
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function verificarAgora() {
  console.log("A consultar os logs da Uber (últimos 5 registos)...");

  // Buscar logs recentes da Uber
  const { data: logs, error } = await supabase
    .from('uber_sync_logs')
    .select('tipo, status, mensagem, erros, viagens_novas, detalhes, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Erro ao consultar a tabela uber_sync_logs:", error);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log("Ainda não apareceu nenhum log. Tente novamente em alguns segundos.");
    return;
  }

  console.table(logs.map(log => ({
    Status: log.status,
    Mensagem: log.mensagem?.substring(0, 100),
    Erros: log.erros,
    Novas_Viagens: log.viagens_novas,
    Data: new Date(log.created_at).toLocaleTimeString('pt-PT')
  })));

  // Se o primeiro der erro, mostra os detalhes do erro para podermos ajudar
  if (logs[0].status !== 'success') {
    console.log("\n⚠️ Detalhes do falhanço mais recente:");
    console.log(JSON.stringify(logs[0].detalhes, null, 2));
  }
}

verificarAgora();
