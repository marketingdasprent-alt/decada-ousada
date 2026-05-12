import { supabase } from '@/services/supabase';

export async function getTicketById(id: string) {
  const { data, error } = await supabase
    .from('assistencia_tickets')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getTicketsByViatura(viaturaId: string) {
  const { data, error } = await supabase
    .from('assistencia_tickets')
    .select('*')
    .eq('viatura_id', viaturaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateTicketStatus(id: string, status: string) {
  const { error } = await supabase
    .from('assistencia_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
