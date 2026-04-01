import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) throw new Error("BREVO_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const currentHour = now.getUTCHours(); // UTC

    // We determine "today" and "tomorrow" in Europe/Lisbon (UTC+0 or UTC+1)
    // Simplified: use UTC dates
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    let totalSent = 0;

    // 1. Véspera reminders: events tomorrow where lembrete_enviado_vespera = false
    const { data: vesperaEvents, error: vesperaError } = await supabase
      .from('calendario_eventos')
      .select('*')
      .gte('data_inicio', `${tomorrowStr}T00:00:00Z`)
      .lt('data_inicio', `${tomorrowStr}T23:59:59Z`)
      .eq('lembrete_enviado_vespera', false);

    if (vesperaError) {
      console.error('Erro ao buscar eventos véspera:', vesperaError);
    }

    for (const evento of (vesperaEvents || [])) {
      await sendReminder(supabase, brevoApiKey, evento, 'vespera');
      await supabase
        .from('calendario_eventos')
        .update({ lembrete_enviado_vespera: true })
        .eq('id', evento.id);
      totalSent++;
    }

    // 2. Day reminders: events today where lembrete_enviado_dia = false
    // Send around 8h UTC (adjust if needed for Lisbon time)
    if (currentHour >= 7 && currentHour <= 9) {
      const { data: diaEvents, error: diaError } = await supabase
        .from('calendario_eventos')
        .select('*')
        .gte('data_inicio', `${todayStr}T00:00:00Z`)
        .lt('data_inicio', `${todayStr}T23:59:59Z`)
        .eq('lembrete_enviado_dia', false);

      if (diaError) {
        console.error('Erro ao buscar eventos do dia:', diaError);
      }

      for (const evento of (diaEvents || [])) {
        await sendReminder(supabase, brevoApiKey, evento, 'dia');
        await supabase
          .from('calendario_eventos')
          .update({ lembrete_enviado_dia: true })
          .eq('id', evento.id);
        totalSent++;
      }
    }

    console.log(`Lembretes enviados: ${totalSent}`);

    return new Response(JSON.stringify({ success: true, sent: totalSent }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erro nos lembretes:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function sendReminder(
  supabase: any,
  brevoApiKey: string,
  evento: any,
  tipo: 'vespera' | 'dia'
) {
  // Get creator email from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, nome')
    .eq('id', evento.criado_por)
    .single();

  if (!profile?.email) {
    console.log(`Sem email para o criador ${evento.criado_por}`);
    return;
  }

  // Get CC email
  const { data: config } = await supabase
    .from('calendario_config')
    .select('email_cc')
    .eq('user_id', evento.criado_por)
    .maybeSingle();

  const recipients = [{ email: profile.email, name: profile.nome || profile.email }];
  const ccList = config?.email_cc ? [{ email: config.email_cc }] : undefined;

  const dataEvento = new Date(evento.data_inicio);
  const dataFormatada = dataEvento.toLocaleDateString('pt-PT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const horaFormatada = evento.dia_todo ? 'Dia inteiro' : dataEvento.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const isVespera = tipo === 'vespera';

  const TIPO_LABELS: Record<string, string> = {
    entrega: 'Entrega', recolha: 'Recolha', devolucao: 'Devolução',
  };
  function fmtMatricula(val: string): string {
    const clean = val.replace(/[-\s]/g, '').toUpperCase();
    return clean.match(/.{1,2}/g)?.join('-') || clean;
  }
  const matriculaFmt = fmtMatricula(evento.titulo);
  const cidadeFmt = evento.cidade ? evento.cidade.toUpperCase() : '';
  const tipoLabel = TIPO_LABELS[evento.tipo] || evento.tipo;
  const displayTitle = `${matriculaFmt}${cidadeFmt ? ' ' + cidadeFmt : ''}`;

  const subject = isVespera
    ? `📅 Amanhã: ${tipoLabel} - ${displayTitle}`
    : `📅 Hoje: ${tipoLabel} - ${displayTitle}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a1a2e; padding: 24px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">
          ${isVespera ? '🔔 Lembrete - Amanhã' : '🔔 Lembrete - Hoje'}
        </h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 10px;">
        <h2 style="margin-top: 0;">${displayTitle}</h2>
        <p><strong>Tipo:</strong> ${tipoLabel}</p>
        <p><strong>Data:</strong> ${dataFormatada}</p>
        <p><strong>Hora:</strong> ${horaFormatada}</p>
      </div>
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
        © ${new Date().getFullYear()} Década Ousada. Email automático.
      </p>
    </body>
    </html>
  `;

  const emailData: any = {
    sender: { name: "Década Ousada", email: "noreply@dasprent.pt" },
    to: recipients,
    subject,
    htmlContent,
  };
  if (ccList) emailData.cc = ccList;

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': brevoApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(emailData),
  });

  if (!resp.ok) {
    const errData = await resp.json();
    console.error(`Erro Brevo para ${profile.email}:`, errData);
  } else {
    console.log(`Lembrete ${tipo} enviado para ${profile.email} - ${evento.titulo}`);
  }
}
