import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCargos() {
  const { data: profiles } = await supabase.from('profiles').select('cargo').limit(100);
  const uniqueCargos = [...new Set(profiles.map(p => p.cargo))];
  console.log('Cargos encontrados:', uniqueCargos);
  
  const { data: cargosTable } = await supabase.from('cargos').select('nome');
  console.log('Nomes na tabela cargos:', cargosTable?.map(c => c.nome));
}

checkCargos();
