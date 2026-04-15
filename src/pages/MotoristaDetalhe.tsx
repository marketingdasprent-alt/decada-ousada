import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { 
  FileSignature, 
  Pencil, 
  User, 
  Phone, 
  CreditCard, 
  Car, 
  FileText, 
  MessageSquare, 
  Fuel,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { MotoristaFullModal } from "@/components/motoristas/MotoristaFullModal";
import type { Motorista } from "@/pages/Motoristas";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface ViaturaAtual {
  matricula: string;
  marca: string;
  modelo: string;
  ano: number | null;
  cor: string | null;
  categoria: string | null;
  data_inicio: string;
}

export default function MotoristaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState<"dados" | "contratos">("dados");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [viaturaAtual, setViaturaAtual] = useState<ViaturaAtual | null>(null);

  useEffect(() => {
    if (id) {
      loadMotorista();
      loadViaturaAtual();
    }
  }, [id]);

  const loadMotorista = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("motoristas_ativos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Motorista não encontrado na base de dados ativa.");
      }
      
      setMotorista(data);
    } catch (error: any) {
      console.error("Erro ao carregar motorista:", error);
      toast({
        title: "Erro ao carregar motorista",
        description: error.message,
        variant: "destructive",
      });
      navigate("/motoristas");
    } finally {
      setLoading(false);
    }
  };

  const loadViaturaAtual = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('motorista_viaturas')
      .select('data_inicio, viaturas(matricula, marca, modelo, ano, cor, categoria)')
      .eq('motorista_id', id)
      .eq('status', 'ativo')
      .is('data_fim', null)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.viaturas) {
      const v = data.viaturas as any;
      setViaturaAtual({ ...v, data_inicio: data.data_inicio });
    } else {
      setViaturaAtual(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!motorista) return;

    try {
      setIsTogglingStatus(true);
      const newStatus = !motorista.status_ativo;
      const { error } = await supabase
        .from("motoristas_ativos")
        .update({ status_ativo: newStatus })
        .eq("id", motorista.id);

      if (error) throw error;

      setMotorista({ ...motorista, status_ativo: newStatus });
      toast({
        title: newStatus ? "Motorista ativado" : "Motorista inativado",
        description: `O motorista ${motorista.nome} foi ${newStatus ? 'ativado' : 'inativado'} com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTogglingStatus(false);
      setIsStatusDialogOpen(false);
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

  const handleViewContracts = () => {
    setInitialModalTab("contratos");
    setEditDialogOpen(true);
  };

  const handleEdit = () => {
    setInitialModalTab("dados");
    setEditDialogOpen(true);
  };

  const handleEditClose = (shouldRefresh: boolean) => {
    setEditDialogOpen(false);
    if (shouldRefresh) {
      loadMotorista();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando detalhes do motorista...</p>
      </div>
    );
  }

  if (!motorista) return null;

  const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-start gap-4 py-1">
      <span className="text-muted-foreground text-sm flex-shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header com Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/motoristas")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{motorista.nome}</h1>
              <Badge 
                variant={motorista.status_ativo ? "default" : "secondary"}
                className={motorista.status_ativo ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {motorista.status_ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm mt-1">Código: #{motorista.codigo}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleEdit}
            className="flex-1 md:flex-none"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleViewContracts}
            className="flex-1 md:flex-none"
          >
            <FileSignature className="h-4 w-4 mr-2" />
            Ver Contratos
          </Button>

          <Button 
            variant={motorista.status_ativo ? "destructive" : "default"}
            onClick={() => setIsStatusDialogOpen(true)}
            className={`flex-1 md:flex-none ${!motorista.status_ativo ? "bg-green-600 hover:bg-green-700" : ""}`}
          >
            {motorista.status_ativo ? (
              <><XCircle className="h-4 w-4 mr-2" /> Inativar</>
            ) : (
              <><CheckCircle className="h-4 w-4 mr-2" /> Ativar</>
            )}
          </Button>
        </div>
      </div>

      {/* Grid de Informações - Layout unificado para alinhamento e tamanhos iguais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Row 1 */}
        <SectionCard
          icon={<User className="h-4 w-4" />}
          title="Dados Pessoais"
          headerClassName="bg-blue-50 dark:bg-blue-950/30"
          className="h-full"
        >
          <div className="space-y-1">
            <InfoItem label="NIF" value={motorista.nif || "-"} />
            <InfoItem label="Morada" value={motorista.morada || "-"} />
            <InfoItem label="Código Postal" value={motorista.codigo_postal || "-"} />
            <InfoItem label="Cidade" value={motorista.cidade || "-"} />
          </div>
        </SectionCard>

        <SectionCard
          icon={<CreditCard className="h-4 w-4" />}
          title="Identificação"
          headerClassName="bg-amber-50 dark:bg-amber-950/30"
          className="h-full"
        >
          <div className="space-y-1">
            <InfoItem label="Tipo" value={motorista.documento_tipo || "-"} />
            <InfoItem label="Número" value={motorista.documento_numero || "-"} />
            <InfoItem label="Validade" value={formatDate(motorista.documento_validade)} />
            {(motorista.documento_ficheiro_url || motorista.documento_identificacao_verso_url) && (
              <div className="flex gap-2 pt-3">
                {motorista.documento_ficheiro_url && (
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <a href={motorista.documento_ficheiro_url} target="_blank" rel="noopener noreferrer">Ver Frente</a>
                  </Button>
                )}
                {motorista.documento_identificacao_verso_url && (
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <a href={motorista.documento_identificacao_verso_url} target="_blank" rel="noopener noreferrer">Ver Verso</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Licença TVDE"
          headerClassName="bg-cyan-50 dark:bg-cyan-950/30"
          className="h-full"
        >
          <div className="space-y-1">
            <InfoItem label="Número" value={motorista.licenca_tvde_numero || "-"} />
            <InfoItem label="Validade" value={formatDate(motorista.licenca_tvde_validade)} />
            {motorista.licenca_tvde_ficheiro_url && (
              <div className="pt-3">
                <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                  <a href={motorista.licenca_tvde_ficheiro_url} target="_blank" rel="noopener noreferrer">Ver Documento</a>
                </Button>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Row 2 */}
        <SectionCard
          icon={<Phone className="h-4 w-4" />}
          title="Contactos"
          headerClassName="bg-green-50 dark:bg-green-950/30"
          className="h-full"
        >
          <div className="space-y-1">
            <InfoItem label="Telefone" value={motorista.telefone || "-"} />
            <InfoItem label="Email" value={motorista.email || "-"} />
          </div>
        </SectionCard>

        <SectionCard
          icon={<Car className="h-4 w-4" />}
          title="Carta de Condução"
          headerClassName="bg-purple-50 dark:bg-purple-950/30"
          className="h-full"
        >
          <div className="space-y-1">
            <InfoItem label="Número" value={motorista.carta_conducao || "-"} />
            <InfoItem label="Categorias" value={motorista.carta_categorias?.join(", ") || "-"} />
            <InfoItem label="Validade" value={formatDate(motorista.carta_validade)} />
            {(motorista.carta_ficheiro_url || motorista.carta_conducao_verso_url) && (
              <div className="flex gap-2 pt-3">
                {motorista.carta_ficheiro_url && (
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <a href={motorista.carta_ficheiro_url} target="_blank" rel="noopener noreferrer">Ver Frente</a>
                  </Button>
                )}
                {motorista.carta_conducao_verso_url && (
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <a href={motorista.carta_conducao_verso_url} target="_blank" rel="noopener noreferrer">Ver Verso</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Documentos Adicionais"
          headerClassName="bg-slate-50 dark:bg-slate-950/30"
          className="h-full"
        >
          <div className="grid grid-cols-1 gap-2 pt-1">
            {motorista.registo_criminal_url && (
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                <a href={motorista.registo_criminal_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3 w-3 mr-2" /> Registo Criminal
                </a>
              </Button>
            )}
            {motorista.comprovativo_morada_url && (
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                <a href={motorista.comprovativo_morada_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3 w-3 mr-2" /> Comprovativo Morada
                </a>
              </Button>
            )}
            {motorista.comprovativo_iban_url && (
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                <a href={motorista.comprovativo_iban_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3 w-3 mr-2" /> Comprovativo IBAN
                </a>
              </Button>
            )}
            {!motorista.registo_criminal_url && !motorista.comprovativo_morada_url && !motorista.comprovativo_iban_url && (
              <p className="text-muted-foreground italic text-center py-2 text-sm">Sem documentos extra</p>
            )}
          </div>
        </SectionCard>

        {/* Row 3 */}
        <SectionCard
          icon={<Fuel className="h-4 w-4" />}
          title="Cartões Frota"
          headerClassName="bg-orange-50 dark:bg-orange-950/30"
          className="h-full"
        >
          <div className="space-y-1">
            <InfoItem label="BP" value={motorista.cartao_bp || "-"} />
            <InfoItem label="REPSOL" value={motorista.cartao_repsol || "-"} />
            <InfoItem label="EDP" value={motorista.cartao_edp || "-"} />
          </div>
        </SectionCard>

        <SectionCard
          icon={<Car className="h-4 w-4" />}
          title="Viatura Atual"
          headerClassName="bg-sky-50 dark:bg-sky-950/30"
          className="h-full"
        >
          {viaturaAtual ? (
            <div className="space-y-1">
              <InfoItem label="Matrícula" value={viaturaAtual.matricula} />
              <InfoItem label="Marca / Modelo" value={`${viaturaAtual.marca} ${viaturaAtual.modelo}`} />
              {viaturaAtual.ano && <InfoItem label="Ano" value={String(viaturaAtual.ano)} />}
              {viaturaAtual.cor && <InfoItem label="Cor" value={viaturaAtual.cor} />}
              {viaturaAtual.categoria && <InfoItem label="Categoria" value={viaturaAtual.categoria} />}
              <InfoItem label="Desde" value={formatDate(viaturaAtual.data_inicio)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-2">Sem viatura associada</p>
          )}
        </SectionCard>

        {motorista.observacoes && (
          <SectionCard
            icon={<MessageSquare className="h-4 w-4" />}
            title="Observações"
            headerClassName="bg-muted/50"
            className="h-full lg:col-span-2"
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{motorista.observacoes}</p>
          </SectionCard>
        )}
      </div>

      {/* Modais de Suporte */}
      <MotoristaFullModal 
        open={editDialogOpen} 
        onOpenChange={(open) => handleEditClose(!open)} 
        motorista={motorista}
        onMotoristaUpdated={loadMotorista}
        initialTab={initialModalTab}
      />

      {/* Alerta de Confirmação para Ativar/Inativar */}
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {motorista.status_ativo ? "Inativar Motorista" : "Ativar Motorista"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {motorista.status_ativo ? "inativar" : "ativar"} o motorista{" "}
              <strong>{motorista.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingStatus}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              className={motorista.status_ativo ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}
            >
              {isTogglingStatus ? "Processando..." : motorista.status_ativo ? "Inativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
