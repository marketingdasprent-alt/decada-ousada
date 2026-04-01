import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkAtividade() {
  console.log("--- Verificando atividade de motoristas Uber ---");
  const { data: atividade, error } = await supabase
    .from('uber_atividade_motoristas')
    .select('driver_name, uber_driver_id, periodo')
    .limit(20);
  
  if (error) {
    console.error("Erro ao buscar atividade:", error);
    return;
  }
  
  if (!atividade || atividade.length === 0) {
    console.log("Nenhum registo de atividade encontrado.");
    return;
  }

  console.log(`Encontrados ${atividade.length} registos de atividade.`);
  const driverNames = new Set();
  
  atividade.forEach(a => {
    if (a.driver_name) driverNames.add(a.driver_name);
    else if (a.uber_driver_id) driverNames.add(a.uber_driver_id);
  });

  if (driverNames.size > 0) {
    console.log("Motoristas encontrados:");
    driverNames.forEach(name => console.log(`- ${name}`));
  }
}

checkAtividade();
