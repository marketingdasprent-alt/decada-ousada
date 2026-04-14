import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function investigate() {
  const start = '2026-03-30T00:00:00Z';
  const end = '2026-04-05T23:59:59Z';

  console.log(`Investigating period: ${start} to ${end}`);

  // 1. Check Bolt Summaries
  const { data: boltData, error: boltError } = await supabase
    .from('bolt_resumos_semanais')
    .select('id, motorista_nome, periodo, periodo_inicio, periodo_fim, created_at')
    .gte('periodo_inicio', '2026-03-30')
    .lte('periodo_inicio', '2026-04-05');

  if (boltError) console.error('Bolt Error:', boltError);
  else console.log(`Bolt summaries found: ${boltData.length}`);

  // 2. Check Uber Transactions
  const { data: uberData, error: uberError } = await supabase
    .from('uber_transactions')
    .select('id, occurred_at')
    .gte('occurred_at', start)
    .lte('occurred_at', end)
    .limit(5);

  if (uberError) console.error('Uber Error:', uberError);
  else console.log(`Uber transactions found (sample count): ${uberData.length}`);

  // 3. Check for failed robot executions
  // I need to find the table name for robot executions. I'll try 'robot_executions' or 'apify_logs'
  const { data: logs, error: logsError } = await supabase
    .from('sync_orchestrator_logs') // Guessing name based on migration
    .select('*')
    .gte('created_at', '2026-04-01T00:00:00Z')
    .order('created_at', { ascending: false })
    .limit(20);

  if (logsError) {
    // If table doesn't exist, try another common one
    console.log('sync_orchestrator_logs not found, trying robot_executions...');
    const { data: logs2, error: logsError2 } = await supabase
      .from('robot_executions')
      .select('*')
      .gte('created_at', '2026-04-01T00:00:00Z')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (logsError2) console.error('Logs Error:', logsError2);
    else console.table(logs2.map(l => ({ id: l.id.slice(0, 8), status: l.status, error: l.error?.slice(0, 50), created: l.created_at })));
  } else {
    console.table(logs.map(l => ({ id: l.id, status: l.status, type: l.type, error: l.error?.slice(0, 50), created: l.created_at })));
  }

  // 4. Check for active integrations
  const { data: integrations, error: intError } = await supabase
    .from('integracoes_robot')
    .select('id, motorista_id, tipo_transporte, status_verificacao');
  
  if (intError) console.error('Integrations Error:', intError);
  else console.log(`Active robot integrations: ${integrations?.length || 0}`);
}

investigate();
