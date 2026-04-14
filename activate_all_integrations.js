import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function activateAll() {
  try {
    console.log('--- Ativando Todas as Integrações ---');
    
    // 1. Listar todas as integrações existentes para atualizar uma a uma (mais compatível com RLS)
    const { data: platforms, error: fetchError } = await supabase
      .from('plataformas_configuracao')
      .select('id, nome, plataforma, ativo, sync_automatico');
      
    if (fetchError) throw fetchError;
    
    console.log(`Encontradas ${platforms.length} integrações.`);
    
    for (const p of platforms) {
      console.log(`Processando: ${p.nome} (${p.plataforma})...`);
      
      const { error: updateError } = await supabase
        .from('plataformas_configuracao')
        .update({ 
          ativo: true, 
          sync_automatico: true 
        })
        .eq('id', p.id);
        
      if (updateError) {
        console.error(`Erro ao atualizar ${p.nome}:`, updateError.message);
      } else {
        console.log(`Status [OK]: ${p.nome} ativado.`);
      }
    }
    
    // 2. Disparar Orquestrador (como solicitado)
    console.log('\n--- Disparando Sync Orchestrator ---');
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      }
    });
    
    const orchestratorResult = await response.json();
    console.log('Resultado do disparo:', orchestratorResult);
    
    console.log('\n--- Processo Concluído ---');
    
  } catch (e) {
    console.error('Erro crítico no processo de ativação:', e);
  }
}

activateAll();
