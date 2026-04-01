import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImagePlus, Loader2, X } from 'lucide-react';

interface ViaVerdeLogoUploadProps {
  contaId: string | null;
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
}

export const ViaVerdeLogoUpload: React.FC<ViaVerdeLogoUploadProps> = ({
  contaId,
  logoUrl,
  onLogoChange,
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Ficheiro muito grande', description: 'Máximo 2MB.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const folder = contaId ? `vv-${contaId}` : `vv-tmp-${Date.now()}`;
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('integracoes-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('integracoes-logos')
        .getPublicUrl(path);
      onLogoChange(publicUrl);
      toast({ title: 'Logo carregado' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>Logótipo</Label>
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <div className="relative">
            <img
              src={logoUrl}
              alt="Logo"
              className="h-12 w-12 rounded-md border border-border object-contain bg-muted"
            />
            <button
              type="button"
              onClick={() => onLogoChange(null)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border bg-muted/30">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
            {logoUrl ? 'Alterar' : 'Carregar'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>
    </div>
  );
};
