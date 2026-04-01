import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY não configurada");

    const { campanha_id, start_date, end_date } = await req.json();
    if (!campanha_id) throw new Error("campanha_id é obrigatório");

    const tag = "campanha_" + campanha_id.substring(0, 8);

    // Build query params
    const params = new URLSearchParams({
      limit: "2500",
      sort: "desc",
      tags: tag,
    });
    if (start_date) params.set("startDate", start_date);
    if (end_date) params.set("endDate", end_date);

    const url = `https://api.brevo.com/v3/smtp/statistics/events?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        "api-key": BREVO_API_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brevo API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const events = data.events || [];

    // Aggregate by event type
    const totais: Record<string, number> = {
      requests: 0,
      delivered: 0,
      opened: 0,
      clicks: 0,
      hardBounces: 0,
      softBounces: 0,
      spam: 0,
      invalid: 0,
      blocked: 0,
      deferred: 0,
      unsubscribed: 0,
    };

    for (const ev of events) {
      const eventType = ev.event || "unknown";
      if (eventType in totais) {
        totais[eventType]++;
      } else {
        totais[eventType] = (totais[eventType] || 0) + 1;
      }
    }

    // Map events to a simpler structure
    const eventosSimples = events.map((ev: any) => ({
      email: ev.email,
      evento: ev.event,
      data: ev.date,
      assunto: ev.subject,
      tag: ev.tag,
      mensagem: ev.reason || ev.message || null,
    }));

    return new Response(
      JSON.stringify({ totais, eventos: eventosSimples, total_eventos: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro brevo-email-stats:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
