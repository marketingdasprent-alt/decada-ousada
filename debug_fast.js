import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEverything() {
  console.log("---- FILA DE PROCESSAMENTO ----");
  const { data: queue, error: err1 } = await supabase
    .from('sync_queue')
    .select('id, plataforma, robot_target_platform, status, error_message, created_at, started_at')
    .order('created_at', { ascending: false })
    .limit(15);
  
  if (err1) console.error("Erro ao ler fila:", err1.message);
  else {
    console.table(queue.map(q => ({
      ...q,
      id: q.id.substring(0,5),
      error: q.error_message ? q.error_message.substring(0,30) : ''
    })));
  }

  console.log("\n---- REGISTOS BOLT DA SEMANA 30/03: ----");
  const { data: bolt, error: err2 } = await supabase
    .from('bolt_resumos_semanais')
    .select('periodo, motorista_nome, viagens_terminadas, ganhos_liquidos, created_at')
    .gte('periodo_inicio', '2026-03-30')
    .lte('periodo_inicio', '2026-04-05');

  if (err2) console.error("Erro ao ler bolt:", err2.message);
  else {
    console.log(`Foram encontrados ${bolt.length} registos no total para esta semana.`);
    if (bolt.length > 0) {
        console.table(bolt.slice(0, 5));
    }
  }
}

checkEverything();
