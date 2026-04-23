import { useState, useEffect, useRef } from "react";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  FileText,
  Upload,
  Download,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Files,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Motorista } from "@/pages/Motoristas";

interface MotoristDocumento {
  id: string;
  tipo_documento: string;
  nome_ficheiro: string | null;
  ficheiro_url: string;
  data_validade: string | null;
  observacoes: string | null;
  created_at: string;
}

const TIPOS_DOCUMENTO = [
  { value: "documento_identificacao", label: "Cartão Cidadão (Frente)", field: "documento_ficheiro_url", validityField: "documento_validade", storageFolder: "documentos" },
  { value: "documento_identificacao_verso", label: "Cartão Cidadão (Verso)", field: "documento_identificacao_verso_url", validityField: "documento_validade", storageFolder: "documentos" },
  { value: "carta_conducao", label: "Carta Condução (Frente)", field: "carta_ficheiro_url", validityField: "carta_validade", storageFolder: "cartas" },
  { value: "carta_conducao_verso", label: "Carta Condução (Verso)", field: "carta_conducao_verso_url", validityField: "carta_validade", storageFolder: "cartas" },
  { value: "licenca_tvde", label: "Licença TVDE", field: "licenca_tvde_ficheiro_url", validityField: "licenca_tvde_validade", storageFolder: "tvde" },
  { value: "registo_criminal", label: "Registo Criminal", field: "registo_criminal_url", storageFolder: "documentos" },
  { value: "comprovativo_morada", label: "Comprovativo Morada", field: "comprovativo_morada_url", storageFolder: "documentos" },
  { value: "comprovativo_iban", label: "Comprovativo IBAN", field: "comprovativo_iban_url", storageFolder: "documentos" },
  { value: "outros", label: "Outros Documentos", storageFolder: "documentos" },
];

interface MotoristaTabDocumentosProps {
  motorista: Motorista;
  onMotoristaUpdated?: () => void;
}

