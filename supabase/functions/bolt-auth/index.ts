import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache simples para o token (em memória)
let tokenCache: { token: string; expiresAt: number } | null = null;

interface BoltTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

async function getBoltToken(clientId: string, clientSecret: string): Promise<string> {
  // Verificar cache (com margem de 60 segundos antes de expirar)
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    console.log("Usando token em cache");
    return tokenCache.token;
  }

  console.log("Obtendo novo token da Bolt API");

  const response = await fetch("https://oidc.bolt.eu/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "fleet-integration:api",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro ao obter token:", errorText);
    throw new Error(`Falha na autenticação Bolt: ${response.status} - ${errorText}`);
  }

  const data: BoltTokenResponse = await response.json();

  // Guardar em cache
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in * 1000),
  };

  console.log("Token obtido com sucesso, expira em", data.expires_in, "segundos");
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar configuração Bolt da base de dados
    const { data: config, error: configError } = await supabase
      .from("bolt_configuracao")
      .select("*")
      .eq("ativo", true)
      .single();

    if (configError || !config) {
      console.error("Erro ao buscar configuração:", configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração Bolt não encontrada ou inactiva" 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Obter token
    const token = await getBoltToken(config.client_id, config.client_secret);

    // Log de sucesso
    await supabase.from("bolt_sync_logs").insert({
      tipo: "auth",
      status: "success",
      mensagem: "Token obtido com sucesso",
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        token,
        company_id: config.company_id,
        company_name: config.company_name,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro na autenticação:", error);

    // Tentar registar log de erro
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from("bolt_sync_logs").insert({
        tipo: "auth",
        status: "error",
        mensagem: error.message,
      });
    } catch (logError) {
      console.error("Erro ao registar log:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
