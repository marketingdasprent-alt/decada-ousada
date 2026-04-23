import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runRetroactiveFix() {
  console.log('🚀 Iniciando atualização REFORÇADA de acessos aos tickets...');

  try {
    // 1. Obter todos os tickets abertos/em andamento
    const { data: tickets, error: ticketsError } = await supabase
      .from('assistencia_tickets')
      .select('id, motorista_id, criado_por');

    if (ticketsError) throw ticketsError;
    console.log(`📌 Encontrados ${tickets.length} tickets para processar.`);

    // 2. Obter TODOS os perfis para analisar manualmente (mais seguro)
    const { data: allProfiles, error: profError } = await supabase
      .from('profiles')
      .select('id, nome, cargo, is_admin, cargo_id');
    
    if (profError) throw profError;
    
    // 3. Obter Cargos com acesso a assistência
    const { data: rolesWithAccess } = await supabase
      .from('cargo_permissoes')
      .select('cargo_id')
      .eq('recurso_id', 'assistencia_tickets')
      .eq('tem_acesso', true);
    
    const rolesWithAssistIds = rolesWithAccess?.map(r => r.cargo_id) || [];

    // 4. Filtrar utilizadores alvo
    const targetUserIds = allProfiles
      .filter(p => {
        const isAdmin = p.is_admin === true || p.is_admin === 1 || String(p.is_admin).toLowerCase() === 'true';
        const isSupervisor = p.cargo?.toLowerCase().includes('supervisor') || p.cargo?.toLowerCase().includes('super');
        const isAssistManager = rolesWithAssistIds.includes(p.cargo_id);
        
        return isAdmin || isSupervisor || isAssistManager;
      })
      .map(p => p.id);

    console.log(`👥 Utilizadores base encontrados: ${targetUserIds.length}`);
    if (targetUserIds.length > 0) {
      console.log('Nomes dos incluídos:', allProfiles.filter(p => targetUserIds.includes(p.id)).map(p => p.nome).join(', '));
    }

    // 5. Processar cada ticket
    for (const ticket of tickets) {
      const userIdsForThisTicket = new Set([...targetUserIds]);
      
      // Sempre incluir o criador
      if (ticket.criado_por) userIdsForThisTicket.add(ticket.criado_por);

      // Adicionar Gestor do Motorista
      if (ticket.motorista_id) {
        const { data: motorista } = await supabase
          .from('motoristas')
          .select('gestor_id')
          .eq('id', ticket.motorista_id)
          .maybeSingle();
        
        if (motorista?.gestor_id) {
          userIdsForThisTicket.add(motorista.gestor_id);
        }
      }

      // Preparar entradas de acesso
      const accessEntries = Array.from(userIdsForThisTicket).map(uid => ({
        ticket_id: ticket.id,
        user_id: uid,
        tipo_acesso: 'visualizacao'
      }));

      if (accessEntries.length > 0) {
        for (const entry of accessEntries) {
          await supabase
            .from('assistencia_ticket_acessos')
            .upsert({
              ticket_id: entry.ticket_id,
              user_id: entry.user_id,
              tipo_acesso: 'visualizacao'
            }, { onConflict: 'ticket_id,user_id' });
        }
      }
      process.stdout.write('.');
    }

    console.log('\n✅ Atualização concluída! Agora todos devem ter acesso.');
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
  }
}

runRetroactiveFix();
