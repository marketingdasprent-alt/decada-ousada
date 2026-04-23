import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugProfiles() {
  console.log('--- DIAGNÓSTICO DE ACESSOS ---');
  
  const { data: profiles, error } = await supabase.from('profiles').select('id, nome, cargo, is_admin');
  
  if (error) {
    console.error('❌ Erro ao ler profiles:', error.message);
  } else {
    console.log(`✅ Conseguimos ler ${profiles?.length || 0} perfis.`);
    if (profiles && profiles.length > 0) {
      console.log('Amostra de dados:', profiles.slice(0, 3));
    } else {
      console.log('⚠️ A tabela retornou VAZIA. Isto é sinal de bloqueio RLS.');
    }
  }

  const { data: cargos } = await supabase.from('cargos').select('id, nome');
  console.log(`✅ Encontrados ${cargos?.length || 0} grupos/cargos.`);
}

debugProfiles();
