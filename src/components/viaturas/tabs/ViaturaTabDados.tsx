import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Save, Loader2, Upload, FileText, Eye, Download, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCategoriaBadgeClass, getStatusBadgeClass, getStatusLabel, getStatusColorClass } from '@/lib/viaturas';

const viaturaSchema = z.object({
  matricula: z.string()
    .min(1, 'Matrícula é obrigatória')
    .regex(/^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/, 'Formato inválido. Use XX-00-XX'),
  marca: z.string().min(1, 'Marca é obrigatória'),
  modelo: z.string().min(1, 'Modelo é obrigatório'),
  ano: z.string().optional(),
  cor: z.string().optional(),
  categoria: z.string().optional(),
  combustivel: z.string().optional(),
  status: z.string().optional(),
  km_atual: z.string().optional(),
  numero_motor: z.string().optional(),
  numero_chassis: z.string().optional(),
  data_matricula: z.string().optional(),
  observacoes: z.string().optional(),
  valor_aluguer: z.string().optional(),
  is_slot: z.boolean().default(false),
  estacao_id: z.string().optional(),
});

type ViaturaFormData = z.infer<typeof viaturaSchema>;

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano?: number | null;
  cor?: string | null;
  categoria?: string | null;
  combustivel?: string | null;
  status?: string | null;
  km_atual?: number | null;
  numero_motor?: string | null;
  numero_chassis?: string | null;
  data_matricula?: string | null;
  observacoes?: string | null;
  valor_aluguer?: number | null;
  is_slot?: boolean | null;
  estacao_id?: string | null;
}

interface ViaturaDocument {
  id: string;
  tipo_documento: string;
  nome_ficheiro: string | null;
  ficheiro_url: string;
  data_validade: string | null;
}

interface ViaturaTabDadosProps {
  viatura: Viatura | null;
  isNew: boolean;
  onSave: (data: Partial<Viatura>) => Promise<void>;
  saving: boolean;
}

const CATEGORIAS = [
  { value: 'green', label: 'Green' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'black', label: 'Black' },
  { value: 'x-saver', label: 'X-Saver' },
];

const COMBUSTIVEIS = [
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diesel' },
];

const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'em_uso', label: 'Em Uso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inativo', label: 'Inativo' },
];

const DOCUMENTOS_VIATURA = [
  { tipo: 'dua', label: 'DUA - Documento Único Automóvel', obrigatorio: true },
  { tipo: 'dav', label: 'DAV - Declaração Aduaneira de Veículo', obrigatorio: false },
  { tipo: 'ac', label: 'AC - Certificado de Aprovação', obrigatorio: false },
  { tipo: 'ipo', label: 'IPO - Inspeção Periódica Obrigatória', obrigatorio: true },
];

interface Estacao {
  id: string;
  nome: string;
  cidade: string | null;
}

