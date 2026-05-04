import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// If service role key is not available, try to find it in the environment or files.
// For now, I'll use the anon key if service role is missing, but it might not have access to some tables.
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function listIntegrations() {
  console.log("Listing all integrations...");
  const { data, error } = await supabase
    .from('integracoes')
    .select('*');

  if (error) {
    console.error("Error listing integrations:", error);
    return;
  }

  console.table(data.map(i => ({
    id: i.id,
    nome: i.nome,
    tipo: i.tipo,
    plataforma: i.plataforma_id,
    ativo: i.ativo
  })));
}

listIntegrations();
