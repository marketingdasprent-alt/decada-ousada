import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectBp() {
  console.log("---- LOGS DE SINCRONIZACAO DA BP ----");
  const { data: logs, error } = await supabase
    .from('bp_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log("Erro ao ler bp_sync_logs (tabela provavelmente nao existe):", error.message);
  } else {
    console.log(logs);
  }

  console.log("\n---- TOTAL DE TRANSACOES BP ----");
  const { data: count, error: err2 } = await supabase
    .from('bp_transacoes')
    .select('id', { count: 'exact', head: true });
    
  console.log("Total na tabela bp_transacoes:", count || 0);
  if (err2) console.log("Erro:", err2);
}

inspectBp();
