import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function listUber() {
  console.log("--- Buscando motoristas da Uber ---");
  const { data: uberDrivers, error } = await supabase
    .from('uber_drivers')
    .select('uber_driver_id, full_name, email, motorista_id');
  
  if (error) {
    console.error("Erro ao listar:", error);
    return;
  }
  
  if (!uberDrivers || uberDrivers.length === 0) {
    console.log("Nenhum motorista encontrado na tabela uber_drivers.");
    return;
  }

  console.log(`Encontrados ${uberDrivers.length} motoristas vindos da Uber:`);
  uberDrivers.forEach(m => {
    console.log(`- Nome: ${m.full_name || 'N/A'} | Email: ${m.email || 'N/A'} | Uber ID: ${m.uber_driver_id} | Mapeado (ID Interno): ${m.motorista_id || 'Não mapeado'}`);
  });
}

listUber();
