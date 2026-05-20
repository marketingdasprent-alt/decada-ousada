import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { ContratoAnexo } from '@/types/contratoRenting';

const BUCKET = 'contrato-anexos';
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

const queryKey = (contratoId: string | null) => ['renting', 'contrato-anexos', contratoId] as const;

export function useContratoAnexos(contratoId: string | null) {
  return useQuery({
    queryKey: queryKey(contratoId),
    enabled: !!contratoId,
    queryFn: async (): Promise<ContratoAnexo[]> => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from('contrato_anexos')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContratoAnexo[];
    },
  });
}

export function useUploadContratoAnexo(contratoId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      if (!contratoId) throw new Error('Contrato não definido');
      if (!ALLOWED_MIME.has(file.type)) {
        throw new Error(
          'Tipo de ficheiro não permitido. Aceites: PDF, imagens (JPG/PNG/WebP), Word, Excel e texto.'
        );
      }
      if (file.size > MAX_BYTES) {
        throw new Error('Ficheiro excede o limite de 20 MB');
      }

      const safeName = file.name.replace(/[^\w.\-]/g, '_');
      const path = `${contratoId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      // org_id é preenchido por trigger na BD — daí o cast.
      const { error: insertError } = await supabase.from('contrato_anexos').insert({
        contrato_id: contratoId,
        nome: file.name,
        ficheiro_url: path,
        tamanho_bytes: file.size,
        mime_type: file.type,
      } as TablesInsert<'contrato_anexos'>);
      if (insertError) {
        // Rollback: tentar remover o ficheiro
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(contratoId) });
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

export function useRenameContratoAnexo(contratoId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error('O nome não pode estar vazio.');
      if (trimmed.length > 255) throw new Error('O nome é demasiado longo (máx. 255 caracteres).');

      const { error } = await supabase
        .from('contrato_anexos')
        .update({ nome: trimmed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(contratoId) });
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

export function useDeleteContratoAnexo(contratoId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (anexo: ContratoAnexo) => {
      const { error: delErr } = await supabase.from('contrato_anexos').delete().eq('id', anexo.id);
      if (delErr) throw delErr;

      // Best-effort: limpar o ficheiro do bucket
      await supabase.storage.from(BUCKET).remove([anexo.ficheiro_url]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(contratoId) });
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

/** URL assinada (10 min) para abrir o ficheiro num separador novo. */
export async function getContratoAnexoSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
