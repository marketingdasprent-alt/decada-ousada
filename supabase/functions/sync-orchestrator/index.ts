import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STALE_TIMEOUT_MINUTES = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Mark stale "running" items as failed (stuck for > 10 min)
    const staleThreshold = new Date(Date.now() - STALE_TIMEOUT_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from("sync_queue")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: `Timeout: execução ultrapassou ${STALE_TIMEOUT_MINUTES} minutos`,
      })
      .eq("status", "running")
      .lt("started_at", staleThreshold);

    // 2. Check if something is already running
    const { data: running } = await supabase
      .from("sync_queue")
      .select("id")
      .eq("status", "running")
      .limit(1);

    if (running && running.length > 0) {
      return new Response(
        JSON.stringify({ success: true, action: "skip", message: "Já existe uma sincronização em execução" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Enqueue integrations that are due for sync
    const { data: integracoes } = await supabase
      .from("plataformas_configuracao")
      .select("id, plataforma, robot_target_platform, ultimo_sync, intervalo_sync_horas, sync_automatico")
      .eq("ativo", true)
      .eq("sync_automatico", true);

    if (integracoes && integracoes.length > 0) {
      const now = Date.now();
      for (const integ of integracoes) {
        const intervalMs = (integ.intervalo_sync_horas || 168) * 60 * 60 * 1000;
        const lastSync = integ.ultimo_sync ? new Date(integ.ultimo_sync).getTime() : 0;
        const isDue = (now - lastSync) >= intervalMs;

        if (isDue) {
          // Check if already queued (pending) for this integration
          const { data: existing } = await supabase
            .from("sync_queue")
            .select("id")
            .eq("integracao_id", integ.id)
            .eq("status", "pending")
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from("sync_queue").insert({
              integracao_id: integ.id,
              plataforma: integ.plataforma,
              robot_target_platform: integ.robot_target_platform || null,
              status: "pending",
            });
          }
        }
      }
    }

    // 4. Pick the oldest pending item
    const { data: nextItems } = await supabase
      .from("sync_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (!nextItems || nextItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, action: "noop", message: "Nenhuma sincronização pendente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const item = nextItems[0];

    // 5. Mark as running
    await supabase
      .from("sync_queue")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", item.id);

    // 6. Execute the correct function
    let functionName: string;
    let body: Record<string, unknown>;

    if (item.plataforma === "robot") {
      functionName = "robot-execute";
      body = { integracao_id: item.integracao_id };
    } else if (item.plataforma === "bolt") {
      functionName = "bolt-full-sync";
      body = { integracao_id: item.integracao_id };
    } else if (item.plataforma === "bp") {
      functionName = "bp-sync-transactions";
      body = { integracao_id: item.integracao_id };
    } else {
      // Unknown platform - mark as failed
      await supabase
        .from("sync_queue")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: `Plataforma desconhecida: ${item.plataforma}`,
        })
        .eq("id", item.id);

      return new Response(
        JSON.stringify({ success: false, error: `Plataforma desconhecida: ${item.plataforma}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      console.log(`Executing ${functionName} for integracao ${item.integracao_id}`);

      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText };
      }

      if (response.ok && (result.success !== false)) {
        await supabase
          .from("sync_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", item.id);

        console.log(`Sync completed for ${item.integracao_id}`);
      } else {
        const errorMsg = result?.error || result?.message || `HTTP ${response.status}`;
        await supabase
          .from("sync_queue")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: errorMsg,
          })
          .eq("id", item.id);

        console.error(`Sync failed for ${item.integracao_id}: ${errorMsg}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "executed",
          integracao_id: item.integracao_id,
          function: functionName,
          result_status: response.ok ? "completed" : "failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (execError: any) {
      console.error(`Execution error for ${item.integracao_id}:`, execError);
      await supabase
        .from("sync_queue")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: execError.message || "Erro de execução",
        })
        .eq("id", item.id);

      return new Response(
        JSON.stringify({ success: false, error: execError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("sync-orchestrator error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
