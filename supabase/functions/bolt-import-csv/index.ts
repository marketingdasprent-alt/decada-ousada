import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CSV column name → DB column name mapping
const COLUMN_MAP: Record<string, string> = {
  'Motorista': 'motorista_nome',
  'Email': 'email',
  'Telemóvel': 'telefone',
  'Ganhos brutos (total)|€': 'ganhos_brutos_total',
  'Ganhos brutos (pagamentos na app)|€': 'ganhos_brutos_app',
  'IVA sobre os ganhos brutos (pagamentos na app)|€': 'iva_ganhos_app',
  'Ganhos brutos (pagamentos em dinheiro)|€': 'ganhos_brutos_dinheiro',
  'IVA sobre os ganhos brutos (pagamentos em dinheiro)|€': 'iva_ganhos_dinheiro',
  'Dinheiro recebido|€': 'dinheiro_recebido',
  'Gorjetas dos passageiros|€': 'gorjetas',
  'Ganhos da campanha|€': 'ganhos_campanha',
  'Reembolsos de despesas|€': 'reembolsos_despesas',
  'Taxas de cancelamento|€': 'taxas_cancelamento',
  'IVA das taxas de cancelamento|€': 'iva_taxas_cancelamento',
  'Portagens|€': 'portagens',
  'Taxas de reserva|€': 'taxas_reserva',
  'IVA das taxas de reserva|€': 'iva_taxas_reserva',
  'Total de taxas|€': 'total_taxas',
  'Comissões|€': 'comissoes',
  'Reembolsos aos passageiros|€': 'reembolsos_passageiros',
  'Outras taxas|€': 'outras_taxas',
  'Ganhos líquidos|€': 'ganhos_liquidos',
  'Pagamento previsto|€': 'pagamento_previsto',
  'Ganhos brutos por hora|€/h': 'ganhos_brutos_hora',
  'Ganhos líquidos por hora|€/h': 'ganhos_liquidos_hora',
  'Desconto de comissão (in-app)|€': 'desconto_comissao_app',
  'Desconto da comissão (dinheiro)|€': 'desconto_comissao_dinheiro',
  'Identificador do motorista': 'identificador_motorista',
  'Identificador individual': 'identificador_individual',
  'Nível': 'nivel',
  'Categorias ativas': 'categorias_ativas',
  'Viagens pagas com dinheiro ativadas': 'viagens_dinheiro_ativadas',
  'Pontuação de motorista|%': 'pontuacao_motorista',
  'Viagens terminadas': 'viagens_terminadas',
  'Taxa de aceitação total|%': 'taxa_aceitacao',
  'Tempo online (min)': 'tempo_online_min',
  'Utilização|%': 'utilizacao',
  'Taxa de finalização (todas as viagens)|%': 'taxa_finalizacao_todas',
  'Taxa de finalização (viagens aceites)|%': 'taxa_finalizacao_aceites',
  'Distância média das viagens|km': 'distancia_media_km',
  'Distância total das viagens|km': 'distancia_total_km',
  'Classificação média do motorista|★': 'classificacao_media',
};

const NUMERIC_COLUMNS = new Set([
  'ganhos_brutos_total', 'ganhos_brutos_app', 'iva_ganhos_app', 'ganhos_brutos_dinheiro',
  'iva_ganhos_dinheiro', 'dinheiro_recebido', 'gorjetas', 'ganhos_campanha',
  'reembolsos_despesas', 'taxas_cancelamento', 'iva_taxas_cancelamento', 'portagens',
  'taxas_reserva', 'iva_taxas_reserva', 'total_taxas', 'comissoes',
  'reembolsos_passageiros', 'outras_taxas', 'ganhos_liquidos', 'pagamento_previsto',
  'ganhos_brutos_hora', 'ganhos_liquidos_hora', 'desconto_comissao_app',
  'desconto_comissao_dinheiro', 'pontuacao_motorista', 'taxa_aceitacao',
  'tempo_online_min', 'utilizacao', 'taxa_finalizacao_todas', 'taxa_finalizacao_aceites',
  'distancia_media_km', 'distancia_total_km', 'classificacao_media',
]);

