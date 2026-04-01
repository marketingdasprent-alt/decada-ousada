import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Loader2, Upload, FileText, Eye, Trash2, Radio, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const obeSchema = z.object({
  obe_numero: z.string().optional(),
  obe_estado: z.string().optional(),
});

type OBEFormData = z.infer<typeof obeSchema>;

interface Viatura {
  id: string;
  obe_numero?: string | null;
  obe_estado?: string | null;
}

interface ViaturaDocument {
  id: string;
  tipo_documento: string;
  nome_ficheiro: string | null;
  ficheiro_url: string;
}

interface ViaturaTabOBEProps {
  viatura: Viatura | null;
  onUpdate: () => void;
}

const OBE_ESTADOS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'avariado', label: 'Avariado' },
  { value: 'sem_obe', label: 'Sem OBE' },
];

export function ViaturaTabOBE({ viatura, onUpdate }: ViaturaTabOBEProps) {
  const [saving, setSaving] = useState(false);
  const [contratoOBE, setContratoOBE] = useState<ViaturaDocument | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const form = useForm<OBEFormData>({
    resolver: zodResolver(obeSchema),
    defaultValues: {
      obe_numero: '',
      obe_estado: 'ativo',
    },
  });

  useEffect(() => {
    if (viatura) {
      form.reset({
        obe_numero: viatura.obe_numero || '',
        obe_estado: viatura.obe_estado || 'ativo',
      });
      loadContratoOBE();
    }
  }, [viatura, form]);

  const loadContratoOBE = async () => {
    if (!viatura?.id) return;

    try {
      const { data, error } = await supabase
        .from('viatura_documentos')
        .select('*')
        .eq('viatura_id', viatura.id)
        .eq('tipo_documento', 'contrato_obe')
        .maybeSingle();

      if (error) throw error;
      setContratoOBE(data);
    } catch (error) {
      console.error('Erro ao carregar contrato OBE:', error);
    }
  };

  const onSubmit = async (data: OBEFormData) => {
    if (!viatura?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('viaturas')
        .update({
          obe_numero: data.obe_numero || null,
          obe_estado: data.obe_estado || 'ativo',
        })
        .eq('id', viatura.id);

      if (error) throw error;
      toast.success('Dados OBE atualizados com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar OBE:', error);
      toast.error('Erro ao atualizar dados OBE');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadContrato = async (file: File) => {
    if (!viatura?.id) return;

    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${viatura.id}/contrato_obe_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('viatura-documentos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      if (contratoOBE) {
        const { error } = await supabase
          .from('viatura_documentos')
          .update({
            ficheiro_url: fileName,
            nome_ficheiro: file.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contratoOBE.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('viatura_documentos')
          .insert({
            viatura_id: viatura.id,
            tipo_documento: 'contrato_obe',
            ficheiro_url: fileName,
            nome_ficheiro: file.name,
          });

        if (error) throw error;
      }

      toast.success('Contrato OBE anexado com sucesso!');
      loadContratoOBE();
    } catch (error) {
      console.error('Erro ao anexar Contrato OBE:', error);
      toast.error('Erro ao anexar Contrato OBE');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleViewContrato = async () => {
    if (!contratoOBE) return;

    try {
      const { data, error } = await supabase.storage
        .from('viatura-documentos')
        .createSignedUrl(contratoOBE.ficheiro_url, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar Contrato OBE:', error);
      toast.error('Erro ao visualizar documento');
    }
  };

  const handleDeleteContrato = async () => {
    if (!contratoOBE) return;

    try {
      await supabase.storage
        .from('viatura-documentos')
        .remove([contratoOBE.ficheiro_url]);

      const { error } = await supabase
        .from('viatura_documentos')
        .delete()
        .eq('id', contratoOBE.id);

      if (error) throw error;
      toast.success('Contrato OBE removido com sucesso!');
      setContratoOBE(null);
    } catch (error) {
      console.error('Erro ao remover Contrato OBE:', error);
      toast.error('Erro ao remover documento');
    }
  };

  const getEstadoColor = (estado: string | null | undefined) => {
    switch (estado) {
      case 'ativo': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'inativo': return 'bg-muted text-muted-foreground border-border';
      case 'avariado': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'sem_obe': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!viatura) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Guarde a viatura primeiro para configurar o OBE.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário OBE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Dispositivo OBE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="obe_numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do OBE</FormLabel>
                    <FormControl>
                      <Input placeholder="Número identificador do OBE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="obe_estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OBE_ESTADOS.map((est) => (
                          <SelectItem key={est.value} value={est.value}>{est.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>
            </form>
          </Form>

          {/* Estado atual */}
          {viatura.obe_numero && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OBE Atual</p>
                  <p className="font-mono font-medium">{viatura.obe_numero}</p>
                </div>
                <Badge variant="outline" className={getEstadoColor(viatura.obe_estado)}>
                  {OBE_ESTADOS.find(e => e.value === viatura.obe_estado)?.label || 'N/D'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contrato OBE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrato OBE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
            {contratoOBE ? (
              <>
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-medium">Documento anexado</p>
                  <p className="text-sm text-muted-foreground">{contratoOBE.nome_ficheiro}</p>
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleViewContrato}>
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={handleDeleteContrato}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Nenhum documento anexado</p>
                  <p className="text-sm text-muted-foreground">
                    Anexe o contrato do dispositivo OBE
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadContrato(file);
                    }}
                    disabled={uploadingDoc}
                  />
                  <Button variant="outline" asChild disabled={uploadingDoc}>
                    <span>
                      {uploadingDoc ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Anexar Contrato OBE
                    </span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
