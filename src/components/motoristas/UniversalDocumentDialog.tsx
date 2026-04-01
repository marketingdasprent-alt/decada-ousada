import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadDocumentToStorage } from '@/utils/generateDocumentFromTemplate';
import { Motorista } from '@/pages/Motoristas';
import { getEmpresaById } from '@/config/empresas';
import { format } from 'date-fns';

interface UniversalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: Motorista;
  templateId: string;
}

interface DynamicField {
  id: string;
  label: string;
  tipo: string;
  required?: boolean;
}

interface TemplateData {
  nome: string;
  campos_dinamicos: any;
}

// Definição dos campos de documento com metadados completos
const DOCUMENT_FIELDS_METADATA: Record<string, DynamicField> = {
  'data_inicio': { id: 'data_inicio', label: 'Data de Início', tipo: 'date', required: true },
  'data_assinatura': { id: 'data_assinatura', label: 'Data de Assinatura', tipo: 'date', required: true },
  'cidade_assinatura': { id: 'cidade_assinatura', label: 'Cidade de Assinatura', tipo: 'text', required: true },
  'duracao_meses': { id: 'duracao_meses', label: 'Duração (meses)', tipo: 'number', required: true }
};

export const UniversalDocumentDialog = ({
  open,
  onOpenChange,
  motorista,
  templateId,
}: UniversalDocumentDialogProps) => {
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [documentData, setDocumentData] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && templateId) {
      loadTemplate();
    }
  }, [open, templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('nome, campos_dinamicos')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      // Identificar campos de documento baseado no tipo de template
      const camposDinamicos = data?.campos_dinamicos as any;
      const contratoFields = camposDinamicos?.contrato || camposDinamicos?.documento || [];

      // Extrair nomes de campos dos placeholders (remover {{ }})
      const fieldNames = contratoFields.map((placeholder: string) => 
        placeholder.replace(/\{\{|\}\}/g, '').trim()
      );

      // Criar objetos de campos com metadados
      const documentFields = fieldNames
        .map((name: string) => DOCUMENT_FIELDS_METADATA[name])
        .filter(Boolean); // Remover undefined

      // Inicializar valores padrão usando dados do motorista
      const initialData: Record<string, any> = {};
      documentFields.forEach((field: DynamicField) => {
        if (field.tipo === 'date') {
          // Usar data_contratacao do motorista se disponível, senão data atual
          initialData[field.id] = motorista.data_contratacao || new Date().toISOString().split('T')[0];
        } else if (field.id === 'cidade_assinatura') {
          // Cidade sempre fixada como Leiria
          initialData[field.id] = 'Leiria';
        } else if (field.id === 'duracao_meses') {
          initialData[field.id] = 12; // Valor padrão
        }
      });

      setTemplate({ ...data, campos_dinamicos: { documento: documentFields } });
      setDocumentData(initialData);
    } catch (error: any) {
      console.error('Erro ao carregar template:', error);
      toast.error('Erro ao carregar informações do documento');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setDocumentData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleGenerate = async (action: 'print' | 'download') => {
    // Validar campos obrigatórios
    const documentFields = template?.campos_dinamicos?.documento || [];
    const missingFields = documentFields.filter(
      (field) => field.required && !documentData[field.id]
    );

    if (missingFields.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }

    try {
      setIsGenerating(true);

      // Buscar informações completas do template para verificar o tipo
      const { data: templateData, error: templateError } = await supabase
        .from('document_templates')
        .select('tipo, empresa_id')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Se for um contrato, registrar na tabela contratos
      let contratoId: string | undefined;
      if (templateData.tipo === 'contrato_tvde' || templateData.tipo === 'contrato') {
        const { data: user } = await supabase.auth.getUser();
        
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .insert({
            motorista_id: motorista.id,
            motorista_nome: motorista.nome,
            motorista_nif: motorista.nif,
            motorista_email: motorista.email,
            motorista_telefone: motorista.telefone,
            motorista_morada: motorista.morada,
            motorista_documento_tipo: motorista.documento_tipo,
            motorista_documento_numero: motorista.documento_numero,
            empresa_id: templateData.empresa_id,
            template_id: templateId,
            data_inicio: documentData.data_inicio || motorista.data_contratacao || new Date().toISOString().split('T')[0],
            data_assinatura: documentData.data_assinatura || motorista.data_contratacao || new Date().toISOString().split('T')[0],
            cidade_assinatura: 'Leiria',
            duracao_meses: 12,
            status: 'ativo',
            versao: 1,
            criado_por: user?.user?.id,
          })
          .select()
          .single();

        if (contratoError) {
          console.error('Erro ao salvar contrato:', contratoError);
          toast.error('Erro ao registrar contrato na base de dados');
          return;
        }

        contratoId = contratoData.id;

        // Registrar geração inicial no histórico
        await supabase
          .from('contratos_reimpressoes')
          .insert({
            contrato_id: contratoId,
            reimpresso_por: user?.user?.id,
            motivo: 'Geração inicial do documento',
          });
      }

      // Preparar dados do motorista
      const motoristaData = {
        nome: motorista.nome,
        nif: motorista.nif || '',
        documento_tipo: motorista.documento_tipo || '',
        documento_numero: motorista.documento_numero || '',
        carta_conducao: motorista.carta_conducao || '',
        carta_categorias: motorista.carta_categorias?.join(', ') || '',
        carta_validade: motorista.carta_validade || '',
        licenca_tvde_numero: motorista.licenca_tvde_numero || '',
        licenca_tvde_validade: motorista.licenca_tvde_validade || '',
        morada: motorista.morada || '',
        email: motorista.email || '',
        telefone: motorista.telefone || '',
      };

      // Buscar dados da empresa
      const empresa = getEmpresaById(templateData.empresa_id);

      const docData = {
        ...documentData,
        empresaData: empresa ? {
          nomeCompleto: empresa.nomeCompleto,
          nif: empresa.nif,
          sede: empresa.sede,
          licencaTVDE: empresa.licencaTVDE,
          licencaValidade: empresa.licencaValidade,
          representante: empresa.representante,
          cargoRepresentante: empresa.cargoRepresentante,
        } : undefined
      };

      // Generate and upload document to storage
      if (contratoId) {
        const documentUrl = await uploadDocumentToStorage({
          templateId,
          motoristaData,
          documentData: docData,
          contratoId,
          action,
        });

        // Update contract with document URL
        if (documentUrl) {
          await supabase
            .from('contratos')
            .update({ documento_url: documentUrl })
            .eq('id', contratoId);
        }
      } else {
        // For non-contract documents, just generate without storage
        const { generateDocumentFromTemplate } = await import('@/utils/generateDocumentFromTemplate');
        await generateDocumentFromTemplate({
          templateId,
          motoristaData,
          documentData: docData,
          action,
        });
      }

      const successMessage = contratoId 
        ? 'Contrato gerado e registrado com sucesso!' 
        : `Documento ${action === 'print' ? 'enviado para impressão' : 'transferido com sucesso'}!`;
      
      toast.success(successMessage);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderField = (field: DynamicField) => {
    // Campo cidade_assinatura sempre fixo como "Leiria"
    if (field.id === 'cidade_assinatura') {
      return (
        <Input
          type="text"
          value="Leiria"
          readOnly
          disabled
          className="bg-muted text-muted-foreground cursor-not-allowed"
        />
      );
    }

    switch (field.tipo) {
      case 'date':
        return (
          <Input
            type="date"
            value={documentData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={documentData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.label}
            min="1"
          />
        );
      case 'text':
      default:
        return (
          <Input
            type="text"
            value={documentData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.label}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {loading ? 'A carregar...' : `Gerar: ${template?.nome || 'Documento'}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motorista</Label>
              <p className="text-sm text-muted-foreground">{motorista.nome}</p>
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
            disabled={isGenerating || loading}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A gerar...
              </>
            ) : (
              'Download'
            )}
          </Button>
          <Button onClick={() => handleGenerate('print')} disabled={isGenerating || loading}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A gerar...
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
