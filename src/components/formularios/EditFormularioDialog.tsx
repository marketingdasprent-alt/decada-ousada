
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignTagsManager } from '@/components/crm/CampaignTagsManager';
import { DynamicFieldEditor, FormField } from './DynamicFieldEditor';
import { useCampaignTags } from '@/hooks/useCampaignTags';
import { Save, X } from 'lucide-react';

interface Formulario {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  campos: FormField[];
  configuracoes: any;
  created_at: string;
  updated_at: string;
  campanhas?: string[];
}

interface EditFormularioDialogProps {
  formulario: Formulario | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, formData: any) => void;
}

export const EditFormularioDialog: React.FC<EditFormularioDialogProps> = ({
  formulario,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
    campanhas: [] as string[],
    campos: [] as FormField[]
  });
  const [activeTab, setActiveTab] = useState('geral');
  const { availableTags } = useCampaignTags();

  useEffect(() => {
    if (formulario) {
      setFormData({
        nome: formulario.nome,
        descricao: formulario.descricao || '',
        ativo: formulario.ativo,
        campanhas: formulario.campanhas || [],
        campos: formulario.campos || []
      });
    }
  }, [formulario]);

  const handleSave = () => {
    if (!formulario || !formData.nome.trim()) {
      return;
    }

    onSave(formulario.id, formData);
    onClose();
  };

  if (!formulario) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 to-black border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30">
              <Save className="h-5 w-5 text-yellow-500" />
            </div>
            Editar Formulário
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="geral" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              Informações Gerais
            </TabsTrigger>
            <TabsTrigger value="campos" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              Campos do Formulário
            </TabsTrigger>
            <TabsTrigger value="campanhas" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              Campanhas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="geral" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-gray-300">Nome do Formulário *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Ex: Formulário Facebook Ads"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-gray-300">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
                  placeholder="Descreva o propósito deste formulário..."
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div>
                  <Label className="text-gray-300 font-medium">Status do Formulário</Label>
                  <p className="text-sm text-gray-400 mt-1">
                    {formData.ativo ? 'Formulário ativo e capturando leads' : 'Formulário inativo'}
                  </p>
                </div>
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="campos" className="pt-4">
            <DynamicFieldEditor
              fields={formData.campos}
              onFieldsChange={(campos) => setFormData(prev => ({ ...prev, campos }))}
            />
          </TabsContent>
          
          <TabsContent value="campanhas" className="pt-4">
            <div className="space-y-3">
              <CampaignTagsManager
                tags={formData.campanhas}
                onTagsChange={(tags) => setFormData(prev => ({ ...prev, campanhas: tags }))}
                availableTags={availableTags}
                placeholder="Adicionar campanha ao formulário..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSave}
            disabled={!formData.nome.trim()}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
          <Button 
            onClick={onClose}
            variant="outline" 
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
