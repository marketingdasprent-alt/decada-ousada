import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugTicket19() {
  const { data, error } = await supabase
    .from('assistencia_tickets')
    .select(`
      id, 
      numero, 
      motorista_id,
      motorista:motoristas(id, nome, gestor_id)
    `)
    .or('numero.ilike.%0019%,numero.eq.19')
    .single();

  if (error) {
    console.error('Erro ao buscar ticket:', error);
  } else {
    console.log('Dados do Ticket #0019:');
    console.log('ID do Ticket:', data.id);
    console.log('Motorista:', data.motorista?.nome || 'Não encontrado');
    console.log('ID do Gestor do Motorista:', data.motorista?.gestor_id || 'Nenhum gestor atribuído');
    
    if (data.motorista?.gestor_id) {
        const { data: gestor } = await supabase.from('profiles').select('nome').eq('id', data.motorista.gestor_id).single();
        console.log('Nome do Gestor:', gestor?.nome || 'Perfil do gestor não encontrado');
    }
  }
}

debugTicket19();
