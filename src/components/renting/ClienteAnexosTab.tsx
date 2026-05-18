import { useRef, useState } from 'react';
import { Upload, FileText, Trash2, ExternalLink, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useClienteAnexos,
  useUploadClienteAnexo,
  useDeleteClienteAnexo,
  getAnexoSignedUrl,
} from '@/hooks/useClienteAnexos';
import type { ClienteAnexo } from '@/types/cliente';

interface ClienteAnexosTabProps {
  clienteId: string | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClienteAnexosTab({ clienteId }: ClienteAnexosTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClienteAnexo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const { data: anexos = [], isLoading } = useClienteAnexos(clienteId);
  const uploadMutation = useUploadClienteAnexo(clienteId);
  const deleteMutation = useDeleteClienteAnexo(clienteId);

  if (!clienteId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Paperclip className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Guarde o cliente primeiro para poder adicionar anexos.
        </p>
      </div>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync({ file }).catch(() => {});
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAbrir = async (anexo: ClienteAnexo) => {
    const url = await getAnexoSignedUrl(anexo.ficheiro_url);
    if (!url) {
      toast({
        title: 'Erro ao abrir',
        description: 'Não foi possível gerar o link do ficheiro.',
        variant: 'destructive',
      });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* Drop zone / botão upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/30'
        }`}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">
          Arrasta ficheiros aqui ou{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-primary hover:underline"
          >
            seleciona do dispositivo
          </button>
        </p>
        <p className="text-xs text-muted-foreground">Apenas PDF · máximo 10 MB cada</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        {uploadMutation.isPending && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />A carregar...
          </div>
        )}
      </div>

      {/* Lista de anexos */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : anexos.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Ainda não há anexos para este cliente.
        </div>
      ) : (
        <ul className="space-y-2">
          {anexos.map((anexo) => (
            <li
              key={anexo.id}
              className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{anexo.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(anexo.tamanho_bytes)} · {formatDate(anexo.created_at)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAbrir(anexo)}
                title="Abrir"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(anexo)}
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Confirmação de eliminação */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              O ficheiro <strong>{deleteTarget?.nome}</strong> será removido permanentemente. Esta
              acção não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
