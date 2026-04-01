import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function debugDriver() {
  const driverName = "Alysson Caldeira";
  console.log(`--- Debugging ${driverName} ---`);

  // 1. Motorista Ativo
  const { data: motorista } = await supabase
    .from('motoristas_ativos')
    .select('id, nome, cartao_frota')
    .ilike('nome', `%${driverName}%`)
    .maybeSingle();
  
  if (!motorista) {
    console.log("ERRO: Motorista não encontrado em 'motoristas_ativos'");
    return;
  }
  console.log("Motorista ID:", motorista.id);
  console.log("Cartão Frota:", motorista.cartao_frota);

  // 2. Mapeamento Uber
  const { data: uberDriver } = await supabase
    .from('uber_drivers')
    .select('*')
    .ilike('full_name', `%${driverName}%`)
    .maybeSingle();

  if (uberDriver) {
    console.log("Uber Driver ID (UUID):", uberDriver.uber_driver_id);
    console.log("Uber Motorista ID Mapeado:", uberDriver.motorista_id);
    
    // Ver transações recentes
    const { count: uberCount } = await supabase
      .from('uber_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('uber_driver_id', uberDriver.uber_driver_id);
    console.log("Total Transações Uber para este ID:", uberCount);
  } else {
    console.log("Uber Driver não encontrado pelo nome");
  }

  // 3. Combustível BP
  const { count: bpCount } = await supabase
    .from('bp_transacoes')
    .select('*', { count: 'exact', head: true })
    .eq('motorista_id', motorista.id);
  console.log("Total Transações BP para este Motorista ID:", bpCount);

  // Se tem BPCount zero, ver se há transações sem motorista_id que combinem com o cartão
  if (bpCount === 0 && motorista.cartao_frota) {
    console.log("Verificando transações órfãs do BP...");
    const cards = motorista.cartao_frota.split('/');
    for (const c of cards) {
        const last4 = c.slice(-4);
        const { count: orphanCount } = await supabase
            .from('bp_transacoes')
            .select('*', { count: 'exact', head: true })
            .is('motorista_id', null)
            .ilike('transaction_id', `%${last4}%`);
        console.log(`Transações BP órfãs que podem ser do cartão ...${last4}:`, orphanCount);
    }
  }
}

debugDriver();
