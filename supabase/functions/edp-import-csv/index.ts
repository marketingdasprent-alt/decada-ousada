import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeCard(card: string): string {
  return (card || '').replace(/\D/g, '');
}

function parseEdpDate(raw: string): string | null {
  if (!raw) return null;
  // Common format: DD/MM/YYYY HH:MM:SS
  const m = raw.trim().match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})(\s+(\d{2}):(\d{2})(:(\d{2}))?)?$/);
  if (m) {
    const hh = m[5] || '00';
    const mm = m[6] || '00';
    const ss = m[8] || '00';
    return `${m[3]}-${m[2]}-${m[1]}T${hh}:${mm}:${ss}Z`;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0];
  const sep = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    if (vals.length < 2) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

function findField(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (key && row[key]) return row[key];
  }
  return '';
}

function parseNumber(val: string): number | null {
  if (!val) return null;
  const clean = val.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function normalizeName(name: string): string {
  return (name || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const { integracao_id, combustivel_csv } = body;

    const rows = parseCsv(combustivel_csv);
    const { data: motoristas } = await supabase.from('motoristas_ativos').select('id, nome, cartao_edp');

    const cardMap = new Map();
    const nameMap = new Map();

    for (const m of motoristas || []) {
      const normalName = normalizeName(m.nome);
      if (normalName) nameMap.set(normalName, m.id);
      if (m.cartao_edp) {
        const parts = m.cartao_edp.split('/').map(p => sanitizeCard(p.trim())).filter(p => p.length >= 3);
        for (const p of parts) {
          cardMap.set(p, m.id);
          if (p.length >= 4) cardMap.set(p.slice(-4), m.id);
        }
      }
    }

    let imported = 0, matched = 0, skipped = 0;

    for (const row of rows) {
      const cardNumber = findField(row, ['tarjeta', 'cartao', 'card', 'id']);
      const dateStr = findField(row, ['fecha', 'data', 'date', 'inicio', 'start']);
      const amountStr = findField(row, ['importe', 'valor', 'total', 'amount', 'custo']);
      const qtyStr = findField(row, ['litros', 'cantidad', 'quantidade', 'volume', 'kwh', 'energia']);
      const station = findField(row, ['estacion', 'posto', 'station', 'ponto', 'carregador']);
      const driverName = findField(row, ['conductor', 'motorista', 'driver', 'utilizador']);

      const txDate = parseEdpDate(dateStr);
      if (!txDate) { skipped++; continue; }

      const amount = parseNumber(amountStr);
      const qty = parseNumber(qtyStr);
      const txId = `edp-${sanitizeCard(cardNumber)}-${txDate.replace(/\D/g, '')}`;

      const sanitized = sanitizeCard(cardNumber);
      let motoristaId = sanitized ? cardMap.get(sanitized) : null;
      if (!motoristaId && sanitized.length >= 4) motoristaId = cardMap.get(sanitized.slice(-4));
      if (!motoristaId && driverName) motoristaId = nameMap.get(normalizeName(driverName));

      if (motoristaId) matched++;

      const { error } = await supabase.from('edp_transacoes').upsert({
        integracao_id,
        transaction_id: txId,
        transaction_date: txDate,
        amount,
        quantity: qty,
        fuel_type: 'Elétrico',
        station_name: station || null,
        motorista_id: motoristaId,
        raw_data: row
      }, { onConflict: 'integracao_id,transaction_id' });

      if (!error) imported++;
    }

    return new Response(JSON.stringify({ success: true, imported, matched, skipped, total: rows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
