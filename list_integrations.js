import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllIntegrations() {
  try {
    console.log('Listando todas as integrações configuradas no sistema:');
    const { data: integracoes, error } = await supabase
      .from('plataformas_configuracao')
      .select('id, nome, plataforma, robot_target_platform, ativo, sync_automatico');

    if (error) throw error;
    console.table(integracoes);

    // Agora vamos disparar a primeira BOLT que encontrarmos, independente de como está configurada
    const boltInt = integracoes.find(i => (i.plataforma === 'bolt' || i.robot_target_platform === 'bolt') && i.ativo);
    
    if (boltInt) {
      console.log(`\nDisparando para Integração Bolt Identificada: ${boltInt.nome} (${boltInt.id})`);
      const response = await fetch(`${supabaseUrl}/functions/v1/robot-execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ integracao_id: boltInt.id })
      });
      const result = await response.json();
      console.log('Resultado do disparo:', result);
    } else {
      console.log('\nNenhuma integração Bolt ativa encontrada para disparo automático.');
    }

  } catch (e) {
    console.error('Erro ao listar integrações:', e);
  }
}

listAllIntegrations();