export function ViaturaTabDados({ viatura, isNew, onSave, saving }: ViaturaTabDadosProps) {
  const [documents, setDocuments] = useState<ViaturaDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [estacoes, setEstacoes] = useState<Estacao[]>([]);

  useEffect(() => {
    supabase.from('estacoes').select('id, nome, cidade').eq('ativa', true).order('nome')
      .then(({ data }) => setEstacoes(data || []));
  }, []);

  const form = useForm<ViaturaFormData>({
    resolver: zodResolver(viaturaSchema),
    defaultValues: {
      matricula: '',
      marca: '',
      modelo: '',
      ano: '',
      cor: '',
      categoria: '',
      combustivel: '',
      status: 'disponivel',
      km_atual: '',
      numero_motor: '',
      numero_chassis: '',
      data_matricula: '',
      observacoes: '',
      valor_aluguer: '',
      is_slot: false,
      estacao_id: '',
    },
  });

  useEffect(() => {
    if (viatura) {
      form.reset({
        matricula: viatura.matricula || '',
        marca: viatura.marca || '',
        modelo: viatura.modelo || '',
        ano: viatura.ano?.toString() || '',
        cor: viatura.cor || '',
        categoria: viatura.categoria || '',
        combustivel: viatura.combustivel || '',
        status: viatura.status || 'disponivel',
        km_atual: viatura.km_atual?.toString() || '',
        numero_motor: viatura.numero_motor || '',
        numero_chassis: viatura.numero_chassis || '',
        data_matricula: viatura.data_matricula || '',
        observacoes: viatura.observacoes || '',
        valor_aluguer: viatura.valor_aluguer?.toString() || '',
        is_slot: viatura.is_slot || false,
        estacao_id: viatura.estacao_id || '',
      });
      loadDocuments();
    }
  }, [viatura, form]);

  const loadDocuments = async () => {
    if (!viatura?.id) return;
    
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('viatura_documentos')
        .select('*')
        .eq('viatura_id', viatura.id)
        .in('tipo_documento', DOCUMENTOS_VIATURA.map(d => d.tipo));

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const onSubmit = async (data: ViaturaFormData) => {
    const payload: Partial<Viatura> = {
      matricula: data.matricula.toUpperCase(),
      marca: data.marca,
      modelo: data.modelo,
      ano: data.ano ? parseInt(data.ano) : null,
      cor: data.cor || null,
      categoria: data.categoria || null,
      combustivel: data.combustivel || null,
      status: data.status || 'disponivel',
      km_atual: data.km_atual ? parseInt(data.km_atual) : 0,
      numero_motor: data.numero_motor || null,
      numero_chassis: data.numero_chassis || null,
      data_matricula: data.data_matricula || null,
      observacoes: data.observacoes || null,
      valor_aluguer: data.valor_aluguer ? parseFloat(data.valor_aluguer) : null,
      is_slot: data.is_slot,
      estacao_id: data.estacao_id || null,
    };

    await onSave(payload);
  };

  const handleUploadDocument = async (tipoDoc: string, file: File) => {
    if (!viatura?.id) {
      toast.error('Guarde a viatura primeiro antes de anexar documentos.');
      return;
    }

    setUploadingDoc(tipoDoc);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${viatura.id}/${tipoDoc}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('viatura-documentos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Check if document already exists
      const existingDoc = documents.find(d => d.tipo_documento === tipoDoc);
      
      if (existingDoc) {
        // Update existing
        const { error } = await supabase
          .from('viatura_documentos')
          .update({
            ficheiro_url: fileName,
            nome_ficheiro: file.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDoc.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('viatura_documentos')
          .insert({
            viatura_id: viatura.id,
            tipo_documento: tipoDoc,
            ficheiro_url: fileName,
            nome_ficheiro: file.name,
          });

        if (error) throw error;
      }

      toast.success('Documento anexado com sucesso!');
      loadDocuments();
    } catch (error) {
      console.error('Erro ao anexar documento:', error);
      toast.error('Erro ao anexar documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleViewDocument = async (doc: ViaturaDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('viatura-documentos')
        .createSignedUrl(doc.ficheiro_url, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      toast.error('Erro ao visualizar documento');
    }
  };

  const handleDeleteDocument = async (doc: ViaturaDocument) => {
    try {
      await supabase.storage
        .from('viatura-documentos')
        .remove([doc.ficheiro_url]);

      const { error } = await supabase
        .from('viatura_documentos')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
      toast.success('Documento removido com sucesso!');
      loadDocuments();
    } catch (error) {
      console.error('Erro ao remover documento:', error);
      toast.error('Erro ao remover documento');
    }
  };

  const getDocumentByType = (tipo: string) => {
    return documents.find(d => d.tipo_documento === tipo);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Formulário Principal */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Dados da Viatura</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Identificação */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Identificação</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="matricula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matrícula *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="AA-00-BB"
                            className="uppercase"
                            value={field.value}
                            onChange={(e) => {
                              // Remove everything except alphanumeric, auto-insert dashes
                              const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              let formatted = raw;
                              if (raw.length > 4) formatted = raw.slice(0, 2) + '-' + raw.slice(2, 4) + '-' + raw.slice(4, 6);
                              else if (raw.length > 2) formatted = raw.slice(0, 2) + '-' + raw.slice(2);
                              field.onChange(formatted);
                            }}
                            onBlur={field.onBlur}
                            maxLength={8}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={`font-bold transition-all ${getStatusColorClass(field.value)}`}>
                              <SelectValue placeholder="Selecionar Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="disponivel">🟢 Disponível</SelectItem>
                            <SelectItem value="em_uso">🔵 Em Uso</SelectItem>
                            <SelectItem value="manutencao">🟠 Manutenção</SelectItem>
                            <SelectItem value="inativo">⚪ Inativo</SelectItem>
                            <SelectItem value="vendida">🔴 Vendida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="data_matricula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Matrícula</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Veículo */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Veículo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="marca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca *</FormLabel>
                        <FormControl>
                          <Input placeholder="Tesla" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Model 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ano"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                          <Input placeholder="Branco" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIAS.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="combustivel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Combustível</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMBUSTIVEIS.map((comb) => (
                              <SelectItem key={comb.value} value={comb.value}>{comb.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valor_aluguer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Aluguer (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="Ex: 250.00"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estacao_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estação</FormLabel>
                        <Select
                          value={field.value || ''}
                          onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar estação..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">— Sem estação —</SelectItem>
                            {estacoes.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nome}{e.cidade ? ` (${e.cidade})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Card Viatura SLOT */}
                <div className="md:col-span-3 mt-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">Viatura SLOT</p>
                      <p className="text-sm text-muted-foreground">
                        {form.watch('is_slot') ? '🟢 Activo' : '🔴 Inactivo'}
                      </p>
                    </div>
                    <Switch
                      checked={form.watch('is_slot')}
                      onCheckedChange={(checked) => form.setValue('is_slot', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Técnico */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Dados Técnicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="numero_motor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº Motor</FormLabel>
                        <FormControl>
                          <Input placeholder="Número do motor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numero_chassis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº Chassis (VIN)</FormLabel>
                        <FormControl>
                          <Input placeholder="Número do chassis" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="km_atual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Km Atual</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Observações */}
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionais sobre a viatura..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isNew ? 'Criar Viatura' : 'Guardar Alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Documentos da Viatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNew ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Guarde a viatura primeiro para anexar documentos.
            </p>
          ) : (
            DOCUMENTOS_VIATURA.map((doc) => {
              const existingDoc = getDocumentByType(doc.tipo);
              const isUploading = uploadingDoc === doc.tipo;

              return (
                <div key={doc.tipo} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {existingDoc ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : doc.obrigatorio ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{doc.label}</span>
                    </div>
                    {doc.obrigatorio && !existingDoc && (
                      <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                    )}
                  </div>

                  {existingDoc ? (
                    <div className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5">
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {existingDoc.nome_ficheiro || 'Documento anexado'}
                      </span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewDocument(existingDoc)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDocument(existingDoc)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadDocument(doc.tipo, file);
                        }}
                        disabled={isUploading}
                      />
                      <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-2 hover:bg-muted/50 transition-colors">
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Anexar documento</span>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