export function MotoristaTabDocumentos({ motorista, onMotoristaUpdated }: MotoristaTabDocumentosProps) {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<MotoristDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<MotoristDocumento | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    loadDocumentos();
  }, [motorista.id]);

  const loadDocumentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("motorista_documentos")
        .select("*")
        .eq("motorista_id", motorista.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  const getDocumentoByTipo = (tipoValue: string, field?: string) => {
    // Primeiro tenta buscar nos campos oficiais do motorista
    if (field && (motorista as any)[field]) {
      return {
        id: field,
        tipo_documento: tipoValue,
        ficheiro_url: (motorista as any)[field],
        nome_ficheiro: `${tipoValue.replace(/_/g, " ").toUpperCase()}`,
        data_validade: null, // As validades principais são tratadas à parte se necessário
        created_at: motorista.created_at || new Date().toISOString(),
        is_official: true
      };
    }
    
    // Se não encontrar no motorista, busca na tabela de documentos extras
    const extra = documentos.find((d) => d.tipo_documento === tipoValue);
    if (extra) return { ...extra, is_official: false };
    
    return undefined;
  };

  const getValidadeStatus = (dataValidade: string | null) => {
    if (!dataValidade) return { status: "sem_validade", label: "Sem validade", color: "secondary" };

    const diasRestantes = differenceInDays(new Date(dataValidade), new Date());

    if (diasRestantes < 0) {
      return { status: "expirado", label: "Expirado", color: "destructive" };
    } else if (diasRestantes <= 30) {
      return { status: "expirando", label: `${diasRestantes}d restantes`, color: "warning" };
    } else {
      return {
        status: "valido",
        label: format(new Date(dataValidade), "dd/MM/yyyy"),
        color: "default",
      };
    }
  };

  const handleUpload = async (tipo: string, file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ficheiro muito grande. Máximo: 10MB");
      return;
    }

    setUploading(tipo);

    try {
      if (!user) throw new Error("Utilizador não autenticado");
      
      const fileExt = file.name.split(".").pop();
      const tipoDef = TIPOS_DOCUMENTO.find(t => t.value === tipo);
      const storageFolder = tipoDef?.storageFolder || "documentos";
      
      // Mimetizar EXACTAMENTE o DocumentUploader.tsx (usando user.id para evitar RLS)
      const filePath = `${user.id}/${storageFolder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("motorista-documentos")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Erro no Storage:", uploadError);
        throw new Error(`Erro no servidor de ficheiros: ${uploadError.message}`);
      }

      // Se for um tipo que mapeia para um campo oficial, atualiza o motorista
      if (tipoDef?.field) {
        const { error: updateMotoristaError } = await supabase
          .from("motoristas_ativos")
          .update({ [tipoDef.field]: filePath })
          .eq("id", motorista.id);

        if (updateMotoristaError) {
          console.error("Erro ao atualizar motorista:", updateMotoristaError);
          throw new Error(`Erro na base de dados: ${updateMotoristaError.message}`);
        }
        toast.success(`${tipoDef.label} atualizado com sucesso!`);
      } else {
        // Caso contrário, trata como documento extra na tabela secundária
        const existente = documentos.find(d => d.tipo_documento === tipo);

        if (existente) {
          const { error: updateError } = await supabase
            .from("motorista_documentos")
            .update({
              ficheiro_url: filePath,
              nome_ficheiro: file.name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existente.id);

          if (updateError) throw updateError;
          await supabase.storage.from("motorista-documentos").remove([existente.ficheiro_url]);
        } else {
          const { error: insertError } = await supabase.from("motorista_documentos").insert({
            motorista_id: motorista.id,
            tipo_documento: tipo,
            ficheiro_url: filePath,
            nome_ficheiro: file.name,
          });

          if (insertError) throw insertError;
        }
        toast.success("Documento extra carregado com sucesso!");
      }

      loadDocumentos();
      if (onMotoristaUpdated) onMotoristaUpdated();
    } catch (error: any) {
      console.error("Erro ao carregar documento:", error);
      toast.error(`Erro ao carregar documento: ${error.message || "Erro desconhecido"}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (documento: MotoristDocumento) => {
    try {
      const { data, error } = await supabase.storage
        .from("motorista-documentos")
        .download(documento.ficheiro_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = documento.nome_ficheiro || "documento";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do documento");
    }
  };

  const handleView = async (documento: MotoristDocumento) => {
    try {
      const { data, error } = await supabase.storage
        .from("motorista-documentos")
        .createSignedUrl(documento.ficheiro_url, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Erro ao visualizar documento:", error);
      toast.error("Erro ao abrir documento");
    }
  };

  const handleDelete = async () => {
    if (!documentoToDelete) return;

    try {
      // Se for oficial, limpa o campo na tabela principal
      const tipoDef = TIPOS_DOCUMENTO.find(t => t.value === documentoToDelete.tipo_documento);
      if (tipoDef?.field) {
        const { error: updateMotoristaError } = await supabase
          .from("motoristas_ativos")
          .update({ [tipoDef.field]: null })
          .eq("id", motorista.id);

        if (updateMotoristaError) throw updateMotoristaError;
      } else {
        // Se for extra, remove da tabela secundária
        const { error } = await supabase
          .from("motorista_documentos")
          .delete()
          .eq("id", documentoToDelete.id);

        if (error) throw error;
      }

      // Em ambos os casos, tenta remover o ficheiro do storage
      await supabase.storage
        .from("motorista-documentos")
        .remove([documentoToDelete.ficheiro_url]);

      toast.success("Documento removido com sucesso!");
      loadDocumentos();
      if (onMotoristaUpdated) onMotoristaUpdated();
    } catch (error) {
      console.error("Erro ao remover documento:", error);
      toast.error("Erro ao remover documento");
    } finally {
      setDeleteDialogOpen(false);
      setDocumentoToDelete(null);
    }
  };

  const triggerFileInput = (tipo: string) => {
    fileInputRefs.current[tipo]?.click();
  };

  // Stats calculations
  const totalTipos = TIPOS_DOCUMENTO.length;
  const anexados = TIPOS_DOCUMENTO.filter(t => getDocumentoByTipo(t.value, t.field)).length;
  const emFalta = totalTipos - anexados;
  const aExpirar = documentos.filter(d => {
    if (!d.data_validade) return false;
    const dias = differenceInDays(new Date(d.data_validade), new Date());
    return dias >= 0 && dias <= 30;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">A carregar documentos...</div>
      </div>
    );
  }

  const statsCards = [
    { title: "Total", value: totalTipos, icon: Files, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "Anexados", value: anexados, icon: ShieldCheck, color: "text-green-500", bgColor: "bg-green-500/10" },
    { title: "Em Falta", value: emFalta, icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
    { title: "A Expirar", value: aExpirar, icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsCards.map((card) => (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents Table in SectionCard */}
      <SectionCard
        icon={<FileText className="h-4 w-4" />}
        title="Documentos do Motorista"
        headerClassName="bg-blue-50 dark:bg-blue-950/30"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Documentos próximos do vencimento serão destacados.
          </p>
          <Button variant="outline" size="sm" onClick={loadDocumentos}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Ficheiro</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TIPOS_DOCUMENTO.map((tipo) => {
              const documento = getDocumentoByTipo(tipo.value, tipo.field);
              
              // Determina a validade com base no campo oficial ou no documento extra
              let dataValidade = documento?.data_validade;
              if (tipo.validityField) {
                dataValidade = (motorista as any)[tipo.validityField];
              }
              
              const validadeInfo = documento || dataValidade ? getValidadeStatus(dataValidade) : null;

              return (
                <TableRow key={tipo.value} className={tipo.field ? "bg-muted/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tipo.field ? (
                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{tipo.label}</span>
                        {tipo.field && (
                          <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
                            Documento Oficial
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {documento ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm truncate max-w-[200px]">
                          {documento.nome_ficheiro || "Ficheiro anexado"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">Não anexado</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {validadeInfo && (
                      <Badge
                        variant={
                          validadeInfo.color === "warning"
                            ? "outline"
                            : validadeInfo.color === "destructive"
                            ? "destructive"
                            : "secondary"
                        }
                        className={
                          validadeInfo.color === "warning"
                            ? "border-yellow-500 text-yellow-600"
                            : ""
                        }
                      >
                        {validadeInfo.status === "expirado" && (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {validadeInfo.label}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="file"
                        ref={(el) => (fileInputRefs.current[tipo.value] = el)}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(tipo.value, file);
                          e.target.value = "";
                        }}
                      />

                      {documento ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleView(documento)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(documento)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => triggerFileInput(tipo.value)} disabled={uploading === tipo.value} title="Substituir">
                            <RefreshCw className={`h-4 w-4 ${uploading === tipo.value ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDocumentoToDelete(documento);
                              setDeleteDialogOpen(true);
                            }}
                            title="Remover"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => triggerFileInput(tipo.value)} disabled={uploading === tipo.value}>
                          {uploading === tipo.value ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              A carregar...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Anexar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <p className="text-xs text-muted-foreground mt-4">
          Formatos aceites: PDF, JPG, PNG. Tamanho máximo: 10MB.
        </p>
      </SectionCard>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende remover este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
