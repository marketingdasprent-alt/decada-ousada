import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function findAlisson() {
  const { data: motoristas } = await supabase
    .from('motoristas_ativos')
    .select('id, nome, status_ativo');
  
  console.log("Todos os motoristas no banco (independente de filtro):", motoristas);

  const { data: alissonLike } = await supabase
    .from('motorista_candidaturas')
    .select('id, nome, status')
    .ilike('nome', '%Ali%');
  console.log("Candidaturas 'Alisson':", alissonLike);

  const { data: alyssonLike } = await supabase
    .from('motorista_candidaturas')
    .select('id, nome, status')
    .ilike('nome', '%Aly%');
  console.log("Candidaturas 'Alysson':", alyssonLike);
}

findAlisson();
