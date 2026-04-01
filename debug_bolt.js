import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  try {
    console.log('Checking bolt_resumos_semanais...');
    const { data: resumos, error } = await supabase
      .from('bolt_resumos_semanais')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching resumos:', error);
    } else {
      console.log('Last 5 bolt_resumos_semanais:', JSON.stringify(resumos || [], null, 2));
    }

    console.log('\nChecking bolt_viagens...');
    const { data: viagens, error: error2 } = await supabase
      .from('bolt_viagens')
      .select('order_reference, driver_name, payment_confirmed_timestamp, motorista_id')
      .order('payment_confirmed_timestamp', { ascending: false })
      .limit(5);

    if (error2) {
      console.error('Error fetching viagens:', error2);
    } else {
      console.log('Last 5 bolt_viagens:', JSON.stringify(viagens || [], null, 2));
    }

    console.log('\nChecking for null periods in resumos...');
    const { data: nullPeriods, error: error3 } = await supabase
      .from('bolt_resumos_semanais')
      .select('id, motorista_nome, periodo, periodo_inicio, periodo_fim')
      .or('periodo_inicio.is.null,periodo_fim.is.null')
      .limit(10);
    
    if (error3) {
       console.error('Error fetching null periods:', error3);
    } else {
       console.log('Records with null periods:', JSON.stringify(nullPeriods || [], null, 2));
    }

  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

checkData();
