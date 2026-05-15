import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ClienteAnexo } from '@/types/cliente';

const BUCKET = 'cliente-anexos';

const queryKey = (clienteId: string | null) => ['renting', 'cliente-anexos', clienteId] as const;

// ── Query: anexos de um cliente ─────────────────────────────
export function useClienteAnexos(clienteId: string | null) {
  return useQuery({
    queryKey: queryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async (): Promise<ClienteAnexo[]> => {
      const { data, error } = await supabase
        .from('cliente_anexos')
        .select('*')
        .eq('cliente_id', clienteId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClienteAnexo[];
    },
  });
}

// ── Mutation: upload de ficheiro + registo na BD ────────────
export function useUploadClienteAnexo(clienteId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, descricao }: { file: File; descricao?: string }) => {
      if (!clienteId) throw new Error('Cliente não definido');
      if (file.type !== 'application/pdf') {
        throw new Error('Apenas ficheiros PDF são aceites');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Ficheiro excede o limite de 10 MB');
      }

      // Caminho único: <cliente_id>/<timestamp>-<nome-sanitizado>
      const safeName = file.name.replace(/[^\w.\-]/g, '_');
      const path = `${clienteId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('cliente_anexos').insert({
        cliente_id: clienteId,
        nome: file.name,
        ficheiro_url: path,
        tamanho_bytes: file.size,
        descricao: descricao || null,
      });
      if (insertError) {
        // Rollback: tentar remover o ficheiro
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(clienteId) });
      toast({ title: 'Anexo carregado', description: 'O ficheiro foi guardado com sucesso.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ── Mutation: eliminar anexo ────────────────────────────────
export function useDeleteClienteAnexo(clienteId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (anexo: ClienteAnexo) => {
      // Eliminar primeiro o registo (RLS garante permissão)
      const { error: delErr } = await supabase.from('cliente_anexos').delete().eq('id', anexo.id);
      if (delErr) throw delErr;

      // Eliminar o ficheiro do storage (best-effort: se falhar, o registo já cá não está)
      await supabase.storage.from(BUCKET).remove([anexo.ficheiro_url]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(clienteId) });
      toast({ title: 'Anexo eliminado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao eliminar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ── Helper: obter URL pública/assinada para abrir o ficheiro ──
export async function getAnexoSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10); // 10 min
  if (error) return null;
  return data.signedUrl;
}
