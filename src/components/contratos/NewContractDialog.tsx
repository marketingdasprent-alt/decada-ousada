import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, User, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  generateDocumentFromTemplate,
  uploadDocumentToStorage,
} from '@/utils/generateDocumentFromTemplate';
import { getEmpresaById } from '@/config/empresas';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  data_contratacao: string | null;
  cidade: string | null;
}

interface Template {
  id: string;
  nome: string;
  tipo: string;
  empresa_id: string;
}

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NewContractDialog = ({ open, onOpenChange, onSuccess }: NewContractDialogProps) => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [filteredMotoristas, setFilteredMotoristas] = useState<Motorista[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      // Reset state when dialog closes
      setSearchTerm('');
      setSelectedMotorista(null);
      setSelectedTemplateId('');
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMotoristas(motoristas);
    } else {
      const filtered = motoristas.filter(
        (m) =>
          m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (m.nif && m.nif.includes(searchTerm))
      );
      setFilteredMotoristas(filtered);
    }
  }, [searchTerm, motoristas]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load motoristas and templates in parallel
      const [motoristasResult, templatesResult] = await Promise.all([
        supabase
          .from('motoristas_ativos')
          .select('*')
          .eq('status_ativo', true)
          .order('nome', { ascending: true }),
        supabase
          .from('document_templates')
          .select('id, nome, tipo, empresa_id')
          .eq('ativo', true)
          .order('nome', { ascending: true }),
      ]);

      if (motoristasResult.error) throw motoristasResult.error;
      if (templatesResult.error) throw templatesResult.error;

      setMotoristas(motoristasResult.data || []);
      setFilteredMotoristas(motoristasResult.data || []);
      setTemplates(templatesResult.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (action: 'print' | 'download') => {
    if (!selectedMotorista || !selectedTemplateId) {
      toast.error('Selecione um motorista e um documento');
      return;
    }

    try {
      setIsGenerating(true);

      // Get template info
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (!template) throw new Error('Template não encontrado');

      const { data: user } = await supabase.auth.getUser();

      // Create contract via atomic RPC (handles dedup + versioning)
      const today = new Date().toISOString().split('T')[0];
      const { data: contratoResult, error: contratoError } = await supabase.rpc(
        'gerar_contrato_atomico',
        {
          p_motorista_id: selectedMotorista.id,
          p_empresa_id: template.empresa_id,
          p_motorista_nome: selectedMotorista.nome,
          p_motorista_nif: selectedMotorista.nif || null,
          p_motorista_email: selectedMotorista.email || null,
          p_motorista_telefone: selectedMotorista.telefone || null,
          p_motorista_morada: selectedMotorista.morada || null,
          p_motorista_documento_tipo: selectedMotorista.documento_tipo || null,
          p_motorista_documento_numero: selectedMotorista.documento_numero || null,
          p_cidade_assinatura: 'Leiria',
          p_data_assinatura: selectedMotorista.data_contratacao || today,
          p_data_inicio: selectedMotorista.data_contratacao || today,
          p_duracao_meses: 12,
          p_criado_por: user?.user?.id || null,
          p_force_new_version: false,
          p_template_id: selectedTemplateId,
        }
      );

      if (contratoError) throw contratoError;
      const contratoData = Array.isArray(contratoResult) ? contratoResult[0] : contratoResult;

      // Prepare motorista data
      const motoristaData = {
        nome: selectedMotorista.nome,
        nif: selectedMotorista.nif || '',
        documento_tipo: selectedMotorista.documento_tipo || '',
        documento_numero: selectedMotorista.documento_numero || '',
        documento_validade: selectedMotorista.documento_validade || '',
        carta_conducao: selectedMotorista.carta_conducao || '',
        carta_categorias: selectedMotorista.carta_categorias?.join(', ') || '',
        carta_validade: selectedMotorista.carta_validade || '',
        licenca_tvde_numero: selectedMotorista.licenca_tvde_numero || '',
        licenca_tvde_validade: selectedMotorista.licenca_tvde_validade || '',
        morada: selectedMotorista.morada || '',
        email: selectedMotorista.email || '',
        telefone: selectedMotorista.telefone || '',
      };

      // Get empresa data
      const empresa = getEmpresaById(template.empresa_id);

      // Generate document and upload to storage
      const documentUrl = await uploadDocumentToStorage({
        templateId: selectedTemplateId,
        motoristaData,
        documentData: {
          data_inicio: selectedMotorista.data_contratacao || today,
          data_assinatura: selectedMotorista.data_contratacao || today,
          cidade_assinatura: 'Leiria',
          duracao_meses: 12,
          empresaData: empresa
            ? {
                nomeCompleto: empresa.nomeCompleto,
                nif: empresa.nif,
                sede: empresa.sede,
                licencaTVDE: empresa.licencaTVDE,
                licencaValidade: empresa.licencaValidade,
                representante: empresa.representante,
                cargoRepresentante: empresa.cargoRepresentante,
              }
            : undefined,
        },
        contratoId: contratoData.id,
        action,
      });

      // Update contract with document URL
      if (documentUrl) {
        await supabase
          .from('contratos')
          .update({ documento_url: documentUrl })
          .eq('id', contratoData.id);
      }

      // Log the generation
      const isExisting = (contratoData as any)?.is_existing;
      await supabase.from('contratos_reimpressoes').insert({
        contrato_id: contratoData.id,
        reimpresso_por: user?.user?.id,
        motivo: isExisting ? 'Reimpressão de contrato existente' : 'Geração inicial do documento',
      });

      toast.success(
        isExisting ? 'Documento reimpresso com sucesso!' : 'Contrato gerado com sucesso!'
      );

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao gerar contrato:', error);
      toast.error('Erro ao gerar contrato: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Novo Contrato
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Motorista Search */}
            <div className="space-y-2">
              <Label>Motorista</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar motorista por nome, email ou NIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {!selectedMotorista && (
                <ScrollArea className="h-[200px] border rounded-md">
                  {filteredMotoristas.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhum motorista encontrado
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredMotoristas.map((motorista) => (
                        <button
                          key={motorista.id}
                          onClick={() => setSelectedMotorista(motorista)}
                          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{motorista.nome}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {motorista.email || motorista.telefone || 'Sem contato'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}

              {selectedMotorista && (
                <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary rounded-md">
                  <User className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedMotorista.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMotorista.email || selectedMotorista.telefone}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMotorista(null)}>
                    Alterar
                  </Button>
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Documento</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGenerate('download')}
            disabled={isGenerating || loading || !selectedMotorista || !selectedTemplateId}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar...
              </>
            ) : (
              'Download'
            )}
          </Button>
          <Button
            onClick={() => handleGenerate('print')}
            disabled={isGenerating || loading || !selectedMotorista || !selectedTemplateId}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar...
              </>
            ) : (
              'Imprimir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
