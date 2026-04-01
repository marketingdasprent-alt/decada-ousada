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

    console.log(`Rescuing data from Apify run ${lastRun.id}, dataset ${datasetId}, started: ${lastRun.startedAt}`);

    // Calculate the ISO week for "last week" relative to the run date
    // (the robot fetches "last week" so we go back 7 days from the run)
    const runDate = new Date(lastRun.startedAt);
    const targetDate = new Date(runDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get ISO week Monday
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, ...6=Sat
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(targetDate.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
    const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);

    // Calculate ISO week number
    const jan4 = new Date(monday.getFullYear(), 0, 4);
    const jan4Day = jan4.getDay() === 0 ? 6 : jan4.getDay() - 1;
    const firstMonday = new Date(jan4.getTime() - jan4Day * 24 * 60 * 60 * 1000);
    const weekNum = Math.round((monday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const isoWeek = `${monday.getFullYear()}W${String(weekNum).padStart(2, '0')}`;
    const periodoInicio = monday.toISOString().split('T')[0];
    const periodoFim = sunday.toISOString().split('T')[0];

    console.log(`Calculated period: ${isoWeek} (${periodoInicio} to ${periodoFim})`);

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

    // Fix any existing records with null dates for this integration (from previous botched rescue)
    const { count: fixedCount } = await supabase
      .from('bolt_resumos_semanais')
      .update({ periodo_inicio: periodoInicio, periodo_fim: periodoFim, periodo: isoWeek })
      .eq('integracao_id', integracao_id)
      .is('periodo_inicio', null)
      .select('id', { count: 'exact', head: true });

    if (fixedCount && fixedCount > 0) {
      console.log(`Fixed ${fixedCount} existing records with null dates → ${periodoInicio} to ${periodoFim}`);
    }

    // 4. Forward to bolt-import-csv with correct period
    const importResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/bolt-import-csv`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integracao_id: integracao_id,
          dados_csv_bolt: csvContent,
          periodo: isoWeek,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
        }),
      },
    );

    const importResult = await importResponse.json();

    return new Response(
      JSON.stringify({
        success: importResponse.ok,
        imported: importResult.imported || 0,
        message: importResponse.ok ? 'Resgate concluído com sucesso' : 'Erro ao processar CSV resgatado',
        import_result: importResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('bolt-rescue-apify error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
