import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Motorista } from "@/pages/Motoristas";
import { PhoneInput } from "@/components/ui/phone-input";
import { DocumentUploader } from "@/components/motorista/DocumentUploader";

// Validar que o ano da data está entre 1900 e 2100
const validateDateYear = (dateString: string | undefined | null): boolean => {
  if (!dateString) return true; // Campo opcional
  const match = dateString.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (!match) return true; // Formato inválido será tratado pelo input type=date
  const year = parseInt(match[1], 10);
  return year >= 1900 && year <= 2100;
};

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  nif: z.string().min(9, "NIF é obrigatório (mínimo 9 caracteres)"),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  documento_tipo: z.string().min(1, "Tipo de documento é obrigatório"),
  documento_numero: z.string().min(1, "Número do documento é obrigatório"),
  documento_validade: z.string().optional().refine(validateDateYear, {
    message: "Ano inválido (use entre 1900 e 2100)"
  }),
  carta_conducao: z.string().min(1, "Número da carta de condução é obrigatório"),
  carta_categorias: z.array(z.string()).optional(),
  carta_validade: z.string().optional().refine(validateDateYear, {
    message: "Ano inválido (use entre 1900 e 2100)"
  }),
  licenca_tvde_numero: z.string().optional(),
  licenca_tvde_validade: z.string().optional().refine(validateDateYear, {
    message: "Ano inválido (use entre 1900 e 2100)"
  }),
  morada: z.string().optional(),
  codigo_postal: z.string().optional(),
  data_contratacao: z.string().min(1, "Data de contratação é obrigatória").refine(validateDateYear, {
    message: "Ano inválido (use entre 1900 e 2100)"
  }),
  cidade: z.string().optional(),
  cidade_assinatura: z.string().optional(),
  status_ativo: z.boolean().optional(),
  observacoes: z.string().optional(),
  documento_ficheiro_url: z.string().optional(),
  documento_identificacao_verso_url: z.string().optional(),
  carta_ficheiro_url: z.string().optional(),
  carta_conducao_verso_url: z.string().optional(),
  licenca_tvde_ficheiro_url: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORIAS_CARTA = ["A", "A1", "A2", "B", "B1", "C", "C1", "D", "D1", "E"];

interface MotoristaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: Motorista | null;
  onMotoristaCreated?: (motorista: Motorista) => void;
}

