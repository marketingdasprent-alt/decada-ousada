import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function runFullSync() {
  console.log("1. A procurar todas as integrações configuradas nas tabelas...");
  
  const { data: integracoes, error: dbError } = await supabase
    .from('plataformas_configuracao')
    .select('id, nome, plataforma, ativo, client_id');

  if (dbError) {
    console.error("Erro ao ler tabela plataformas_configuracao:", dbError);
    return;
  }

  console.log("Integrações encontradas na base de dados:");
  console.table(integracoes);

  // Procurar a primeira que seja Uber (case-insensitive) e esteja ativa
  const uberInt = integracoes.find(i => 
    (i.plataforma && i.plataforma.toLowerCase() === 'uber' || i.nome.toLowerCase().includes('uber')) && i.ativo
  );

  if (!uberInt) {
     console.log("⚠️ Não foi encontrada nenhuma integração ATIVA com a plataforma 'uber'. Modifique no seu painel admin primeiro!");
     return;
  }

  console.log(`\nVamos utilizar a integração Uber Ativa encontrada: ${uberInt.nome} (ID: ${uberInt.id})`);
  
  if (!uberInt.client_id) {
     console.log("❌ A integração Uber precisa ter o campo 'client_id' preenchido na base de dados com a sua App ID.");
     return;
  }

  console.log("2. A pedir ao servidor para iniciar o download massivo do histórico (API Oficial)...");
  
  const { data, error } = await supabase.functions.invoke('uber-full-sync', {
    body: { integracao_id: uberInt.id }
  });

  if (error) {
    console.error("\n❌ Erro durante a sincronização:");
    console.error(error);
    return;
  }

  console.log("\n✅ Sincronização Concluída!");
  console.log("Resultado do servidor:");
  console.log(data);
}

runFullSync();
