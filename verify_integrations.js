import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hkqzzxgeedsmjnhyquke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function verifyIntegrations() {
  console.log("=== Verificação de Integrações: Ontem às 4h da Manhã ===\n");
  
  // Data alvo: dia 20 de Abril (ou o 'ontem' que for executado)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

  console.log(`Buscando registos entre: ${startOfDay} e ${endOfDay}\n`);

  // 1. Tabela sync_queue
  const { data: queueLogs, error: qErr } = await supabase
    .from('sync_queue')
    .select('id, platform, status, attempts, error_message, next_retry_at, created_at, updated_at')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  if (qErr) {
    console.error("Erro ao buscar sync_queue:", qErr);
  } else {
    console.log(`-- Fila de Sincronização (sync_queue) [${queueLogs?.length || 0} registos] --`);
    if (queueLogs?.length > 0) {
      console.table(queueLogs.map(l => ({
        Plataforma: l.platform,
        Status: l.status,
        Tentativas: l.attempts,
        Erro: l.error_message?.substring(0, 30),
        Criado: l.created_at,
        Atualizado: l.updated_at
      })));
    } else {
      console.log("Nenhum pedido enfileirado nesta janela de tempo.");
    }
  }

  console.log("\n");

  // 2. Logs da Uber
  const { data: uberLogs, error: uErr } = await supabase
    .from('uber_sync_logs')
    .select('id, tipo, status, mensagem, created_at')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  if (uErr) {
    console.error("Erro ao buscar uber_sync_logs:", uErr);
  } else {
    console.log(`-- Logs da Uber (uber_sync_logs) [${uberLogs?.length || 0} registos] --`);
    if (uberLogs?.length > 0) {
      console.table(uberLogs.map(l => ({
        Status: l.status,
        Tipo: l.tipo,
        Mensagem: l.mensagem?.substring(0, 50),
        Hora: l.created_at
      })));
    } else {
      console.log("Sem logs da Uber nesta data.");
    }
  }

  console.log("\n");

  // 3. Logs da Bolt
  const { data: boltLogs, error: bErr } = await supabase
    .from('bolt_sync_logs')
    .select('id, tipo, status, mensagem, created_at')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  if (bErr) {
    console.error("Erro ao buscar bolt_sync_logs:", bErr);
  } else {
    console.log(`-- Logs da Bolt (bolt_sync_logs) [${boltLogs?.length || 0} registos] --`);
    if (boltLogs?.length > 0) {
      console.table(boltLogs.map(l => ({
        Status: l.status,
        Tipo: l.tipo,
        Mensagem: l.mensagem?.substring(0, 50),
        Hora: l.created_at
      })));
    } else {
      console.log("Sem logs da Bolt nesta data.");
    }
  }
}

verifyIntegrations();
