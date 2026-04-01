import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function deepDebug() {
  console.log("--- DEBUG PROFUNDO: ALYSSON ---");

  // 1. Quem é o motorista no banco?
  const { data: motoristas } = await supabase
    .from('motoristas_ativos')
    .select('*')
    .ilike('nome', '%Alysson%');
  
  console.log("Motoristas Ativos encontrados:", JSON.stringify(motoristas, null, 2));

  if (motoristas && motoristas.length > 0) {
    const motorista = motoristas[0];
    const motoristaId = motorista.id;

    // 2. Transações BP para este ID
    const { data: bpTrans } = await supabase
      .from('bp_transacoes')
      .select('*')
      .eq('motorista_id', motoristaId)
      .limit(5);
    console.log(`Transações BP vinculadas ao ID ${motoristaId}:`, bpTrans.length);

    // 3. Se BP for 0, procurar transações com o cartão 0638
    if (bpTrans.length === 0) {
      const { data: bpOrphans } = await supabase
        .from('bp_transacoes')
        .select('*')
        .ilike('transaction_id', '%0638%')
        .limit(5);
      console.log("Transações BP que contêm '0638' no ID:", JSON.stringify(bpOrphans, null, 2));
    }

    // 4. Uber - Procurar nas atividades primeiro
    const { data: uberAtividade } = await supabase
      .from('uber_atividade_motoristas')
      .select('*')
      .ilike('uber_driver_id', '%Alysson%') // Às vezes o ID é o nome no CSV
      .limit(1);
    
    if (!uberAtividade) {
        // Tentar por parte do nome
        const { data: anyUber } = await supabase
            .from('uber_atividade_motoristas')
            .select('uber_driver_id')
            .limit(10);
        console.log("Exemplos de IDs na uber_atividade:", anyUber);
    } else {
        console.log("Atividade Uber encontrada:", uberAtividade);
    }
    
    // 5. Verificar se existe mapeamento em uber_drivers
    const { data: uberMapeamento } = await supabase
        .from('uber_drivers')
        .select('*')
        .eq('motorista_id', motoristaId);
    console.log("Mapeamento em uber_drivers:", uberMapeamento);
  }
}

deepDebug();