export function MotoristaDialog({ open, onOpenChange, motorista, onMotoristaCreated }: MotoristaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      nif: "",
      telefone: "",
      email: "",
      documento_tipo: "",
      documento_numero: "",
      documento_validade: "",
      carta_conducao: "",
      carta_categorias: [],
      carta_validade: "",
      licenca_tvde_numero: "",
      licenca_tvde_validade: "",
      morada: "",
      codigo_postal: "",
      data_contratacao: "",
      cidade: "",
      cidade_assinatura: "",
      status_ativo: true,
      observacoes: "",
      documento_ficheiro_url: "",
      documento_identificacao_verso_url: "",
      carta_ficheiro_url: "",
      carta_conducao_verso_url: "",
      licenca_tvde_ficheiro_url: "",
    },
  });

  useEffect(() => {
    if (motorista) {
      form.reset({
        nome: motorista.nome,
        nif: motorista.nif || "",
        telefone: motorista.telefone || "",
        email: motorista.email || "",
        documento_tipo: motorista.documento_tipo || "",
        documento_numero: motorista.documento_numero || "",
        documento_validade: motorista.documento_validade || "",
        carta_conducao: motorista.carta_conducao || "",
        carta_categorias: motorista.carta_categorias || [],
        carta_validade: motorista.carta_validade || "",
        licenca_tvde_numero: motorista.licenca_tvde_numero || "",
        licenca_tvde_validade: motorista.licenca_tvde_validade || "",
        morada: motorista.morada || "",
        codigo_postal: motorista.codigo_postal || "",
        data_contratacao: motorista.data_contratacao || "",
        cidade: motorista.cidade || "",
        cidade_assinatura: motorista.cidade_assinatura || "",
        status_ativo: motorista.status_ativo ?? true,
        observacoes: motorista.observacoes || "",
        documento_ficheiro_url: motorista.documento_ficheiro_url || "",
        documento_identificacao_verso_url: motorista.documento_identificacao_verso_url || "",
        carta_ficheiro_url: motorista.carta_ficheiro_url || "",
        carta_conducao_verso_url: motorista.carta_conducao_verso_url || "",
        licenca_tvde_ficheiro_url: motorista.licenca_tvde_ficheiro_url || "",
      });
    } else {
      form.reset({
        nome: "",
        nif: "",
        telefone: "",
        email: "",
        documento_tipo: "",
        documento_numero: "",
        documento_validade: "",
        carta_conducao: "",
        carta_categorias: [],
        carta_validade: "",
        licenca_tvde_numero: "",
        licenca_tvde_validade: "",
        morada: "",
        codigo_postal: "",
        data_contratacao: "",
        cidade: "",
        cidade_assinatura: "",
        status_ativo: true,
        observacoes: "",
        documento_ficheiro_url: "",
        documento_identificacao_verso_url: "",
        carta_ficheiro_url: "",
        carta_conducao_verso_url: "",
        licenca_tvde_ficheiro_url: "",
      });
    }
  }, [motorista, form]);

  const onSubmit = async (values: FormValues) => {
    // Prevenir duplo clique
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      setLoading(true);

      // Verificar duplicado por NIF antes de criar (apenas para novos motoristas)
      if (!motorista && values.nif) {
        const { data: existing } = await supabase
          .from("motoristas_ativos")
          .select("id, nome, codigo")
          .eq("nif", values.nif)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Motorista já existe",
            description: `Já existe um motorista com este NIF: ${existing.nome} (Cód. ${existing.codigo})`,
            variant: "destructive",
          });
          return;
        }
      }

      const dataToSave = {
        nome: values.nome,
        nif: values.nif || null,
        telefone: values.telefone || null,
        email: values.email || null,
        documento_tipo: values.documento_tipo || null,
        documento_numero: values.documento_numero || null,
        documento_validade: values.documento_validade || null,
        carta_conducao: values.carta_conducao || null,
        carta_categorias: values.carta_categorias || null,
        carta_validade: values.carta_validade || null,
        licenca_tvde_numero: values.licenca_tvde_numero || null,
        licenca_tvde_validade: values.licenca_tvde_validade || null,
        morada: values.morada || null,
        codigo_postal: values.codigo_postal || null,
        data_contratacao: values.data_contratacao || null,
        cidade: values.cidade || null,
        cidade_assinatura: values.cidade_assinatura || null,
        status_ativo: values.status_ativo ?? true,
        observacoes: values.observacoes || null,
        documento_ficheiro_url: values.documento_ficheiro_url || null,
        documento_identificacao_verso_url: values.documento_identificacao_verso_url || null,
        carta_ficheiro_url: values.carta_ficheiro_url || null,
        carta_conducao_verso_url: values.carta_conducao_verso_url || null,
        licenca_tvde_ficheiro_url: values.licenca_tvde_ficheiro_url || null,
      };

      if (motorista) {
        // Update
        const { error } = await supabase
          .from("motoristas_ativos")
          .update(dataToSave)
          .eq("id", motorista.id);

        if (error) throw error;

        toast({
          title: "Motorista atualizado",
          description: "Os dados do motorista foram atualizados com sucesso.",
        });
        
        onOpenChange(false);
      } else {
        // Insert - retornar os dados do novo motorista
        const { data: newMotorista, error } = await supabase
          .from("motoristas_ativos")
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Motorista criado",
          description: "O motorista foi criado com sucesso.",
        });

        // Fechar diálogo primeiro
        onOpenChange(false);

        // Depois notificar que um novo motorista foi criado
        if (newMotorista) {
          onMotoristaCreated?.(newMotorista as Motorista);
        }
      }
    } catch (error: any) {
      console.error("Erro ao salvar motorista:", error);
      toast({
        title: "Erro ao salvar motorista",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {motorista ? "Editar Motorista" : "Adicionar Motorista"}
          </DialogTitle>
          <DialogDescription>
            {motorista
              ? "Atualize as informações do motorista"
              : "Preencha os dados do novo motorista"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF *</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        defaultCountry="PT"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Documento de Identificação</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="documento_tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cartão Cidadão">Cartão Cidadão</SelectItem>
                          <SelectItem value="Passaporte">Passaporte</SelectItem>
                          <SelectItem value="Autorização de Residência">Autorização de Residência (AR)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documento_numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número *</FormLabel>
                      <FormControl>
                        <Input placeholder="Número" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documento_validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="documento_ficheiro_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Frente do Documento</FormLabel>
                      <FormControl>
                        <DocumentUploader
                          folder="documentos"
                          currentUrl={field.value}
                          onUpload={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="documento_identificacao_verso_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Verso do Documento</FormLabel>
                      <FormControl>
                        <DocumentUploader
                          folder="documentos"
                          currentUrl={field.value}
                          onUpload={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Carta de Condução</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="carta_conducao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número *</FormLabel>
                      <FormControl>
                        <Input placeholder="Número da carta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carta_validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="carta_ficheiro_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Frente da Carta</FormLabel>
                      <FormControl>
                        <DocumentUploader
                          folder="cartas"
                          currentUrl={field.value}
                          onUpload={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="carta_conducao_verso_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Verso da Carta</FormLabel>
                      <FormControl>
                        <DocumentUploader
                          folder="cartas"
                          currentUrl={field.value}
                          onUpload={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="carta_categorias"
                render={() => (
                  <FormItem>
                    <FormLabel>Categorias</FormLabel>
                    <div className="grid grid-cols-5 gap-2">
                      {CATEGORIAS_CARTA.map((categoria) => (
                        <FormField
                          key={categoria}
                          control={form.control}
                          name="carta_categorias"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={categoria}
                                className="flex flex-row items-center space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(categoria)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      return checked
                                        ? field.onChange([...current, categoria])
                                        : field.onChange(
                                            current.filter((value) => value !== categoria)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {categoria}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Licença TVDE */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Licença TVDE</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="licenca_tvde_numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Licença</FormLabel>
                      <FormControl>
                        <Input placeholder="Número da licença TVDE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="licenca_tvde_validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2">
                <FormField
                  control={form.control}
                  name="licenca_tvde_ficheiro_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Ficheiro da Licença TVDE</FormLabel>
                      <FormControl>
                        <DocumentUploader
                          folder="tvde"
                          currentUrl={field.value}
                          onUpload={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="morada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Morada</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, andar..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="codigo_postal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input placeholder="0000-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_contratacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Contratação *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade (Residência)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Lisboa" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade_assinatura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade de Assinatura do Contrato</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Leiria" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status_ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {field.value ? "Motorista ativo" : "Motorista inativo"}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionais sobre o motorista..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "A guardar..." : motorista ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
