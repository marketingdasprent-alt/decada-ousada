import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOLT_API_BASE = "https://node.bolt.eu/fleet-integration-gateway";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { client_id, client_secret, company_id } = body;

    if (!client_id || !client_secret) {
      return new Response(
        JSON.stringify({ success: false, error: "Client ID e Client Secret são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== TESTANDO CONEXÃO BOLT ===");

    // Tentar obter token
    const tokenResponse = await fetch("https://oidc.bolt.eu/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "client_credentials",
        scope: "fleet-integration:api",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Erro na autenticação:", errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Credenciais inválidas: ${tokenResponse.status}`,
          details: errorText
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("Token obtido com sucesso. Expira em:", tokenData.expires_in, "segundos");

    // Se company_id foi fornecido, tentar buscar dados da empresa
    let companyInfo = null;
    let driversInfo = null;
    
    if (company_id) {
      // Tentar buscar viagens para validar
      try {
        const ordersUrl = `${BOLT_API_BASE}/fleetIntegration/v1/getFleetOrders`;
        console.log("Testando endpoint:", ordersUrl);
        
        const ordersResponse = await fetch(ordersUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_ids: [parseInt(company_id)],  // ← Array obrigatório
            limit: 1,
            offset: 0,
            start_ts: Math.floor(Date.now() / 1000) - 86400,
            end_ts: Math.floor(Date.now() / 1000),
          }),
        });

        console.log("getFleetOrders Response:", ordersResponse.status);
        const ordersText = await ordersResponse.text();
        console.log("getFleetOrders Body:", ordersText);

        if (ordersResponse.ok) {
          const ordersData = JSON.parse(ordersText);
          companyInfo = {
            company_id: ordersData.data?.company_id,
            company_name: ordersData.data?.company_name,
            total_orders: ordersData.data?.total_orders,
            raw: ordersData,
          };
        }
      } catch (e) {
        console.warn("Erro ao validar getFleetOrders:", e);
      }

      // Tentar buscar motoristas
      try {
        const driversUrl = `${BOLT_API_BASE}/fleetIntegration/v1/getDrivers`;
        console.log("Testando endpoint:", driversUrl);
        
        const driversResponse = await fetch(driversUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_ids: [parseInt(company_id)],  // ← Array obrigatório
            start_ts: Math.floor(Date.now() / 1000) - (7 * 24 * 3600),
            end_ts: Math.floor(Date.now() / 1000),
            limit: 100,
            offset: 0,
          }),
        });

        console.log("getDrivers Response:", driversResponse.status);
        const driversText = await driversResponse.text();
        console.log("getDrivers Body:", driversText);

        if (driversResponse.ok) {
          const driversData = JSON.parse(driversText);
          driversInfo = {
            count: driversData.data?.drivers?.length || 0,
            raw: driversData,
          };
        }
      } catch (e) {
        console.warn("Erro ao buscar motoristas:", e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conexão estabelecida com sucesso",
        token_expires_in: tokenData.expires_in,
        company: companyInfo,
        drivers: driversInfo,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
