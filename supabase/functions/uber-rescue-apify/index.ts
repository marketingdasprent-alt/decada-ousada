import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { integracao_id } = await req.json();
    if (!integracao_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'integracao_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Get configuration
    const { data: config, error: configError } = await supabase
      .from('plataformas_configuracao')
      .select('*')
      .eq('id', integracao_id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, error: 'Integração não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apifyToken = config.apify_api_token;
    const actorId = config.apify_actor_id;

    if (!apifyToken || !actorId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token ou Actor ID do Apify não configurados' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Rescuing Uber data for ${config.nome} (${integracao_id})`);

    // 2. Fetch the last successful run from Apify
    const runsResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?limit=1&desc=1&status=SUCCEEDED&token=${apifyToken}`
    );
    const runsData = await runsResponse.json();
    
    if (!runsData.data?.items?.[0]) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma execução bem-sucedida encontrada no Apify' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const lastRun = runsData.data.items[0];
    const datasetId = lastRun.defaultDatasetId;

    // 3. Get the dataset content (CSV)
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?format=csv&token=${apifyToken}`
    );
    const csvContent = await datasetResponse.text();

    if (!csvContent || csvContent.length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'O dataset do Apify está vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Forward to UBER import function (uber-import-reports)
    // We try to detect if it's payment or activities based on some keywords or just try both
    const isPayment = csvContent.includes('Data do pagamento') || csvContent.includes('Payment');
    
    const importBody: any = {
      integracao_id: integracao_id,
      origem: 'Apify Rescue',
      data_extracao: new Date().toISOString(),
    };

    if (isPayment) {
      importBody.pagamentos_csv = csvContent;
    } else {
      importBody.viagens_csv = csvContent;
    }

    const importResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/uber-import-reports`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importBody),
      },
    );

    const importResult = await importResponse.json();

    return new Response(
      JSON.stringify({
        success: importResponse.ok,
        message: importResponse.ok ? 'Resgate Uber concluído com sucesso' : 'Erro ao processar dados Uber resgatados',
        import_result: importResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('uber-rescue-apify error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
