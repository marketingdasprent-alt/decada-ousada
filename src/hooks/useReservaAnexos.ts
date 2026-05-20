import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { ReservaAnexo } from '@/types/reserva';

const BUCKET = 'reserva-anexos';
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const queryKey = (reservaId: string | null) => ['renting', 'reserva-anexos', reservaId] as const;

/** Upload directo (sem hook). Útil para batch upload após criar reserva. */
export async function uploadReservaAnexoSync(
  reservaId: string,
  file: File,
  nomeOverride?: string
): Promise<void> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(
      'Tipo de ficheiro não permitido. Aceites: PDF, imagens (JPG/PNG/WebP), Word, Excel e texto.'
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Ficheiro excede o limite de 20 MB');
  }

  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const path = `${reservaId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  // org_id é preenchido por trigger na BD — daí o cast.
  const { error: insertError } = await supabase.from('reserva_anexos').insert({
    reserva_id: reservaId,
    nome: (nomeOverride ?? file.name).trim() || file.name,
    ficheiro_url: path,
    tamanho_bytes: file.size,
    mime_type: file.type,
  } as TablesInsert<'reserva_anexos'>);
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }
}

export function useReservaAnexos(reservaId: string | null) {
  return useQuery({
    queryKey: queryKey(reservaId),
    enabled: !!reservaId,
    queryFn: async (): Promise<ReservaAnexo[]> => {
      if (!reservaId) return [];
      const { data, error } = await supabase
        .from('reserva_anexos')
        .select('*')
        .eq('reserva_id', reservaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReservaAnexo[];
    },
  });
}

export function useUploadReservaAnexo(reservaId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      if (!reservaId) throw new Error('Reserva não definida');
      await uploadReservaAnexoSync(reservaId, file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(reservaId) });
      toast({ title: 'Anexo carregado', description: 'O ficheiro foi guardado com sucesso.' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}

export function useRenameReservaAnexo(reservaId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error('O nome não pode estar vazio.');
      if (trimmed.length > 255) throw new Error('O nome é demasiado longo (máx. 255 caracteres).');

      const { error } = await supabase
        .from('reserva_anexos')
        .update({ nome: trimmed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(reservaId) });
      toast({ title: 'Anexo renomeado' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao renomear',
        description: error instanceof Error ? error.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteReservaAnexo(reservaId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (anexo: ReservaAnexo) => {
      const { error: delErr } = await supabase.from('reserva_anexos').delete().eq('id', anexo.id);
      if (delErr) throw delErr;

      // Best-effort: limpar o ficheiro do bucket
      await supabase.storage.from(BUCKET).remove([anexo.ficheiro_url]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(reservaId) });
      toast({ title: 'Anexo eliminado' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao eliminar',
        description: error instanceof Error ? error.message : 'Erro inesperado',
        variant: 'destructive',
      });
    },
  });
}

/** Cria URL assinada (10 min) para abrir o ficheiro num separador novo. */
export async function getReservaAnexoSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
