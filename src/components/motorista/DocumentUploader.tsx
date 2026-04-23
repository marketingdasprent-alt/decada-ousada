import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle2, Loader2 } from 'lucide-react';

interface DocumentUploaderProps {
  folder: string;
  motoristaId?: string;
  currentUrl: string | null;
  onUpload: (url: string) => void;
  accept?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  folder,
  currentUrl,
  onUpload,
  accept = 'application/pdf,image/jpeg,image/png',
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tamanho (10MB max)
    if (file.size > 10 * 1024 * 1024) {
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

      const { data: { publicUrl } } = supabase.storage
        .from('motorista-documentos')
        .getPublicUrl(filePath);

      // Como o bucket é privado, guardamos o path em vez da URL pública
      onUpload(filePath);

      toast({
        title: 'Upload concluído',
        description: 'O documento foi enviado com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar o ficheiro.',
        variant: 'destructive',
      });
      setFileName(null);
    } finally {
      setUploading(false);
    }
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
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="w-full border-dashed"
        >
          <Upload className="mr-2 h-4 w-4" />
          Escolher ficheiro
        </Button>
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

      <p className="text-xs text-muted-foreground">
        PDF, JPG ou PNG. Máximo 10MB.
      </p>
    </div>
  );
};
