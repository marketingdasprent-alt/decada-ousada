import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { integracao_id, cron_expression, action } = await req.json();

    if (!integracao_id) {
      return new Response(
        JSON.stringify({ error: "integracao_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete action — disable sync_automatico
    if (action === "delete") {
      const { error } = await supabase
        .from("plataformas_configuracao")
        .update({ sync_automatico: false })
        .eq("id", integracao_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Não foi possível desactivar.", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Schedule action — enable sync_automatico with interval
    if (!cron_expression) {
      return new Response(
        JSON.stringify({ error: "cron_expression é obrigatório para criar agendamento" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse hours from cron expression (e.g. "0 */6 * * *" → 6)
    const hoursMatch = cron_expression.match(/\*\/(\d+)/);
    const intervalHours = hoursMatch ? parseInt(hoursMatch[1], 10) : 6;

    const { error } = await supabase
      .from("plataformas_configuracao")
      .update({
        sync_automatico: true,
        intervalo_sync_horas: intervalHours,
      })
      .eq("id", integracao_id);

    if (error) {
      return new Response(
        JSON.stringify({ error: "Não foi possível activar o agendamento.", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, action: "scheduled", cron_expression, intervalo_sync_horas: intervalHours }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bolt-schedule error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
