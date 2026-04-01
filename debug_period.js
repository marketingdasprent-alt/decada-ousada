import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSpecificDates() {
  try {
    console.log('Checking bolt_resumos_semanais for period near March 23-29...');
    
    // We try to find ANY data from Bolt summaries
    const { data: anyData, error } = await supabase
      .from('bolt_resumos_semanais')
      .select('id, motorista_nome, periodo, periodo_inicio, periodo_fim, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching data:', error);
    } else {
      console.log('Last 20 records in bolt_resumos_semanais:');
      console.table(anyData.map(r => ({
        id: r.id.slice(0, 8),
        nome: r.motorista_nome,
        p: r.periodo,
        start: r.periodo_inicio,
        end: r.periodo_fim,
        created: r.created_at
      })));
    }

    console.log('\nChecking Uber transactions for the same period...');
    const { data: uberData, error: error2 } = await supabase
      .from('uber_transactions')
      .select('id, occurred_at, gross_amount')
      .gte('occurred_at', '2026-03-23T00:00:00Z')
      .lte('occurred_at', '2026-03-29T23:59:59Z')
      .limit(10);

    if (error2) {
      console.error('Error fetching uber data:', error2);
    } else {
      console.log(`Found ${uberData?.length || 0} Uber transactions for 23/03-29/03`);
    }

  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

checkSpecificDates();
