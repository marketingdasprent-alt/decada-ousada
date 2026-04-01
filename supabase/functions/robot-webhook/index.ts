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

    const url = new URL(req.url);
    const integracaoId = url.searchParams.get('integracao_id');

    if (!integracaoId) {
      return new Response(
        JSON.stringify({ success: false, error: 'integracao_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify integration exists
    const { data: config, error: configError } = await supabase
      .from('plataformas_configuracao')
      .select('id, nome, plataforma, robot_target_platform')
      .eq('id', integracaoId)
      .eq('plataforma', 'robot')
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, error: 'Integração robot não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse the incoming payload from the Apify actor
    const contentType = req.headers.get('content-type') || '';
    let payload: any = {};

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    console.log(`robot-webhook received for integration ${integracaoId}:`, JSON.stringify(payload).substring(0, 500));

    // Update ultimo_sync timestamp
    await supabase
      .from('plataformas_configuracao')
      .update({ ultimo_sync: new Date().toISOString() })
      .eq('id', integracaoId);

    // Detect Bolt CSV data in payload
    // Be more flexible: check specific keys OR check target platform
    const boltCsvContent = payload.dados_csv_bolt || 
                         (config.robot_target_platform === 'bolt' ? (payload.csv_content || payload.data || payload.dados_csv || payload.raw_csv) : null);

    if (boltCsvContent) {
      console.log('robot-webhook: Bolt CSV data detected, forwarding to bolt-import-csv');

      const boltResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/bolt-import-csv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integracao_id: integracaoId,
            dados_csv_bolt: boltCsvContent,
            periodo: payload.periodo || payload.nome_ficheiro || undefined,
            periodo_inicio: payload.periodo_inicio || undefined,
            periodo_fim: payload.periodo_fim || undefined,
          }),
        },
      );

      const boltResult = await boltResponse.json();
      console.log('robot-webhook: bolt-import-csv response:', JSON.stringify(boltResult).substring(0, 500));

      return new Response(
        JSON.stringify({
          success: boltResponse.ok,
          message: boltResponse.ok ? 'Dados Bolt processados com sucesso' : 'Erro ao processar dados Bolt',
          integracao_id: integracaoId,
          import_result: boltResult,
        }),
        { status: boltResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Detect BP fuel CSV data in payload
    const hasBpData = payload.combustivel_csv || payload.dados_csv_combustivel || 
                     (config.robot_target_platform === 'bp' ? (payload.csv_content || payload.data) : null);

    if (hasBpData) {
      console.log('robot-webhook: BP fuel CSV data detected, forwarding to bp-import-csv');

      const csvContent = hasBpData;

      const bpResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/bp-import-csv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integracao_id: integracaoId,
            combustivel_csv: csvContent,
          }),
        },
      );

      const bpResult = await bpResponse.json();
      console.log('robot-webhook: bp-import-csv response:', JSON.stringify(bpResult).substring(0, 500));

      return new Response(
        JSON.stringify({
          success: bpResponse.ok,
          message: bpResponse.ok ? 'Dados BP processados com sucesso' : 'Erro ao processar dados BP',
          integracao_id: integracaoId,
          import_result: bpResult,
        }),
        { status: bpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Detect Repsol fuel data in payload
    if (config.robot_target_platform === 'repsol') {
      console.log('robot-webhook: Repsol integration detected, forwarding to repsol-import-csv');

      const knownData = payload.combustivel_csv || payload.dados_csv_combustivel || payload.movimentos || payload.data;
      const fallbackArray = !knownData
        ? Object.values(payload).find(v => Array.isArray(v)) as any[] | undefined
        : undefined;
      const repsolData = knownData || fallbackArray;

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/repsol-import-csv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integracao_id: integracaoId,
            combustivel_csv: typeof repsolData === 'string' ? repsolData : null,
            movimentos: Array.isArray(repsolData) ? repsolData : null,
          }),
        },
      );
      
      const result = await resp.json();
      return new Response(
        JSON.stringify({
          success: resp.ok,
          message: resp.ok ? 'Dados Repsol processados com sucesso' : 'Erro ao processar dados Repsol',
          integracao_id: integracaoId,
          import_result: result,
        }),
        { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Detect EDP fuel CSV data in payload
    if (config.robot_target_platform === 'edp') {
      const edpData = payload.combustivel_csv || payload.dados_csv_combustivel || payload.data;
      if (edpData) {
        console.log('robot-webhook: EDP fuel data detected, forwarding to edp-import-csv');
        
        const resp = await fetch(
          `${SUPABASE_URL}/functions/v1/edp-import-csv`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              integracao_id: integracaoId,
              combustivel_csv: edpData,
            }),
          },
        );
        
        const result = await resp.json();
        return new Response(
          JSON.stringify({
            success: resp.ok,
            message: resp.ok ? 'Dados EDP processados com sucesso' : 'Erro ao processar dados EDP',
            integracao_id: integracaoId,
            import_result: result,
          }),
          { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Detect Uber CSV data in payload (flexible)
    const hasUberData = payload.pagamentos_csv || payload.viagens_csv ||
      payload.dados_csv_pagamentos || payload.dados_csv_atividades ||
      (config.robot_target_platform === 'uber' ? payload.csv_content : null);

    if (hasUberData) {
      console.log('robot-webhook: Uber CSV data detected, forwarding to uber-import-reports');

      const forwardBody = {
        ...payload,
        integracao_id: integracaoId,
        origem: 'Robot Apify',
        data_extracao: new Date().toISOString(),
      };

      const importResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/uber-import-reports`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(forwardBody),
        },
      );

      const importResult = await importResponse.json();
      console.log('robot-webhook: uber-import-reports response:', JSON.stringify(importResult).substring(0, 500));

      return new Response(
        JSON.stringify({
          success: importResponse.ok,
          message: importResponse.ok ? 'Dados Uber processados com sucesso' : 'Erro ao processar dados Uber',
          integracao_id: integracaoId,
          import_result: importResult,
        }),
        { status: importResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // If we reached here, data was technically received but not recognized as a known format
    console.warn(`robot-webhook: Payload for integration ${integracaoId} (${config.nome}) not recognized. Keys received:`, Object.keys(payload).join(', '));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dados recebidos mas o formato não foi reconhecido para processamento imediato',
        integracao_id: integracaoId,
        platform: config.robot_target_platform
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('robot-webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
