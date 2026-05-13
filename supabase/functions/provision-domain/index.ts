import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Subdomínios reservados que não podem ser usados como codigo de org
const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "app", "admin", "mail", "ftp", "smtp", "pop", "imap",
  "ns1", "ns2", "staging", "dev", "test", "cdn", "static", "assets",
]);

const DOMAIN_BASE = "wegest.pt";
const VERCEL_CNAME = "cname.vercel-dns.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cloudflareToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
  const cloudflareZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;
  const vercelToken = Deno.env.get("VERCEL_TOKEN")!;
  const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID") || "prj_S3tMZcGZ9hvbbMTo8euhNHMLYdTU";
  const vercelTeamId = Deno.env.get("VERCEL_TEAM_ID") || "team_LbIAiF1DErIEcpkjCcL1SM4Y";

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Autenticar — aceitar apenas service_role_key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { org_id, codigo } = await req.json();

    if (!org_id || !codigo) {
      return new Response(
        JSON.stringify({ error: "org_id e codigo são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar codigo como subdomínio válido
    const codigoLower = codigo.toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(codigoLower)) {
      await updateStatus(supabase, org_id, "erro", "Codigo inválido para subdomínio. Use apenas letras minúsculas, números e hífens.");
      return jsonResponse({ success: false, error: "Codigo inválido para subdomínio" }, 400);
    }

    if (codigoLower.length < 3 || codigoLower.length > 63) {
      await updateStatus(supabase, org_id, "erro", "Codigo deve ter entre 3 e 63 caracteres.");
      return jsonResponse({ success: false, error: "Codigo deve ter entre 3 e 63 caracteres" }, 400);
    }

    if (RESERVED_SUBDOMAINS.has(codigoLower)) {
      await updateStatus(supabase, org_id, "erro", `Subdomínio "${codigoLower}" é reservado.`);
      return jsonResponse({ success: false, error: "Subdomínio reservado" }, 400);
    }

    const fullDomain = `${codigoLower}.${DOMAIN_BASE}`;
    let cloudflareRecordId: string | null = null;

    // ========== PASSO 1: Criar CNAME no Cloudflare ==========
    console.log(`[provision-domain] Criando CNAME ${fullDomain} → ${VERCEL_CNAME}`);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/dns_records`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cloudflareToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "CNAME",
          name: fullDomain,
          content: VERCEL_CNAME,
          ttl: 1, // automatic
          proxied: false, // obrigatório para SSL do Vercel
        }),
      }
    );

    const cfData = await cfResponse.json();

    if (!cfData.success) {
      // Se já existe, tentar encontrar o record existente
      const alreadyExists = cfData.errors?.some((e: any) =>
        e.message?.includes("already exists") || e.code === 81057
      );

      if (alreadyExists) {
        console.log(`[provision-domain] CNAME ${fullDomain} já existe no Cloudflare, continuando...`);
        // Buscar o record ID existente
        const listResp = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/dns_records?name=${fullDomain}&type=CNAME`,
          {
            headers: { "Authorization": `Bearer ${cloudflareToken}` },
          }
        );
        const listData = await listResp.json();
        if (listData.success && listData.result?.length > 0) {
          cloudflareRecordId = listData.result[0].id;
        }
      } else {
        const errMsg = cfData.errors?.map((e: any) => e.message).join("; ") || "Erro desconhecido no Cloudflare";
        console.error(`[provision-domain] Cloudflare error:`, errMsg);
        await updateStatus(supabase, org_id, "erro", `Cloudflare: ${errMsg}`);
        return jsonResponse({ success: false, error: errMsg }, 502);
      }
    } else {
      cloudflareRecordId = cfData.result?.id || null;
      console.log(`[provision-domain] CNAME criado com sucesso. Record ID: ${cloudflareRecordId}`);
    }

    // ========== PASSO 2: Adicionar domínio ao Vercel ==========
    console.log(`[provision-domain] Adicionando ${fullDomain} ao projeto Vercel...`);

    const vercelResponse = await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/domains?teamId=${vercelTeamId}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: fullDomain }),
      }
    );

    const vercelData = await vercelResponse.json();

    if (!vercelResponse.ok) {
      // Se já existe no projeto, tratar como sucesso
      const alreadyExists = vercelData.error?.code === "domain_already_in_use" ||
                            vercelData.error?.code === "domain_already_added";

      if (!alreadyExists) {
        const errMsg = vercelData.error?.message || "Erro desconhecido no Vercel";
        console.error(`[provision-domain] Vercel error:`, errMsg);

        // Rollback: apagar CNAME do Cloudflare se foi criado nesta execução
        if (cloudflareRecordId) {
          console.log(`[provision-domain] Rollback: apagando CNAME ${cloudflareRecordId}...`);
          await fetch(
            `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/dns_records/${cloudflareRecordId}`,
            {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${cloudflareToken}` },
            }
          );
        }

        await updateStatus(supabase, org_id, "erro", `Vercel: ${errMsg}`);
        return jsonResponse({ success: false, error: errMsg }, 502);
      }

      console.log(`[provision-domain] Domínio ${fullDomain} já existe no Vercel, continuando...`);
    } else {
      console.log(`[provision-domain] Domínio adicionado ao Vercel com sucesso.`);
    }

    // ========== SUCESSO ==========
    await updateStatus(supabase, org_id, "ativo", null);

    return jsonResponse({
      success: true,
      domain: fullDomain,
      cloudflare_record_id: cloudflareRecordId,
    });

  } catch (error) {
    console.error("[provision-domain] Erro inesperado:", error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});

// ============ Helpers ============

async function updateStatus(
  supabase: any,
  orgId: string,
  status: string,
  erro: string | null
) {
  const { error } = await supabase
    .from("organizacoes")
    .update({ dominio_status: status, dominio_erro: erro })
    .eq("id", orgId);

  if (error) {
    console.error(`[provision-domain] Erro ao atualizar status para ${status}:`, error);
  }
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
