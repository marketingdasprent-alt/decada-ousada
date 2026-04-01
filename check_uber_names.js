import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkTransactions() {
  console.log("--- Verificando transações Uber ---");
  const { data: transactions, error } = await supabase
    .from('uber_transactions')
    .select('raw_transaction, uber_driver_id')
    .limit(10);
  
  if (error) {
    console.error("Erro ao buscar transações:", error);
    return;
  }
  
  if (!transactions || transactions.length === 0) {
    console.log("Nenhuma transação encontrada.");
    return;
  }

  console.log(`Encontradas ${transactions.length} transações recentes.`);
  const driverNames = new Set();
  
  transactions.forEach(t => {
    const raw = t.raw_transaction;
    if (raw && raw.csv_row) {
      const first = raw.csv_row['driver_first_name'] || raw.csv_row['Nome próprio do motorista'] || '';
      const last = raw.csv_row['driver_last_name'] || raw.csv_row['Apelido do motorista'] || '';
      const name = `${first} ${last}`.trim();
      if (name) driverNames.add(name);
    }
  });

  if (driverNames.size > 0) {
    console.log("Nomes de motoristas encontrados nas transações:");
    driverNames.forEach(name => console.log(`- ${name}`));
  } else {
    console.log("Nenhum nome de motorista encontrado no raw_transaction.");
  }
}

checkTransactions();
