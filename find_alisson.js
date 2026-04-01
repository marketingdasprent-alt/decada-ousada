import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function findAlisson() {
  console.log("--- Pesquisando Motoristas ---");
  const { data: motoristas } = await supabase
    .from('motoristas_ativos')
    .select('id, nome, cartao_frota')
    .limit(10);
  
  console.log("Amostra de motoristas ativos:", motoristas);

  const { data: similar } = await supabase
    .from('motoristas_ativos')
    .select('id, nome')
    .ilike('nome', '%Aly%');
  console.log("Motoristas com 'Aly':", similar);

  const { data: similar2 } = await supabase
    .from('motoristas_ativos')
    .select('id, nome')
    .ilike('nome', '%Ali%');
  console.log("Motoristas com 'Ali':", similar2);
}

findAlisson();
