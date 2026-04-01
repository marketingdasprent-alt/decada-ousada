import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { pt } from "date-fns/locale";

interface MotoristaAtivo {
  documento_tipo: string;
  documento_numero: string;
  documento_validade: string;
  carta_conducao: string;
  carta_categorias: string[];
  carta_validade: string;
  licenca_tvde_numero: string;
  licenca_tvde_validade: string;
}

interface MotoristaDocumentosCardProps {
  motorista: MotoristaAtivo;
}

interface DocumentoStatus {
  nome: string;
  numero: string | null;
  validade: string | null;
  categorias?: string[];
}

export function MotoristaDocumentosCard({ motorista }: MotoristaDocumentosCardProps) {
  const documentos: DocumentoStatus[] = [
    {
      nome: motorista.documento_tipo || "Documento de Identificação",
      numero: motorista.documento_numero,
      validade: motorista.documento_validade
    },
    {
      nome: "Carta de Condução",
      numero: motorista.carta_conducao,
      validade: motorista.carta_validade,
      categorias: motorista.carta_categorias
    },
    {
      nome: "Licença TVDE",
      numero: motorista.licenca_tvde_numero,
      validade: motorista.licenca_tvde_validade
    }
  ];

  function getStatusBadge(validade: string | null) {
    if (!validade) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          Sem data
        </Badge>
      );
    }

    const dataValidade = new Date(validade);
    const hoje = new Date();
    const diasRestantes = differenceInDays(dataValidade, hoje);

    if (isPast(dataValidade)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expirado
        </Badge>
      );
    }

    if (diasRestantes <= 30) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-600">
          <AlertTriangle className="w-3 h-3" />
          Expira em {diasRestantes} dias
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-600">
        <CheckCircle className="w-3 h-3" />
        Válido
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documentos.map((doc, index) => (
            <div 
              key={index} 
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b last:border-0"
            >
              <div>
                <p className="font-medium">{doc.nome}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {doc.numero && (
                    <span className="font-mono">{doc.numero}</span>
                  )}
                  {doc.categorias && doc.categorias.length > 0 && (
                    <span className="text-xs">
                      Categorias: {doc.categorias.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {doc.validade && (
                  <span className="text-sm text-muted-foreground">
                    Válido até: {format(new Date(doc.validade), "dd/MM/yyyy", { locale: pt })}
                  </span>
                )}
                {getStatusBadge(doc.validade)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
