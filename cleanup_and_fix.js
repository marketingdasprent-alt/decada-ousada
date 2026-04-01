import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupAndIdentify() {
  try {
    console.log('--- LIMPANDO REGISTOS ERRADOS ---');
    
    // Deletar resumos sem motorista (os lixos criados pelo erro anterior)
    const { count, error: delError } = await supabase
      .from('bolt_resumos_semanais')
      .delete({ count: 'exact' })
      .is('motorista_id', null);

    if (delError) console.error('Erro ao deletar:', delError);
    else console.log(`Removidos ${count} registos inválidos.`);

    console.log('\n--- IDENTIFICANDO INTEGRAÇÕES REAIS ---');
    const { data: ints, error: intError } = await supabase
      .from('plataformas_configuracao')
      .select('id, nome, plataforma, robot_target_platform')
      .eq('ativo', true);

    if (intError) console.error('Erro ao buscar integrações:', intError);
    else {
      console.log('Integrações Ativas:');
      console.table(ints);
    }

  } catch (e) {
    console.error('Erro:', e);
  }
}

cleanupAndIdentify();
