import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function listAll() {
  const { data: motoristas, error } = await supabase
    .from('motoristas_ativos')
    .select('*');
  
  if (error) {
    console.error("Erro ao listar:", error);
    return;
  }
  
  console.log(`Total de motoristas ativos: ${motoristas.length}`);
  motoristas.forEach(m => {
    console.log(`- ID: ${m.id} | Nome: ${m.nome} | Ativo: ${m.status_ativo}`);
  });
}

listAll();
