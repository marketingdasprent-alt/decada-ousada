import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function getAllDrivers() {
  const { data: atividade, error } = await supabase
    .from('uber_atividade_motoristas')
    .select('driver_name, uber_driver_id');
  
  if (error) {
    console.error("Erro:", error);
    return;
  }
  
  const driverNames = new Set();
  atividade.forEach(a => {
    if (a.driver_name) driverNames.add(a.driver_name);
  });

  const sortedNames = Array.from(driverNames).sort();
  console.log(`Total de motoristas Uber encontrados: ${sortedNames.length}`);
  sortedNames.forEach(name => console.log(name));
}

getAllDrivers();
