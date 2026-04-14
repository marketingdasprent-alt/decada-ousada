import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanAndEnqueue() {
  try {
    console.log('1. Lendo a fila atual...');
    const { data: queue, error: qError } = await supabase
      .from('sync_queue')
      .select('id, plataforma, status')
      .in('status', ['pending', 'running']);
      
    if (qError) {
      console.error('Erro ao ler fila (pode não ter permissão anon):', qError);
    } else {
      console.log(`Itens na fila: ${queue.length}`);
      const viaVerdeItems = queue.filter(q => q.plataforma === 'via_verde');
      console.log(`Itens Via Verde travando a fila: ${viaVerdeItems.length}`);
    }

    console.log('\n2. Lendo integrações ativas...');
    const { data: integracoes, error: iError } = await supabase
      .from('plataformas_configuracao')
      .select('id, nome, plataforma, ativo, sync_automatico')
      .eq('ativo', true);

    if (iError) {
      console.error('Erro ao ler integracoes:', iError);
    } else {
      console.log(`Integrações ativas encontradas: ${integracoes.length}`);
      const ativosViaVerde = integracoes.filter(i => i.plataforma === 'via_verde');
      if (ativosViaVerde.length > 0) {
        console.log(`AVISO: Existem ${ativosViaVerde.length} integrações Via Verde ativas! DEVEM SER DESATIVADAS.`);
      }
    }

  } catch (e) {
    console.error('Erro fatal:', e);
  }
}

cleanAndEnqueue();
