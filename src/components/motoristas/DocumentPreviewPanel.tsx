import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight, FileText, Image, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentInfo {
  label: string;
  url: string | null;
  type: string;
}

interface DocumentPreviewPanelProps {
  documents: DocumentInfo[];
  selectedIndex: number;
  onSelectDocument: (index: number) => void;
}

export function DocumentPreviewPanel({ 
  documents, 
  selectedIndex, 
  onSelectDocument 
}: DocumentPreviewPanelProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDoc = documents[selectedIndex];
  const hasValidDocuments = documents.some(d => d.url);

  useEffect(() => {
    async function loadSignedUrl() {
      if (!currentDoc?.url) {
        setSignedUrl(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let bucket = 'motorista-documentos';
        let filePath = currentDoc.url;

        // Verificar se é uma URL completa ou um caminho relativo
        if (currentDoc.url.startsWith('http://') || currentDoc.url.startsWith('https://')) {
          // É uma URL completa - extrair bucket e path
          const url = new URL(currentDoc.url);
          const pathParts = url.pathname.split('/storage/v1/object/public/');
          
          if (pathParts.length >= 2) {
            const fullPath = pathParts[1];
            const pathSegments = fullPath.split('/');
            bucket = pathSegments[0];
            filePath = pathSegments.slice(1).join('/');
          }
        }
        // Caso contrário, é um caminho relativo - usar bucket padrão

        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600);

        if (signError) throw signError;
        
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error("Erro ao obter URL assinada:", err);
        setError("Não foi possível carregar o documento");
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    }

    loadSignedUrl();
  }, [currentDoc?.url]);

  const handleDownload = async () => {
    if (!currentDoc?.url) return;

    try {
      let bucket = 'motorista-documentos';
      let filePath = currentDoc.url;

      if (currentDoc.url.startsWith('http://') || currentDoc.url.startsWith('https://')) {
        const url = new URL(currentDoc.url);
        const pathParts = url.pathname.split('/storage/v1/object/public/');
        
        if (pathParts.length >= 2) {
          const fullPath = pathParts[1];
          const pathSegments = fullPath.split('/');
          bucket = pathSegments[0];
          filePath = pathSegments.slice(1).join('/');
        }
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (error) throw error;

      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filePath.split('/').pop() || 'documento';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Erro ao baixar documento:", err);
    }
  };

  const goToPrevious = () => {
    const prevIndex = documents.findIndex((d, i) => i < selectedIndex && d.url);
    if (prevIndex >= 0) {
      onSelectDocument(prevIndex);
    } else {
      // Wrap around to last valid document
      for (let i = documents.length - 1; i > selectedIndex; i--) {
        if (documents[i].url) {
          onSelectDocument(i);
          return;
        }
      }
    }
  };

  const goToNext = () => {
    const nextIndex = documents.findIndex((d, i) => i > selectedIndex && d.url);
    if (nextIndex >= 0) {
      onSelectDocument(nextIndex);
    } else {
      // Wrap around to first valid document
      for (let i = 0; i < selectedIndex; i++) {
        if (documents[i].url) {
          onSelectDocument(i);
          return;
        }
      }
    }
  };

  const isPdf = currentDoc?.url?.toLowerCase().endsWith('.pdf');
  const isImage = currentDoc?.url?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  if (!hasValidDocuments) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">
          Nenhum documento foi enviado
        </p>
      </div>
    );
  }

  if (!currentDoc?.url) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg p-8">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">
          Documento não enviado
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Selecione outro documento na lista
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {isPdf ? (
            <FileText className="h-4 w-4 text-red-500" />
          ) : (
            <Image className="h-4 w-4 text-blue-500" />
          )}
          <span className="font-medium text-sm">{currentDoc.label}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative bg-muted/20 min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : signedUrl ? (
          isPdf ? (
            <iframe
              src={`${signedUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={currentDoc.label}
            />
          ) : isImage ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto">
              <img
                src={signedUrl}
                alt={currentDoc.label}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Tipo de ficheiro não suportado para pré-visualização</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Baixar para visualizar
              </Button>
            </div>
          )
        ) : null}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between p-3 border-t bg-muted/30">
        <Button variant="ghost" size="sm" onClick={goToPrevious}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          {selectedIndex + 1} de {documents.length}
        </span>
        <Button variant="ghost" size="sm" onClick={goToNext}>
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
