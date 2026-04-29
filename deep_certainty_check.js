const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function absoluteCertaintyCheck() {
  console.log('--- VERIFICAÇÃO DE CERTEZA ABSOLUTA ---');

  // 1. Verificar Cargos e Recursos
  const { data: cargo } = await supabase.from('cargos').select('id, nome').eq('nome', 'Gestor TVDE').single();
  const { data: recurso } = await supabase.from('recursos').select('id, nome').eq('nome', 'motoristas_gestao').single();

  if (cargo && recurso) {
    const { data: permissao } = await supabase
      .from('cargo_permissoes')
      .select('tem_acesso, pode_editar')
      .eq('cargo_id', cargo.id)
      .eq('recurso_id', recurso.id)
      .single();
    
    console.log(`Cargo 'Gestor TVDE' tem acesso a 'motoristas_gestao'?`, permissao?.tem_acesso ? 'SIM' : 'NÃO');
    console.log(`Pode editar?`, permissao?.pode_editar ? 'SIM' : 'NÃO');
  } else {
    console.log('⚠️ Cargo ou Recurso não encontrado no banco.');
  }

  // 2. Verificar quem são Eduarda e Juliana
  const { data: specialUsers } = await supabase
    .from('profiles')
    .select('nome, cargo, is_admin')
    .or('nome.ilike.%Eduarda%,nome.ilike.%Juliana%');
  
  console.log('Dados de Eduarda/Juliana:', specialUsers);

  // 3. Verificar outros gestores
  const { data: otherGestores } = await supabase
    .from('profiles')
    .select('nome, cargo, is_admin')
    .eq('cargo', 'Gestor TVDE')
    .limit(5);
  
  console.log('Amostra de outros Gestores TVDE:', otherGestores);
}

absoluteCertaintyCheck();