const INTEGER_COLUMNS = new Set(['viagens_terminadas']);

function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  // Parse header - handle quoted fields
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(value: string): number {
  if (!value || value === '-' || value === '') return 0;
  const cleaned = value.replace(/\s/g, '');
  let normalized: string;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // European with thousands: 1.234,56
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // European without thousands: 1234,56
    normalized = cleaned.replace(',', '.');
  } else {
    // International: 1234.56
    normalized = cleaned;
  }
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

function getDatesFromISOWeek(weekStr: string): { start: string, end: string } | null {
  // Expected format: YYYYWww (e.g., 2026W13)
  const match = weekStr.match(/^(\d{4})W(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1]);
  const week = parseInt(match[2]);

  // ISO weeks start on Monday. 
  // Simple algorithm to find the first Monday of the year:
  // Jan 4th is always in week 1.
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = day === 0 ? 6 : day - 1; // Days from Monday
  const firstMonday = new Date(jan4.getTime() - (diff * 24 * 60 * 60 * 1000));
  
  // Add (week-1) weeks to firstMonday
  const start = new Date(firstMonday.getTime() + ((week - 1) * 7 * 24 * 60 * 60 * 1000));
  const end = new Date(start.getTime() + (6 * 24 * 60 * 60 * 1000));

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (token !== SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { integracao_id, dados_csv_bolt, periodo, periodo_inicio, periodo_fim } = body;

    if (!integracao_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'integracao_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!dados_csv_bolt) {
      return new Response(
        JSON.stringify({ success: false, error: 'dados_csv_bolt é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Parse CSV
    const rows = parseCSV(dados_csv_bolt);
    console.log(`bolt-import-csv: Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'CSV vazio, nada a importar', imported: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Calculate last week's Monday–Sunday (the actor always fetches "Semana passada")
    const getLastWeekDates = () => {
      const now = new Date();
      // Em UTC, ajustar para o dia da semana correto
      const dow = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
      const daysToThisMonday = dow === 0 ? 6 : dow - 1;
      
      // Encontrar a segunda-feira desta semana
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - daysToThisMonday);
      thisMonday.setHours(0, 0, 0, 0);
      
      // A semana passada começa 7 dias antes
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      
      return {
        start: lastMonday.toISOString().split('T')[0],
        end: lastSunday.toISOString().split('T')[0],
      };
    };

    const lastWeek = getLastWeekDates();

    // The Apify actor sometimes wrongly sends the execution date as periodo_inicio.
    // If the provided start date is NOT a Monday, or is very close to today, ignore it!
    let periodoInicioValue = periodo_inicio;
    let periodoFimValue = periodo_fim;
    
    if (periodoInicioValue) {
      const d = new Date(periodoInicioValue);
      // If it's not a Monday, or it's in the current week/future, ignore the payload's date
      if (d.getDay() !== 1 || d.getTime() > new Date().getTime() - 2 * 24 * 60 * 60 * 1000) {
        console.log(`bolt-import-csv: Ignoring buggy payload dates (${periodoInicioValue}). Using calculated last week.`);
        periodoInicioValue = undefined;
      }
    }

    periodoInicioValue = periodoInicioValue || lastWeek.start;
    periodoFimValue    = periodoFimValue || lastWeek.end;
    const periodoValue = periodo || `${periodoInicioValue} a ${periodoFimValue}`;

    console.log(`bolt-import-csv: periodo=${periodoValue}, inicio=${periodoInicioValue}, fim=${periodoFimValue}`);

    // Fetch motoristas for name matching
    const { data: motoristas } = await supabase
      .from('motoristas_ativos')
      .select('id, nome, telefone, email');

    const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    const motoristaByName: Record<string, string> = {};
    const motoristaByPhone: Record<string, string> = {};
    const allMotoristas = motoristas || [];

    allMotoristas.forEach((m: any) => {
      motoristaByName[normalizeStr(m.nome)] = m.id;
      if (m.telefone) {
        const digits = m.telefone.replace(/\D/g, '').slice(-9);
        if (digits.length === 9) motoristaByPhone[digits] = m.id;
      }
    });

    // Função de matching agressivo
    const findMotoristaId = (nome?: string, telefone?: string, email?: string): string | null => {
      if (!nome && !telefone && !email) return null;

      const normNome = nome ? normalizeStr(nome) : '';
      
      // 1. Exact Name match (normalized)
      if (normNome && motoristaByName[normNome]) return motoristaByName[normNome];

      // 2. Phone match
      if (telefone) {
        const digits = telefone.replace(/\D/g, '').slice(-9);
        if (digits.length === 9 && motoristaByPhone[digits]) return motoristaByPhone[digits];
      }

      // 3. Email match
      if (email) {
        const match = allMotoristas.find((m: any) => m.email?.toLowerCase().trim() === email.toLowerCase().trim());
        if (match) return match.id;
      }

      // 4. Fuzzy Name Match (Starts with / Ends with / Includes)
      if (normNome) {
        const match = allMotoristas.find((m: any) => {
          const mNorm = normalizeStr(m.nome);
          return mNorm.includes(normNome) || normNome.includes(mNorm);
        });
        if (match) return match.id;
      }

      return null;
    };

    let imported = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const record: Record<string, any> = {
          integracao_id,
          periodo: periodoValue,
          raw_data: row,
          ...(periodoInicioValue && { periodo_inicio: periodoInicioValue }),
          ...(periodoFimValue && { periodo_fim: periodoFimValue }),
        };

        // Map CSV columns to DB columns
        for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
          const value = row[csvCol];
          if (value === undefined) continue;

          if (NUMERIC_COLUMNS.has(dbCol)) {
            record[dbCol] = parseNumber(value);
          } else if (INTEGER_COLUMNS.has(dbCol)) {
            record[dbCol] = Math.round(parseNumber(value));
          } else {
            record[dbCol] = value || null;
          }
        }

        // Try to match motorista
        record.motorista_id = findMotoristaId(record.motorista_nome, record.telefone, record.email);
        
        if (record.motorista_id) {
          console.log(`bolt-import-csv: Match found for ${record.motorista_nome} -> ID: ${record.motorista_id}`);
        } else {
          console.warn(`bolt-import-csv: NO match found for ${record.motorista_nome} (${record.telefone || 'no phone'})`);
        }

        // Upsert
        const { error: upsertError } = await supabase
          .from('bolt_resumos_semanais')
          .upsert(record, {
            onConflict: 'integracao_id,periodo,identificador_motorista',
          });

        if (upsertError) {
          console.error('bolt-import-csv upsert error:', upsertError.message, 'for row:', record.motorista_nome);
          errors++;
        } else {
          imported++;
        }
      } catch (rowError) {
        console.error('bolt-import-csv row error:', rowError);
        errors++;
      }
    }

    // Success log entry
    if (imported > 0) {
      await supabase.from('bolt_sync_logs').insert({
        tipo: 'csv_import',
        status: 'success',
        mensagem: `Importação Apify/Robot: ${imported} registos processados para ${periodoValue}`,
        viagens_novas: imported,
        integracao_id: integracao_id,
      });
    }

    console.log(`bolt-import-csv: Done. Imported: ${imported}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importados ${imported} registos Bolt`,
        imported,
        errors,
        total_rows: rows.length,
        periodo: periodoValue,
        periodo_inicio: periodoInicioValue,
        periodo_fim: periodoFimValue,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('bolt-import-csv error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

