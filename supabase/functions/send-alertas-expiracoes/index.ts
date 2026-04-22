import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;

    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY não configurado');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const today = new Date();

    // ── Extintores: validade <= today + 15 dias ──────────────────────────────
    const limitExtintor = new Date(today);
    limitExtintor.setDate(limitExtintor.getDate() + 15);
    const limitExtintorStr = limitExtintor.toISOString().split('T')[0];

    const { data: extintores } = await supabase
      .from('motorista_viaturas')
      .select(`
        id,
        extintor_validade,
        extintor_numero,
        motoristas ( id, nome, gestor_responsavel ),
        viaturas ( matricula )
      `)
      .eq('status', 'ativo')
      .not('extintor_validade', 'is', null)
      .lte('extintor_validade', limitExtintorStr)
      .order('extintor_validade', { ascending: true });

    // ── Contratos: assinatura + 12 meses <= today + 15 dias ─────────────────
    // => assinatura <= today + 15 dias - 12 meses
    const upperContrato = new Date(limitExtintor);
    upperContrato.setFullYear(upperContrato.getFullYear() - 1);
    const upperContratoStr = upperContrato.toISOString().split('T')[0];

    // Lower bound: não mostrar contratos expirados há mais de 60 dias
    const lowerContrato = new Date(today);
    lowerContrato.setDate(lowerContrato.getDate() - 60);
    lowerContrato.setFullYear(lowerContrato.getFullYear() - 1);
    const lowerContratoStr = lowerContrato.toISOString().split('T')[0];

    const { data: contratos } = await supabase
      .from('motorista_viaturas')
      .select(`
        id,
        contrato_prestacao_assinatura,
        motoristas ( id, nome, gestor_responsavel ),
        viaturas ( matricula )
      `)
      .eq('status', 'ativo')
      .not('contrato_prestacao_assinatura', 'is', null)
      .gte('contrato_prestacao_assinatura', lowerContratoStr)
      .lte('contrato_prestacao_assinatura', upperContratoStr)
      .order('contrato_prestacao_assinatura', { ascending: true });

    const totalAlertas = (extintores?.length ?? 0) + (contratos?.length ?? 0);
    if (totalAlertas === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Sem alertas para enviar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Supervisores Gestores TVDE ────────────────────────────────────────────
    const { data: supervisoresProfiles } = await supabase
      .from('profiles')
      .select('email, nome')
      .not('email', 'is', null)
      .eq('cargo', 'Supervisor Gestor TVDE');

    const { data: supervisoresCargo } = await supabase
      .from('profiles')
      .select('email, nome, cargos ( nome )')
      .not('email', 'is', null);

    const supervisorEmails = new Map<string, string>();
    (supervisoresProfiles || []).forEach(s => {
      if (s.email && s.nome) supervisorEmails.set(s.email, s.nome);
    });
    (supervisoresCargo || []).forEach((s: any) => {
      if (s.email && s.cargos?.nome === 'Supervisor Gestor TVDE') {
        supervisorEmails.set(s.email, s.nome || 'Supervisor');
      }
    });

    // ── Emails dos gestores responsáveis ─────────────────────────────────────
    const gestorNomes = new Set<string>();
    [...(extintores || []), ...(contratos || [])].forEach((item: any) => {
      const gestor = item.motoristas?.gestor_responsavel;
      if (gestor) gestorNomes.add(gestor);
    });

    const gestorEmailMap = new Map<string, string>();
    if (gestorNomes.size > 0) {
      const { data: gestorProfiles } = await supabase
        .from('profiles')
        .select('nome, email')
        .in('nome', [...gestorNomes])
        .not('email', 'is', null);

      (gestorProfiles || []).forEach((p: any) => {
        if (p.nome && p.email) gestorEmailMap.set(p.nome, p.email);
      });
    }

    // ── Helpers HTML ─────────────────────────────────────────────────────────
    const diffDays = (dateStr: string) =>
      Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);

    const buildExtRows = (list: any[]) =>
      list.map(e => {
        const diff = diffDays(e.extintor_validade);
        const isExpired = diff < 0;
        const color = isExpired ? '#dc2626' : '#ea580c';
        const status = isExpired ? `Expirado há ${Math.abs(diff)} dias` : `Expira em ${diff} dias`;
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${e.motoristas?.nome || '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${e.viaturas?.matricula || '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${e.extintor_numero || '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${new Date(e.extintor_validade).toLocaleDateString('pt-PT')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:${color};font-weight:600">${status}</td>
        </tr>`;
      }).join('');

    const buildCtRows = (list: any[]) =>
      list.map(c => {
        const expiry = new Date(c.contrato_prestacao_assinatura);
        expiry.setFullYear(expiry.getFullYear() + 1);
        const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
        const isExpired = diff < 0;
        const color = isExpired ? '#dc2626' : '#2563eb';
        const status = isExpired ? `Expirado há ${Math.abs(diff)} dias` : `Expira em ${diff} dias`;
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${c.motoristas?.nome || '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${c.viaturas?.matricula || '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${new Date(c.contrato_prestacao_assinatura).toLocaleDateString('pt-PT')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${expiry.toLocaleDateString('pt-PT')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:${color};font-weight:600">${status}</td>
        </tr>`;
      }).join('');

    const buildHtml = (extList: any[], ctList: any[], recipientName?: string) => {
      const greeting = recipientName ? `Olá, <strong>${recipientName}</strong>!` : 'Olá!';
      const dateStr = today.toLocaleDateString('pt-PT');

      const extSection = extList.length > 0 ? `
        <div style="background:white;padding:24px;border-radius:12px;margin-bottom:20px">
          <h2 style="color:#ea580c;margin-top:0;font-size:16px">🔥 Extintores a Expirar (${extList.length})</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#fef3c7">
                <th style="text-align:left;padding:8px 12px;color:#92400e">Motorista</th>
                <th style="text-align:left;padding:8px 12px;color:#92400e">Viatura</th>
                <th style="text-align:left;padding:8px 12px;color:#92400e">Nº Extintor</th>
                <th style="text-align:left;padding:8px 12px;color:#92400e">Validade</th>
                <th style="text-align:left;padding:8px 12px;color:#92400e">Estado</th>
              </tr>
            </thead>
            <tbody>${buildExtRows(extList)}</tbody>
          </table>
        </div>` : '';

      const ctSection = ctList.length > 0 ? `
        <div style="background:white;padding:24px;border-radius:12px;margin-bottom:20px">
          <h2 style="color:#2563eb;margin-top:0;font-size:16px">📋 Contratos de Prestação a Expirar (${ctList.length})</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#dbeafe">
                <th style="text-align:left;padding:8px 12px;color:#1e40af">Motorista</th>
                <th style="text-align:left;padding:8px 12px;color:#1e40af">Viatura</th>
                <th style="text-align:left;padding:8px 12px;color:#1e40af">Data Assinatura</th>
                <th style="text-align:left;padding:8px 12px;color:#1e40af">Data Expiração</th>
                <th style="text-align:left;padding:8px 12px;color:#1e40af">Estado</th>
              </tr>
            </thead>
            <tbody>${buildCtRows(ctList)}</tbody>
          </table>
        </div>` : '';

      return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px;background:#f5f5f5">
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d6a9f 100%);padding:28px;border-radius:12px;text-align:center;margin-bottom:24px">
    <h1 style="color:white;margin:0;font-size:22px">⚠️ Alertas de Renovação</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Década Ousada — ${dateStr}</p>
  </div>
  <div style="background:white;padding:24px;border-radius:12px;margin-bottom:20px">
    <p style="margin-top:0">${greeting}</p>
    <p style="margin-bottom:0">Relatório automático de contratos e extintores com renovação pendente nos próximos <strong>15 dias</strong>.</p>
  </div>
  ${extSection}
  ${ctSection}
  <div style="text-align:center;color:#888;font-size:12px;padding:16px">
    <p>Email automático — Década Ousada CRM. Não responda a esta mensagem.</p>
  </div>
</body>
</html>`;
    };

    // ── Envio de emails ───────────────────────────────────────────────────────
    const sendEmail = async (toEmail: string, toName: string, html: string) => {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Década Ousada CRM', email: 'noreply@dasprent.pt' },
          to: [{ email: toEmail, name: toName }],
          subject: `⚠️ Alertas de Renovação — ${today.toLocaleDateString('pt-PT')}`,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Brevo error para ${toEmail}: ${JSON.stringify(err)}`);
      }
    };

    const sentTo: string[] = [];

    // Gestores: cada um recebe apenas os alertas dos seus motoristas
    for (const [gestorNome, gestorEmail] of gestorEmailMap.entries()) {
      const gestorExt = (extintores || []).filter(
        (e: any) => e.motoristas?.gestor_responsavel === gestorNome
      );
      const gestorCt = (contratos || []).filter(
        (c: any) => c.motoristas?.gestor_responsavel === gestorNome
      );
      if (gestorExt.length === 0 && gestorCt.length === 0) continue;
      await sendEmail(gestorEmail, gestorNome, buildHtml(gestorExt, gestorCt, gestorNome));
      sentTo.push(gestorEmail);
    }

    // Supervisores: recebem todos os alertas
    for (const [email, nome] of supervisorEmails.entries()) {
      await sendEmail(email, nome, buildHtml(extintores || [], contratos || [], nome));
      sentTo.push(email);
    }

    console.log(`Alertas enviados para: ${sentTo.join(', ')}`);

    return new Response(
      JSON.stringify({ success: true, sentTo, totalAlertas }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('send-alertas-expiracoes error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
