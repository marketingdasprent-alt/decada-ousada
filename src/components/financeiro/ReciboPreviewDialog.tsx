import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReciboPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recibo: {
    id: string;
    codigo: number;
    ficheiro_url: string;
    nome_ficheiro: string | null;
    motorista_nome?: string;
    semana_referencia_inicio?: string | null;
    valor_total?: number | null;
  } | null;
}

export function ReciboPreviewDialog({
  open,
  onOpenChange,
  recibo,
}: ReciboPreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && recibo?.ficheiro_url) {
      loadSignedUrl();
    } else {
      setSignedUrl(null);
    }
  }, [open, recibo?.ficheiro_url]);

  async function loadSignedUrl() {
    if (!recibo?.ficheiro_url) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("motorista-recibos")
        .createSignedUrl(recibo.ficheiro_url, 3600);

      if (error) throw error;
      setSignedUrl(data.signedUrl);
    } catch (error) {
      console.error("Erro ao carregar ficheiro:", error);
      toast.error("Erro ao carregar ficheiro");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!signedUrl) return;
    
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = recibo?.nome_ficheiro || `recibo-${recibo?.codigo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Erro ao descarregar:", error);
      toast.error("Erro ao descarregar ficheiro");
    }
  }

  async function handleOpenExternal() {
    if (!signedUrl) return;
    
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Erro ao abrir:", error);
      toast.error("Erro ao abrir ficheiro");
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  const formatWeek = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);
    return `${date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`;
  };

  const isPDF = recibo?.ficheiro_url?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(recibo?.ficheiro_url || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Recibo #{String(recibo?.codigo || 0).padStart(4, '0')}
              {recibo?.motorista_nome && ` - ${recibo.motorista_nome}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm text-muted-foreground pb-2 border-b">
          <span>Semana: {formatWeek(recibo?.semana_referencia_inicio)}</span>
          {recibo?.valor_total && (
            <span>Valor: {formatCurrency(recibo.valor_total)}</span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : signedUrl ? (
            <div className="h-full">
              {isPDF ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-[60vh] border rounded-lg"
                  title="Preview do recibo"
                />
              ) : isImage ? (
                <img
                  src={signedUrl}
                  alt="Recibo"
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-muted-foreground">
                    Não é possível pré-visualizar este tipo de ficheiro.
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Descarregar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Nenhum ficheiro disponível
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleOpenExternal} disabled={!signedUrl}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir
          </Button>
          <Button onClick={handleDownload} disabled={!signedUrl}>
            <Download className="h-4 w-4 mr-2" />
            Descarregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
