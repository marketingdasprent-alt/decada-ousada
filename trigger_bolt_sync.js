import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function triggerAutomatedSync() {
  try {
    console.log('Buscando integrações Bolt-Robot ativas...');
    
    // 1. Localizar integrações Bolt que usam Robô
    const { data: integracoes, error } = await supabase
      .from('plataformas_configuracao')
      .select('id, nome')
      .eq('plataforma', 'robot')
      .eq('robot_target_platform', 'bolt')
      .eq('ativo', true);

    if (error) throw error;
    if (!integracoes || integracoes.length === 0) {
      console.log('Nenhuma integração Bolt-Robot ativa encontrada.');
      return;
    }

    console.log(`Encontradas ${integracoes.length} integrações. Disparando...`);

    for (const int of integracoes) {
      console.log(`Disparando Apify para: ${int.nome} (${int.id})...`);
      
      // Chamar a Edge Function robot-execute diretamente
      // Usamos a URL da função
      const response = await fetch(`${supabaseUrl}/functions/v1/robot-execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ integracao_id: int.id })
      });

      const result = await response.json();
      console.log(`Resultado para ${int.nome}:`, result);
    }

    console.log('\nSincronização disparada com sucesso. Os dados devem aparecer em alguns minutos conforme o robô termina.');

  } catch (e) {
    console.error('Erro ao disparar sincronização:', e);
  }
}

triggerAutomatedSync();
