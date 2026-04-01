import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkSyncLogs() {
  console.log("--- Verificando logs de sincronização Uber ---");
  const { data: logs, error } = await supabase
    .from('uber_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error("Erro ao buscar logs:", error);
    return;
  }
  
  if (!logs || logs.length === 0) {
    console.log("Nenhum log de sincronização encontrado.");
    return;
  }

  console.log(`Encontrados ${logs.length} logs recentes.`);
  logs.forEach(log => {
      console.log(`- Data: ${log.created_at} | Tipo: ${log.tipo} | Status: ${log.status} | Mensagem: ${log.mensagem}`);
      if (log.detalhes) {
          console.log(`  Detalhes: ${JSON.stringify(log.detalhes)}`);
      }
  });
}

checkSyncLogs();
