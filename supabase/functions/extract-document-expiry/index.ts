import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { filePath, mimeType } = await req.json();
    if (!filePath) {
      return new Response(JSON.stringify({ date: null, error: 'filePath is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return new Response(JSON.stringify({ date: null, error: 'GEMINI_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    // Download file from storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: fileData, error: dlError } = await supabase.storage
      .from('motorista-documentos')
      .download(filePath);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ date: null, error: dlError?.message }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    // Convert to base64 (chunk to avoid stack overflow)
    const bytes = new Uint8Array(await fileData.arrayBuffer());
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Data = btoa(binary);

    // Determine media type
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const resolvedMime = mimeType ||
      (ext === 'pdf' ? 'application/pdf' :
       ext === 'png' ? 'image/png' :
       'image/jpeg');

    // Build Gemini content part
    const inlinePart = {
      inline_data: {
        mime_type: resolvedMime,
        data: base64Data,
      },
    };

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              inlinePart,
              {
                text: `Analisa este documento e encontra a data de VALIDADE/EXPIRAÇÃO.
REGRAS IMPORTANTES:
- Procura especificamente por campos como "Validade", "Válido até", "Data de validade", "Expiry", "Valid until"
- IGNORA completamente números de referência, números de certificado, números de processo, NIFs, NISPs e qualquer número que não esteja explicitamente identificado como data de validade
- IGNORA o ano presente em números de documento como "n.º 1062037/2026" — esse não é uma data de validade
- A data de validade é normalmente uma data futura (vários anos no futuro)
- Responde SOMENTE com a data no formato YYYY-MM-DD (ex: 2031-03-19)
- Se não encontrares nenhuma data de validade explícita, responde apenas com a palavra: null`,
              },
            ],
          }],
          generationConfig: { maxOutputTokens: 30, temperature: 0 },
        }),
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error('Gemini error:', errText);
      return new Response(JSON.stringify({ date: null, error: 'AI API error' }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const aiResult = await geminiResp.json();
    const rawText = (aiResult.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    // Extract ISO date
    const match = rawText.match(/\d{4}-\d{2}-\d{2}/);
    const date = match ? match[0] : null;

    return new Response(JSON.stringify({ date }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (err: any) {
    console.error('extract-document-expiry error:', err);
    return new Response(JSON.stringify({ date: null, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
