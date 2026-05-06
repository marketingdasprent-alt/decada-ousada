import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "motoristas.tvde@distanciaarrojada.pt";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const { email, nome } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestedAt = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

    // Notify admin
    const adminEmail = {
      sender: { name: "WeGest", email: "noreply@dasprent.pt" },
      to: [{ email: ADMIN_EMAIL, name: "Suporte WeGest" }],
      subject: "Pedido de Eliminação de Conta - WeGest",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #E53333; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Pedido de Eliminação de Conta</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 10px;">
            <p>Foi recebido um pedido de eliminação de conta com os seguintes dados:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
              ${nome ? `<tr><td style="padding: 8px; font-weight: bold;">Nome:</td><td style="padding: 8px;">${nome}</td></tr>` : ""}
              <tr><td style="padding: 8px; font-weight: bold;">Data do pedido:</td><td style="padding: 8px;">${requestedAt}</td></tr>
            </table>
            <p style="margin-top: 20px;">Por favor, processe este pedido eliminando a conta e todos os dados associados.</p>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            © ${new Date().getFullYear()} WeGest. Email automático.
          </p>
        </body>
        </html>
      `,
    };

    // Confirmation to user
    const userEmail = {
      sender: { name: "WeGest", email: "noreply@dasprent.pt" },
      to: [{ email, name: nome || email.split("@")[0] }],
      subject: "Confirmação do Pedido de Eliminação de Conta - WeGest",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #111; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 22px;">WeGest</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 10px;">
            <h2 style="margin-top: 0;">Pedido recebido</h2>
            <p>Olá${nome ? ` ${nome}` : ""},</p>
            <p>Recebemos o seu pedido de eliminação de conta e dados associados.</p>
            <p>O nosso equipa irá processar o pedido e eliminar todos os seus dados pessoais no prazo de <strong>30 dias</strong>, conforme exigido pelo RGPD.</p>
            <p>Receberá uma confirmação por email quando o processo estiver concluído.</p>
            <p>Se não submeteu este pedido, por favor contacte-nos imediatamente através de <a href="mailto:${ADMIN_EMAIL}" style="color: #E53333;">${ADMIN_EMAIL}</a>.</p>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            © ${new Date().getFullYear()} WeGest. Email automático.
          </p>
        </body>
        </html>
      `,
    };

    const sendEmail = async (payload: object) => {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Brevo error: ${err.message || "Unknown"}`);
      }
      return res.json();
    };

    await sendEmail(adminEmail);
    await sendEmail(userEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Pedido enviado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro ao processar pedido de eliminação:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
