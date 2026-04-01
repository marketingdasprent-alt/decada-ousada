import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepDiagnostics() {
  try {
    console.log('--- DIAGNÓSTICO PROFUNDO BOLT ---');
    
    // 1. Verificar logs de sincronização para ver se houve erro silenciado
    const { data: logs, error: logsErr } = await supabase
      .from('bolt_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (logsErr) console.error('Erro ao ler logs:', logsErr);
    else {
      console.log('Últimos Logs de Sincronização:');
      console.table(logs.map(l => ({
        tipo: l.tipo,
        status: l.status,
        msg: l.mensagem?.substring(0, 50),
        data: l.created_at
      })));
    }

    // 2. Verificar se existem registros na tabela de resumos para Março
    const { data: resumos, error: resErr } = await supabase
      .from('bolt_resumos_semanais')
      .select('id, motorista_nome, periodo, periodo_inicio, periodo_fim, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (resErr) console.error('Erro ao ler resumos:', resErr);
    else {
      console.log('Últimos 10 Resumos Gravados:');
      console.table(resumos.map(r => ({
        nome: r.motorista_nome,
        periodo: r.periodo,
        inicio: r.periodo_inicio,
        fim: r.periodo_fim,
        criado: r.created_at
      })));
    }

    // 3. Verificar especificamente a semana 13
    const { data: w13, error: w13Err } = await supabase
      .from('bolt_resumos_semanais')
      .select('count')
      .eq('periodo', '2026W13');
    
    console.log(`\nRegistos para '2026W13': ${w13?.[0]?.count || 0}`);

  } catch (e) {
    console.error('Erro inesperado:', e);
  }
}

deepDiagnostics();
