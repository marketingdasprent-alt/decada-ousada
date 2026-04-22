// Este script usa a Service Role Key para atualizar diretamente a BD
// sem restrições de RLS

const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const INTEGRACAO_ID = "b1789816-92e3-48a4-b012-034c1a95d201";

// Precisamos da REST API diretamente com a service_role key
// Como só temos a anon key aqui, vamos usar a REST API com UPDATE

async function fixPlatform() {
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

  console.log("A verificar estado atual da integração Uber Açores...");

  // Primeiro ler o estado atual
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/plataformas_configuracao?id=eq.${INTEGRACAO_ID}&select=id,nome,plataforma,robot_target_platform,ativo`,
    {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
      }
    }
  );

  const rows = await getRes.json();
  if (!rows || rows.length === 0) {
    console.log("❌ Linha não encontrada. Pode ser bloqueada por RLS com a anon key.");
    console.log("\n👉 AÇÃO MANUAL NECESSÁRIA no Supabase:");
    console.log("   Vai a: https://supabase.com/dashboard/project/hkqzzxgeedsmjnhyquke/editor");
    console.log("   E corre este SQL:\n");
    console.log(`UPDATE plataformas_configuracao`);
    console.log(`SET plataforma = 'uber', robot_target_platform = NULL`);
    console.log(`WHERE id = '${INTEGRACAO_ID}';`);
    return;
  }

  console.log("Estado atual:", rows[0]);

  if (rows[0].plataforma === 'uber') {
    console.log("✅ plataforma já é 'uber'. Nada a alterar na BD!");
    return;
  }

  // Tentar atualizar via REST
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/plataformas_configuracao?id=eq.${INTEGRACAO_ID}`,
    {
      method: "PATCH",
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        plataforma: "uber",
        robot_target_platform: null
      })
    }
  );

  if (patchRes.ok) {
    const updated = await patchRes.json();
    console.log("✅ Base de dados atualizada com sucesso!");
    console.log("Novo estado:", updated);
  } else {
    const errText = await patchRes.text();
    console.log("⚠️  Não foi possível atualizar via anon key (RLS bloqueou).");
    console.log("   Detalhes:", errText);
    console.log("\n👉 AÇÃO MANUAL NECESSÁRIA - Corre este SQL no Supabase SQL Editor:");
    console.log("   https://supabase.com/dashboard/project/hkqzzxgeedsmjnhyquke/sql/new");
    console.log("\n--- COPIAR O SQL ABAIXO ---");
    console.log(`UPDATE plataformas_configuracao SET plataforma = 'uber', robot_target_platform = NULL WHERE id = '${INTEGRACAO_ID}';`);
    console.log("--- FIM DO SQL ---");
  }
}

fixPlatform();
