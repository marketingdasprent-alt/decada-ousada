
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectTickets() {
  console.log("--- INSPECCIONANDO ÚLTIMOS TICKETS ---");
  const { data, error } = await supabase
    .from('assistencia_tickets')
    .select('id, numero, titulo, viatura_id, criado_em')
    .order('criado_em', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Erro:", error);
  } else {
    data.forEach(t => {
      console.log(`Ticket #${t.numero} | ViaturaID no Ticket: ${t.viatura_id} | Título: ${t.titulo}`);
    });
  }

  console.log("\n--- BUSCANDO ID DA VIATURA 22-XS-69 ---");
  const { data: v } = await supabase
    .from('viaturas')
    .select('id, matricula')
    .ilike('matricula', '%22-XS-69%')
    .maybeSingle();

  if (v) {
    console.log(`Viatura 22-XS-69 encontrada! ID Real: ${v.id}`);
  } else {
    console.log("Viatura 22-XS-69 não encontrada na tabela 'viaturas'!");
  }
}

inspectTickets();
