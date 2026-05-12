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

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({ date: null, error: 'ANTHROPIC_API_KEY not configured' }), {
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

    const isPdf = resolvedMime === 'application/pdf';

    // Build content for Claude
    const docContent = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
      : { type: 'image', source: { type: 'base64', media_type: resolvedMime, data: base64Data } };

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: [
            docContent,
            {
              type: 'text',
              text: 'Este é um documento de identificação, carta de condução ou licença. Extrai APENAS a data de validade/expiração/validity. Responde SOMENTE com a data no formato YYYY-MM-DD (ex: 2028-03-15). Se o documento não tiver data de validade visível ou não conseguires identificar, responde apenas com a palavra: null',
            },
          ],
        }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error('Anthropic error:', errText);
      return new Response(JSON.stringify({ date: null, error: 'AI API error' }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const aiResult = await anthropicResp.json();
    const rawText = (aiResult.content?.[0]?.text ?? '').trim();

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
