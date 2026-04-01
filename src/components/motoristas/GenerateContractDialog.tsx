import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarIcon, FileText, AlertCircle, Loader2, RefreshCw, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { generateDocumentFromTemplate } from "@/utils/generateDocumentFromTemplate";
import { validateDriverData } from "@/utils/generateContract";
import { toast } from "sonner";
import { getEmpresasList, getEmpresaById } from "@/config/empresas";
import { supabase } from "@/integrations/supabase/client";

interface ExistingContract {
  id: string;
  versao: number;
  data_assinatura: string;
  documento_url: string | null;
}

interface Motorista {
  id: string;
  nome: string;
  nif: string | null;
  documento_tipo: string | null;
  documento_numero: string | null;
  documento_validade: string | null;
  carta_conducao: string | null;
  carta_categorias: string[] | null;
  carta_validade: string | null;
  licenca_tvde_numero: string | null;
  licenca_tvde_validade: string | null;
  morada: string | null;
  email: string | null;
  telefone: string | null;
  data_contratacao?: string | null;
  cidade?: string | null;
  cidade_assinatura?: string | null;
}

interface GenerateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: Motorista | null;
}

export function GenerateContractDialog({ open, onOpenChange, motorista }: GenerateContractDialogProps) {
  const [signingCity, setSigningCity] = useState<string>("Leiria");
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("decada_ousada");
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingContract, setExistingContract] = useState<ExistingContract | null>(null);
  const [checkingContract, setCheckingContract] = useState(false);
  const [actionMode, setActionMode] = useState<'choose' | 'reprint' | 'new'>('choose');

  // Verificar contrato existente quando empresa muda
  useEffect(() => {
    const checkExistingContract = async () => {
      if (!motorista?.id || !selectedEmpresa || !open) {
        setExistingContract(null);
        return;
      }

      setCheckingContract(true);
      try {
        const { data, error } = await supabase
          .from('contratos')
          .select('id, versao, data_assinatura, documento_url')
          .eq('motorista_id', motorista.id)
          .eq('empresa_id', selectedEmpresa)
          .eq('status', 'ativo')
          .single();

        if (data && !error) {
          setExistingContract(data);
          setActionMode('choose');
        } else {
          setExistingContract(null);
          setActionMode('new');
        }
      } catch {
        setExistingContract(null);
        setActionMode('new');
      } finally {
        setCheckingContract(false);
      }
    };

    checkExistingContract();
  }, [motorista?.id, selectedEmpresa, open]);

  // Atualizar cidade de assinatura quando motorista mudar
  useEffect(() => {
    if (motorista?.cidade_assinatura) {
      setSigningCity(motorista.cidade_assinatura);
    } else {
      setSigningCity("Leiria");
    }
  }, [motorista]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setIsGenerating(false);
      setExistingContract(null);
      setActionMode('choose');
    }
  }, [open]);


  // Validar que o ano da data está entre 1900 e 2100
  const isValidDateYear = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const match = dateString.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    return year >= 1900 && year <= 2100;
  };

  // Reimprimir contrato existente (não cria novo registo)
  const handleReprint = async () => {
    if (!motorista || !existingContract) return;

    setIsGenerating(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      const empresa = getEmpresaById(selectedEmpresa);
      
      if (!empresa) {
        toast.error("Empresa não encontrada");
        setIsGenerating(false);
        return;
      }

      // Registrar reimpressão
      await supabase
        .from('contratos_reimpressoes')
        .insert({
          contrato_id: existingContract.id,
          reimpresso_por: user?.user?.id,
          motivo: 'Reimpressão de contrato existente'
        });

      // Buscar template ativo para a empresa
      const { data: templates } = await supabase
        .from('document_templates')
        .select('*')
        .eq('empresa_id', selectedEmpresa)
        .eq('ativo', true)
        .eq('tipo', 'contrato_tvde')
        .limit(1)
        .single();

      if (!templates) {
        toast.error('Nenhum template de contrato encontrado para esta empresa');
        setIsGenerating(false);
        return;
      }

      const dataContrato = existingContract.data_assinatura;

      // Gerar e imprimir documento
      await generateDocumentFromTemplate({
        templateId: templates.id,
        motoristaData: {
          nome: motorista.nome,
          nif: motorista.nif,
          documento_tipo: motorista.documento_tipo,
          documento_numero: motorista.documento_numero,
          documento_validade: motorista.documento_validade,
          carta_conducao: motorista.carta_conducao,
          carta_categorias: motorista.carta_categorias,
          carta_validade: motorista.carta_validade,
          licenca_tvde_numero: motorista.licenca_tvde_numero,
          licenca_tvde_validade: motorista.licenca_tvde_validade,
          morada: motorista.morada,
          email: motorista.email,
          telefone: motorista.telefone,
        },
        documentData: {
          data_inicio: new Date(dataContrato),
          data_assinatura: new Date(dataContrato),
          cidade_assinatura: signingCity,
          duracao_meses: 12,
          empresaData: {
            nomeCompleto: empresa.nomeCompleto,
            nif: empresa.nif,
            sede: empresa.sede,
            licencaTVDE: empresa.licencaTVDE,
            licencaValidade: empresa.licencaValidade,
            representante: empresa.representante,
            cargoRepresentante: empresa.cargoRepresentante,
          }
        },
        action: 'print'
      });

      onOpenChange(false);
      toast.success('Contrato reimpresso com sucesso!');

    } catch (error: any) {
      console.error('Erro ao reimprimir contrato:', error);
      toast.error('Erro ao reimprimir contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  // Criar novo contrato (nova versão)
  const handleCreateNew = async () => {
    if (!motorista) return;

    if (!motorista.data_contratacao) {
      toast.error("Este motorista não tem data de contratação definida. Por favor, edite o motorista e adicione a data de contratação antes de gerar o contrato.");
      return;
    }

    // Validar ano da data de contratação
    if (!isValidDateYear(motorista.data_contratacao)) {
      const year = motorista.data_contratacao.split('-')[0];
      toast.error(`Data de contratação inválida: ano "${year}" fora do intervalo permitido (1900-2100). Por favor, corrija a data no cadastro do motorista.`);
      return;
    }

    const missingFields = validateDriverData(motorista);
    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios em falta: ${missingFields.join(", ")}`);
      return;
    }

    if (!signingCity.trim()) {
      toast.error("Por favor, insira a cidade de assinatura");
      return;
    }

    const empresa = getEmpresaById(selectedEmpresa);
    if (!empresa) {
      toast.error("Empresa não selecionada");
      return;
    }

    const dataContrato = motorista.data_contratacao;

    setIsGenerating(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      
      // Usar função atômica PostgreSQL para criar nova versão
      const { data: contratoData, error: contratoError } = await supabase
        .rpc('gerar_contrato_atomico', {
          p_motorista_id: motorista.id,
          p_empresa_id: selectedEmpresa,
          p_motorista_nome: motorista.nome,
          p_motorista_nif: motorista.nif || '',
          p_motorista_email: motorista.email || '',
          p_motorista_telefone: motorista.telefone || '',
          p_motorista_morada: motorista.morada || '',
          p_motorista_documento_tipo: motorista.documento_tipo || '',
          p_motorista_documento_numero: motorista.documento_numero || '',
          p_cidade_assinatura: signingCity.trim(),
          p_data_assinatura: dataContrato,
          p_data_inicio: dataContrato,
          p_duracao_meses: 12,
          p_criado_por: user?.user?.id,
        })
        .single();

      if (contratoError) {
        console.error('Erro ao gerar contrato:', contratoError);
        toast.error('Erro ao processar contrato');
        setIsGenerating(false);
        return;
      }

      // Registrar histórico de impressão
      await supabase
        .from('contratos_reimpressoes')
        .insert({
          contrato_id: contratoData.id,
          reimpresso_por: user?.user?.id,
          motivo: 'Nova versão de contrato'
        });

      // Buscar template ativo para a empresa
      const { data: templates } = await supabase
        .from('document_templates')
        .select('*')
        .eq('empresa_id', selectedEmpresa)
        .eq('ativo', true)
        .eq('tipo', 'contrato_tvde')
        .limit(1)
        .single();

      if (!templates) {
        toast.error('Nenhum template de contrato encontrado para esta empresa');
        return;
      }

      // Gerar e imprimir documento
      await generateDocumentFromTemplate({
        templateId: templates.id,
        motoristaData: {
          nome: motorista.nome,
          nif: motorista.nif,
          documento_tipo: motorista.documento_tipo,
          documento_numero: motorista.documento_numero,
          documento_validade: motorista.documento_validade,
          carta_conducao: motorista.carta_conducao,
          carta_categorias: motorista.carta_categorias,
          carta_validade: motorista.carta_validade,
          licenca_tvde_numero: motorista.licenca_tvde_numero,
          licenca_tvde_validade: motorista.licenca_tvde_validade,
          morada: motorista.morada,
          email: motorista.email,
          telefone: motorista.telefone,
        },
        documentData: {
          data_inicio: new Date(dataContrato),
          data_assinatura: new Date(dataContrato),
          cidade_assinatura: signingCity,
          duracao_meses: 12,
          empresaData: {
            nomeCompleto: empresa.nomeCompleto,
            nif: empresa.nif,
            sede: empresa.sede,
            licencaTVDE: empresa.licencaTVDE,
            licencaValidade: empresa.licencaValidade,
            representante: empresa.representante,
            cargoRepresentante: empresa.cargoRepresentante,
          }
        },
        action: 'print'
      });

      onOpenChange(false);
      toast.success('Nova versão do contrato gerada com sucesso!');

    } catch (error: any) {
      console.error('Erro ao processar contrato:', error);
      toast.error('Erro ao processar contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {motorista && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Dados do Motorista</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium">{motorista.nome}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NIF:</span>
                  <p className="font-medium">{motorista.nif || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Licença TVDE:</span>
                  <p className="font-medium">{motorista.licenca_tvde_numero || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{motorista.email || "—"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data de Contratação (Data do Contrato) *</Label>
              <div className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                {motorista?.data_contratacao ? (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(motorista.data_contratacao), "PPP", { locale: pt })}
                    </span>
                  </div>
                ) : (
                  <span className="text-destructive">
                    ⚠️ Motorista sem data de contratação definida
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Esta data será usada como data de início e data de assinatura do contrato. 
                Para alterar, edite o cadastro do motorista.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cidade de Assinatura *</Label>
              <Input
                value={signingCity}
                onChange={(e) => setSigningCity(e.target.value)}
                placeholder="Ex: Leiria"
              />
            </div>

            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {getEmpresasList().map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mostrar alerta se já existe contrato */}
        {existingContract && actionMode === 'choose' && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Contrato Existente</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Este motorista já possui um contrato ativo (v{existingContract.versao}) para esta empresa, 
              assinado em {format(new Date(existingContract.data_assinatura), "dd/MM/yyyy")}.
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActionMode('reprint')}
                  className="border-amber-500 text-amber-700 hover:bg-amber-100"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reimprimir Existente
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActionMode('new')}
                  className="border-amber-500 text-amber-700 hover:bg-amber-100"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Nova Versão
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          
          {checkingContract ? (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A verificar...
            </Button>
          ) : actionMode === 'reprint' ? (
            <Button 
              onClick={handleReprint} 
              disabled={isGenerating}
              className={cn(isGenerating && "cursor-not-allowed opacity-50")}
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RefreshCw className="mr-2 h-4 w-4" />
              {isGenerating ? 'Reimprimindo...' : 'Reimprimir Contrato'}
            </Button>
          ) : actionMode === 'new' ? (
            <Button 
              onClick={handleCreateNew} 
              disabled={isGenerating || !motorista?.data_contratacao}
              className={cn(isGenerating && "cursor-not-allowed opacity-50")}
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingContract ? <PlusCircle className="mr-2 h-4 w-4" /> : null}
              {isGenerating ? 'Processando...' : existingContract ? 'Criar Nova Versão' : 'Gerar Contrato'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
