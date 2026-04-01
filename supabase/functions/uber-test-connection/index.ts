import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clientSecret = typeof body.client_secret === "string" ? body.client_secret.trim() : "";
    const integracaoId = typeof body.integracao_id === "string" ? body.integracao_id.trim() : "";

    if (!clientSecret) {
      return jsonResponse({
        success: false,
        error: "Client Secret é obrigatório para validação HMAC dos webhooks.",
      }, 400);
    }

    console.log("=== TESTANDO CONEXÃO UBER (Webhook-Only) ===");

    // Build webhook URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = supabaseUrl && integracaoId
      ? `${supabaseUrl}/functions/v1/uber-webhook?integracao_id=${integracaoId}`
      : null;

    return jsonResponse({
      success: true,
      message: "Configuração Uber validada. Modo webhook-only — os dados chegam automaticamente via webhook da Uber.",
      webhook_url: webhookUrl,
      mode: "webhook_only",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    console.error("Erro ao testar conexão Uber:", message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
