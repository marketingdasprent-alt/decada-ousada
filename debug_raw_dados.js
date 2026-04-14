import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEverything() {
  console.log("---- UBER TRANSACTIONS ----");
  const { data: uber } = await supabase
    .from('uber_transactions')
    .select('occurred_at, raw_transaction')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (uber) {
    uber.forEach((u, i) => {
      console.log(`[Uber ${i}] occurred_at: ${u.occurred_at}`);
      console.log(`  Raw:`, u.raw_transaction?.csv_row);
    });
  }

  console.log("\n---- BP TRANSACTIONS ----");
  const { data: bp } = await supabase
    .from('bp_transacoes')
    .select('transaction_date, raw_data, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (bp) {
    bp.forEach((u, i) => {
      console.log(`[BP ${i}] transaction_date: ${u.transaction_date}`);
      console.log(`  Raw:`, u.raw_data);
    });
  }
}

checkEverything();
