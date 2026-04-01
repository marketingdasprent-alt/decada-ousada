import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  FileSignature,
  Download,
  Printer,
  Eye,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Files,
  Briefcase,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EMPRESAS } from "@/config/empresas";
import { generateDocumentFromTemplate } from "@/utils/generateDocumentFromTemplate";
import { GenerateDocumentsDialog } from "../GenerateDocumentsDialog";
import type { Motorista } from "@/pages/Motoristas";

interface Contrato {
  id: string;
  empresa_id: string;
  motorista_nome: string;
  data_assinatura: string;
  data_inicio: string;
  cidade_assinatura: string;
  status: string;
  versao: number;
  documento_url: string | null;
  template_id: string | null;
  criado_em: string;
}

interface MotoristaTabContratosProps {
  motorista: Motorista;
  onMotoristaUpdated?: () => void;
}

export function MotoristaTabContratos({ motorista, onMotoristaUpdated }: MotoristaTabContratosProps) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [editingContratual, setEditingContratual] = useState(false);
  const [dataContratacao, setDataContratacao] = useState(motorista.data_contratacao || "");
  const [cidadeAssinatura, setCidadeAssinatura] = useState(motorista.cidade_assinatura || "");

  useEffect(() => {
    loadContratos();
  }, [motorista.id]);

  const loadContratos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("motorista_id", motorista.id)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error("Erro ao carregar contratos:", error);
      toast.error("Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  };

  const getEmpresaNome = (empresaId: string) => {
    return EMPRESAS[empresaId as keyof typeof EMPRESAS]?.nome || empresaId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge variant="default">Ativo</Badge>;
      case "substituido":
        return <Badge variant="secondary">Substituído</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownload = async (contrato: Contrato) => {
    if (!contrato.documento_url) {
      toast.error("Documento não encontrado");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("documentos")
        .download(contrato.documento_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrato_${motorista.nome}_${contrato.empresa_id}_v${contrato.versao}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do contrato");
    }
  };

  const handleReimprimir = async (contrato: Contrato) => {
    if (!contrato.template_id) {
      toast.error("Template não encontrado para reimprimir");
      return;
    }

    setGenerating(contrato.id);

    try {
      await generateDocumentFromTemplate({
        templateId: contrato.template_id,
        motoristaData: {
          nome: motorista.nome,
          nif: motorista.nif,
          email: motorista.email,
          telefone: motorista.telefone,
          morada: motorista.morada,
          documento_tipo: motorista.documento_tipo,
          documento_numero: motorista.documento_numero,
        },
        documentData: {
          data_assinatura: contrato.data_assinatura,
          data_inicio: contrato.data_inicio,
          cidade_assinatura: contrato.cidade_assinatura,
        },
        action: "print",
      });
    } catch (error) {
      console.error("Erro ao reimprimir:", error);
      toast.error("Erro ao reimprimir contrato");
    } finally {
      setGenerating(null);
    }
  };

  const handleView = async (contrato: Contrato) => {
    if (!contrato.documento_url) {
      toast.error("Documento não encontrado");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(contrato.documento_url, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Erro ao visualizar contrato:", error);
      toast.error("Erro ao abrir contrato");
    }
  };

  const handleContractGenerated = () => {
    setGenerateDialogOpen(false);
    loadContratos();
  };

  const handleSaveContratual = async () => {
    try {
      const { error } = await supabase
        .from("motoristas_ativos")
        .update({
          data_contratacao: dataContratacao || null,
          cidade_assinatura: cidadeAssinatura || null,
        })
        .eq("id", motorista.id);

      if (error) throw error;
      toast.success("Informação contratual atualizada");
      setEditingContratual(false);
      onMotoristaUpdated?.();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar informação contratual");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  // Stats
  const totalContratos = contratos.length;
  const ativos = contratos.filter(c => c.status === "ativo").length;
  const inativos = contratos.filter(c => c.status !== "ativo").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">A carregar contratos...</div>
      </div>
    );
  }

  const statsCards = [
    { title: "Total", value: totalContratos, icon: Files, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "Ativos", value: ativos, icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" },
    { title: "Inativos", value: inativos, icon: XCircle, color: "text-muted-foreground", bgColor: "bg-muted" },
  ];

  return (
    <div className="space-y-6">
      {/* Info Contratual */}
      <SectionCard
        icon={<Briefcase className="h-4 w-4" />}
        title="Info Contratual"
        headerClassName="bg-teal-50 dark:bg-teal-950/30"
      >
        {editingContratual ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de Contratação</Label>
                <Input
                  type="date"
                  value={dataContratacao}
                  onChange={(e) => setDataContratacao(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade de Assinatura</Label>
                <Input
                  value={cidadeAssinatura}
                  onChange={(e) => setCidadeAssinatura(e.target.value)}
                  placeholder="Ex: Lisboa"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => {
                setEditingContratual(false);
                setDataContratacao(motorista.data_contratacao || "");
                setCidadeAssinatura(motorista.cidade_assinatura || "");
              }}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveContratual}>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Data de Contratação</span>
                <p className="font-medium">{formatDate(motorista.data_contratacao)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cidade de Assinatura</span>
                <p className="font-medium">{motorista.cidade_assinatura || "-"}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditingContratual(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Tabela de Contratos in SectionCard */}
      <SectionCard
        icon={<FileSignature className="h-4 w-4" />}
        title="Contratos"
        headerClassName="bg-emerald-50 dark:bg-emerald-950/30"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Lista de contratos gerados para este motorista.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadContratos}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setGenerateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Gerar Documentos
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Data Assinatura</TableHead>
              <TableHead>Data Início</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <FileSignature className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Nenhum contrato gerado.</p>
                </TableCell>
              </TableRow>
            ) : (
              contratos.map((contrato) => (
                <TableRow key={contrato.id} className={contrato.status === "substituido" ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{getEmpresaNome(contrato.empresa_id)}</TableCell>
                  <TableCell>{format(new Date(contrato.data_assinatura), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{format(new Date(contrato.data_inicio), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{contrato.cidade_assinatura}</TableCell>
                  <TableCell><Badge variant="outline">v{contrato.versao}</Badge></TableCell>
                  <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {contrato.documento_url && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleView(contrato)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(contrato)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {contrato.template_id && (
                        <Button variant="ghost" size="icon" onClick={() => handleReimprimir(contrato)} disabled={generating === contrato.id} title="Reimprimir">
                          <Printer className={`h-4 w-4 ${generating === contrato.id ? "animate-pulse" : ""}`} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Dialog para gerar documentos */}
      <GenerateDocumentsDialog
        open={generateDialogOpen}
        onOpenChange={(open) => {
          setGenerateDialogOpen(open);
          if (!open) loadContratos();
        }}
        motorista={motorista}
      />
    </div>
  );
}
