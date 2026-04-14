import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStatus() {
  try {
    const { data: queue, error } = await supabase
      .from('sync_queue')
      .select('id, plataforma, robot_target_platform, status, started_at, completed_at, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching queue:', error);
      return;
    }

    console.log('Status atual da fila de processamento (ultimos 20 registros):');
    console.table(queue.map(q => ({
      id: q.id.slice(0,5),
      plataforma: q.plataforma,
      target: q.robot_target_platform,
      status: q.status,
      error: q.error_message?.slice(0, 40)
    })));

  } catch (e) {
    console.error('Erro:', e);
  }
}

checkStatus();
