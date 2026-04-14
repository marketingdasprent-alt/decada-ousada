import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function triggerSync() {
  try {
    console.log('🚀 Solicitando enfileiramento de todas as integrações ativas...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-orchestrator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enqueue: true })
    });
    
    const result = await response.json();
    console.log('\n✅ Resultado:', result);
    
    if (result.success) {
      console.log(`\nForam colocadas na fila ${result.enqueued} integrações num total de ${result.total}.`);
      console.log('O cron job automático da base de dados irá processar um motorista/plataforma a cada 10 minutos.');
      console.log('Por favor, aguarde enquanto o sistema vai recolhendo as informações lentamente para evitar bloqueios nas plataformas. Os dados deverão aparecer ao longo das próximas horas para todos os utilizadores.');
    }
  } catch (e) {
    console.error('❌ Erro inesperado ao tentar disparar a sincronização:', e);
  }
}

triggerSync();
