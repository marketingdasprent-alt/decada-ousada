
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDanos() {
  console.log("--- VERIFICANDO ÚLTIMOS DANOS ---");
  const { data, error } = await supabase
    .from('viatura_danos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Erro ao buscar danos:", error);
  } else {
    console.log("Últimos 5 danos encontrados:");
    data.forEach(d => {
      console.log(`[${d.created_at}] ID: ${d.id} | Desc: ${d.descricao} | Viatura ID: ${d.viatura_id}`);
    });
  }

  console.log("\n--- VERIFICANDO FOTOS DE DANOS ---");
  const { data: fotos, error: fError } = await supabase
    .from('viatura_dano_fotos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (fError) {
    console.error("Erro ao buscar fotos de danos:", fError);
  } else {
    console.log("Últimas 5 fotos encontradas:");
    fotos.forEach(f => {
      console.log(`[${f.created_at}] Dano ID: ${f.dano_id} | URL: ${f.ficheiro_url}`);
    });
  }
}

checkDanos();
