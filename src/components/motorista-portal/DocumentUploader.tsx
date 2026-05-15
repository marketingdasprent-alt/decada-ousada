import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
  folder: string;
  motoristaId?: string;
  currentUrl: string | null;
  onUpload: (url: string) => void;
  accept?: string;
}

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  folder,
  motoristaId,
  currentUrl,
  onUpload,
  accept = 'application/pdf,image/jpeg,image/png',
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = async (file: File) => {
    if (!user) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast({
        title: 'Formato não suportado',
        description: 'Apenas PDF, JPG ou PNG são permitidos.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Ficheiro muito grande',
        description: 'O tamanho máximo permitido é 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const fileExt = file.name.split('.').pop();
      const rootFolder = motoristaId || user.id;
      const filePath = `${rootFolder}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('motorista-documentos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      onUpload(filePath);

      toast({
        title: 'Upload concluído',
        description: 'O documento foi enviado com sucesso.',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível enviar o ficheiro.';
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: message,
        variant: 'destructive',
      });
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !currentUrl) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading || currentUrl) return;

    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleRemove = () => {
    onUpload('');
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getDisplayName = () => {
    if (fileName) return fileName;
    if (currentUrl) {
      const parts = currentUrl.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };

  const displayName = getDisplayName();

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {!currentUrl && !uploading && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 w-full px-4 py-6 rounded-md border-2 border-dashed cursor-pointer transition-colors',
            'hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isDragging ? 'border-primary bg-primary/10' : 'border-input bg-background'
          )}
        >
          <Upload
            className={cn(
              'h-5 w-5 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragging ? 'Solte o ficheiro aqui' : 'Arraste o ficheiro ou clique para escolher'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG ou PNG · Máx. 10MB</p>
          </div>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">A enviar {fileName}...</span>
        </div>
      )}

      {currentUrl && !uploading && (
        <div className="flex items-center justify-between gap-2 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm truncate">{displayName}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
