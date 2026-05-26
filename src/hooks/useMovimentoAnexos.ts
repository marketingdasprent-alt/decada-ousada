import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MovimentoAnexo } from '@/types/movimento';

const BUCKET = 'movimento-anexos';
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export const MOVIMENTO_ANEXO_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;

const ALLOWED_MIME = new Set<string>(MOVIMENTO_ANEXO_MIME);

const queryKey = (movimentoId: string | null) =>
  ['renting', 'movimento-anexos', movimentoId] as const;

/** Upload direto (sem hook). Útil para o batch upload após criar o movimento. */
export async function uploadMovimentoAnexoSync(
  movimentoId: string,
  file: File,
  nomeOverride?: string
): Promise<void> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Tipo de ficheiro não permitido. Aceites: imagens (JPG/PNG/WebP/HEIC) e PDF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Ficheiro excede o limite de 20 MB');
  }

  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const path = `${movimentoId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  // @ts-expect-error org_id é preenchido pelo trigger set_movimento_anexo_org_id
  // (BEFORE INSERT) a partir do movimento; os types Supabase marcam-no como
  // obrigatório no Insert mas a BD aceita NULL no client porque o trigger
  // o preenche antes da gravação.
  const { error: insertError } = await supabase.from('movimento_anexos').insert({
    movimento_id: movimentoId,
    nome: (nomeOverride ?? file.name).trim() || file.name,
    ficheiro_url: path,
    tamanho_bytes: file.size,
    mime_type: file.type,
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }
}

export function useMovimentoAnexos(movimentoId: string | null) {
  return useQuery({
    queryKey: queryKey(movimentoId),
    enabled: !!movimentoId,
    queryFn: async (): Promise<MovimentoAnexo[]> => {
      if (!movimentoId) return [];
      const { data, error } = await supabase
        .from('movimento_anexos')
        .select('*')
        .eq('movimento_id', movimentoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MovimentoAnexo[];
    },
  });
}

export function useUploadMovimentoAnexo(movimentoId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      if (!movimentoId) throw new Error('Movimento não definido');
      await uploadMovimentoAnexoSync(movimentoId, file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(movimentoId) });
      toast({ title: 'Ficheiro carregado', description: 'O anexo foi guardado com sucesso.' });
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

export function useRenameMovimentoAnexo(movimentoId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error('O nome não pode estar vazio.');
      if (trimmed.length > 255) throw new Error('O nome é demasiado longo (máx. 255 caracteres).');

      const { error } = await supabase
        .from('movimento_anexos')
        .update({ nome: trimmed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(movimentoId) });
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

export function useDeleteMovimentoAnexo(movimentoId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (anexo: MovimentoAnexo) => {
      const { error: delErr } = await supabase.from('movimento_anexos').delete().eq('id', anexo.id);
      if (delErr) throw delErr;

      // Best-effort: limpar o ficheiro do bucket
      await supabase.storage.from(BUCKET).remove([anexo.ficheiro_url]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(movimentoId) });
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
export async function getMovimentoAnexoSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
