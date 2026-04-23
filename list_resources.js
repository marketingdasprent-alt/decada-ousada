import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listResources() {
  const { data, error } = await supabase.from('recursos').select('*').limit(50);
  if (error) {
    console.error('Erro ao listar recursos:', error);
  } else {
    console.log('Todos os recursos encontrados:');
    console.table(data);
  }
}

listResources();
