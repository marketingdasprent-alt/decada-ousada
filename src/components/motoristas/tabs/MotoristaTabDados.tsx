import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/ui/section-card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Motorista } from "@/pages/Motoristas";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  MapPin,
  CreditCard,
  Car,
  FileText,
  Briefcase,
  MessageSquare,
  Fuel,
  Settings,
  Plus,
  PlusCircle,
  X,
  Smartphone,
  Zap,
} from "lucide-react";

const CARTA_CATEGORIAS = ["AM", "A1", "A2", "A", "B1", "B", "BE", "C1", "C", "CE", "D1", "D", "DE"];

const validateDateYear = (date: string | undefined): boolean => {
  if (!date) return true;
  const year = new Date(date).getFullYear();
  return year >= 1900 && year <= 2100;
};

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  nif: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  morada: z.string().optional(),
  codigo_postal: z.string().optional(),
  cidade: z.string().optional(),
  cidade_assinatura: z.string().optional(),
  documento_tipo: z.string().optional(),
  documento_numero: z.string().optional(),
  documento_validade: z.string().optional().refine(validateDateYear, {
    message: "Ano deve estar entre 1900 e 2100",
  }),
  carta_conducao: z.string().optional(),
  carta_categorias: z.array(z.string()).optional(),
  carta_validade: z.string().optional().refine(validateDateYear, {
    message: "Ano deve estar entre 1900 e 2100",
  }),
  licenca_tvde_numero: z.string().optional(),
  licenca_tvde_validade: z.string().optional().refine(validateDateYear, {
    message: "Ano deve estar entre 1900 e 2100",
  }),
  cartao_frota: z.string().optional(),
  cartao_bp: z.string().optional(),
  cartao_repsol: z.string().optional(),
  cartao_edp: z.string().optional(),
  data_contratacao: z.string().optional().refine(validateDateYear, {
    message: "Ano deve estar entre 1900 e 2100",
  }),
  recibo_verde: z.boolean().default(true),
  is_slot: z.boolean().default(false),
  slot_valor_semanal: z.number().optional().nullable(),
  status_ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
  iban: z.string().optional(),
  uber_uuid: z.string().optional().nullable(),
  bolt_id: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface MotoristaTabDadosProps {
  motorista: Motorista;
  onSave: () => void;
}

// SectionCard imported from @/components/ui/section-card

export function MotoristaTabDados({ motorista, onSave }: MotoristaTabDadosProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      nif: "",
      email: "",
      telefone: "",
      morada: "",
      codigo_postal: "",
      cidade: "",
      cidade_assinatura: "",
      documento_tipo: "",
      documento_numero: "",
      documento_validade: "",
      carta_conducao: "",
      carta_categorias: [],
      carta_validade: "",
      licenca_tvde_numero: "",
      licenca_tvde_validade: "",
      cartao_frota: "",
      cartao_bp: "",
      cartao_repsol: "",
      cartao_edp: "",
      data_contratacao: "",
      recibo_verde: true,
      is_slot: false,
      slot_valor_semanal: null,
      status_ativo: true,
      observacoes: "",
      iban: "",
      uber_uuid: "",
      bolt_id: "",
    },
  });

  useEffect(() => {
    if (motorista) {
      form.reset({
        nome: motorista.nome || "",
        nif: motorista.nif || "",
        email: motorista.email || "",
        telefone: motorista.telefone || "",
        morada: motorista.morada || "",
        codigo_postal: motorista.codigo_postal || "",
        cidade: motorista.cidade || "",
        cidade_assinatura: motorista.cidade_assinatura || "",
        documento_tipo: motorista.documento_tipo || "",
        documento_numero: motorista.documento_numero || "",
        documento_validade: motorista.documento_validade
          ? format(new Date(motorista.documento_validade), "yyyy-MM-dd")
          : "",
        carta_conducao: motorista.carta_conducao || "",
        carta_categorias: motorista.carta_categorias || [],
        carta_validade: motorista.carta_validade
          ? format(new Date(motorista.carta_validade), "yyyy-MM-dd")
          : "",
        licenca_tvde_numero: motorista.licenca_tvde_numero || "",
        licenca_tvde_validade: motorista.licenca_tvde_validade
          ? format(new Date(motorista.licenca_tvde_validade), "yyyy-MM-dd")
          : "",
        cartao_frota: motorista.cartao_frota || "",
        cartao_bp: motorista.cartao_bp || "",
        cartao_repsol: motorista.cartao_repsol || "",
        cartao_edp: motorista.cartao_edp || "",
        data_contratacao: motorista.data_contratacao
          ? format(new Date(motorista.data_contratacao), "yyyy-MM-dd")
          : "",
        recibo_verde: motorista.recibo_verde ?? true,
        is_slot: motorista.is_slot ?? false,
        slot_valor_semanal: motorista.slot_valor_semanal ?? null,
        status_ativo: motorista.status_ativo ?? true,
        observacoes: motorista.observacoes || "",
        iban: motorista.iban || "",
        uber_uuid: motorista.uber_uuid || "",
        bolt_id: motorista.bolt_id || "",
      });
    }
  }, [motorista, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const updateData = {
        nome: data.nome,
        nif: data.nif || null,
        email: data.email || null,
        telefone: data.telefone || null,
        morada: data.morada || null,
        codigo_postal: data.codigo_postal || null,
        cidade: data.cidade || null,
        cidade_assinatura: data.cidade_assinatura || null,
        documento_tipo: data.documento_tipo || null,
        documento_numero: data.documento_numero || null,
        documento_validade: data.documento_validade || null,
        carta_conducao: data.carta_conducao || null,
        carta_categorias: data.carta_categorias || null,
        carta_validade: data.carta_validade || null,
        licenca_tvde_numero: data.licenca_tvde_numero || null,
        licenca_tvde_validade: data.licenca_tvde_validade || null,
        cartao_frota: data.cartao_frota || null,
        cartao_bp: data.cartao_bp || null,
        cartao_repsol: data.cartao_repsol || null,
        cartao_edp: data.cartao_edp || null,
        data_contratacao: data.data_contratacao || null,
        recibo_verde: data.recibo_verde,
        is_slot: data.is_slot,
        slot_valor_semanal: data.is_slot ? data.slot_valor_semanal : null,
        status_ativo: data.status_ativo,
        observacoes: data.observacoes || null,
        iban: data.iban || null,
        uber_uuid: data.uber_uuid || null,
        bolt_id: data.bolt_id || null,
      };

      const { error } = await supabase
        .from("motoristas_ativos")
        .update(updateData)
        .eq("id", motorista.id);

      if (error) throw error;

      toast.success("Motorista atualizado com sucesso!");
      onSave();
    } catch (error) {
      console.error("Erro ao atualizar motorista:", error);
      toast.error("Erro ao atualizar motorista");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Dados Pessoais */}
          <SectionCard
            icon={<User className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            title="Dados Pessoais"
            headerClassName="bg-blue-50 dark:bg-blue-950/30 border-b"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iban"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input placeholder="PT50..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
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
          </SectionCard>

          {/* Morada */}
          <SectionCard
            icon={<MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            title="Morada"
            headerClassName="bg-emerald-50 dark:bg-emerald-950/30 border-b"
          >
            <div className="grid grid-cols-1 gap-3">
              <FormField
                control={form.control}
                name="morada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade (Residência)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          {/* Documento de Identificação */}
          <SectionCard
            icon={<CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
            title="Documento de Identificação"
            headerClassName="bg-violet-50 dark:bg-violet-950/30 border-b"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="documento_tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cartão de Cidadão">Cartão de Cidadão</SelectItem>
                        <SelectItem value="Bilhete de Identidade">Bilhete de Identidade</SelectItem>
                        <SelectItem value="Passaporte">Passaporte</SelectItem>
                        <SelectItem value="Título de Residência">Título de Residência</SelectItem>
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
                    <FormLabel>Número do Documento</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documento_validade"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Validade</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          {/* Carta de Condução */}
          <SectionCard
            icon={<Car className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
            title="Carta de Condução"
            headerClassName="bg-sky-50 dark:bg-sky-950/30 border-b"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="carta_conducao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Carta</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              <FormField
                control={form.control}
                name="carta_categorias"
                render={() => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Categorias</FormLabel>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
                      {CARTA_CATEGORIAS.map((cat) => (
                        <FormField
                          key={cat}
                          control={form.control}
                          name="carta_categorias"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-1 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(cat)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, cat]);
                                    } else {
                                      field.onChange(current.filter((c) => c !== cat));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-normal cursor-pointer">
                                {cat}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          {/* Licença TVDE */}
          <SectionCard
            icon={<FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            title="Licença TVDE"
            headerClassName="bg-amber-50 dark:bg-amber-950/30 border-b"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="licenca_tvde_numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Licença</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
          </SectionCard>

          {/* Combustível */}
          <SectionCard
            icon={<Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
            title="Combustível"
            headerClassName="bg-orange-50 dark:bg-orange-950/30 border-b"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-xs text-muted-foreground w-full mb-1">Adicionar novo cartão:</p>
                {!form.watch('cartao_bp') && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs border-green-600/30 text-green-700 hover:bg-green-600 hover:text-white"
                    onClick={() => form.setValue('cartao_bp', ' ')}
                  >
                    + BP
                  </Button>
                )}
                {!form.watch('cartao_repsol') && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs border-orange-600/30 text-orange-700 hover:bg-orange-600 hover:text-white"
                    onClick={() => form.setValue('cartao_repsol', ' ')}
                  >
                    + REPSOL
                  </Button>
                )}
                {!form.watch('cartao_edp') && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs border-red-600/30 text-red-700 hover:bg-red-600 hover:text-white"
                    onClick={() => form.setValue('cartao_edp', ' ')}
                  >
                    + EDP
                  </Button>
                )}
              </div>

              {(form.watch('cartao_bp') !== null && form.watch('cartao_bp') !== "") && (
                <FormField
                  control={form.control}
                  name="cartao_bp"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Cartão BP
                        </FormLabel>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-red-600" 
                          onClick={() => form.setValue('cartao_bp', '')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Número do cartão BP" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* REPSOL */}
              {(form.watch('cartao_repsol') !== null && form.watch('cartao_repsol') !== "") && (
                <FormField
                  control={form.control}
                  name="cartao_repsol"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          Cartão REPSOL
                        </FormLabel>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-red-600" 
                          onClick={() => form.setValue('cartao_repsol', '')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Número do cartão REPSOL" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* EDP */}
              {(form.watch('cartao_edp') !== null && form.watch('cartao_edp') !== "") && (
                <FormField
                  control={form.control}
                  name="cartao_edp"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-600" />
                          Cartão EDP
                        </FormLabel>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-red-600" 
                          onClick={() => form.setValue('cartao_edp', '')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Número do cartão EDP" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </SectionCard>

          {/* Estado & Configuração */}
          <SectionCard
            icon={<Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
            title="Estado & Configuração"
            headerClassName="bg-slate-50 dark:bg-slate-950/30 border-b"
          >
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="recibo_verde"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm flex items-center gap-2">
                      <span className={cn(
                        "text-lg",
                        field.value ? "text-green-600" : "text-red-600"
                      )}>●</span>
                      Motorista Verde
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_slot"
                render={({ field }) => (
                  <FormItem className="rounded-lg border p-3 space-y-2">
                    <div className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Motorista SLOT</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                    {field.value && (
                      <FormField
                        control={form.control}
                        name="slot_valor_semanal"
                        render={({ field: valorField }) => (
                          <FormItem>
                            <FormLabel>Valor Semanal (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Ex: 150.00"
                                value={valorField.value ?? ""}
                                onChange={(e) => valorField.onChange(
                                  e.target.value ? parseFloat(e.target.value) : null
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status_ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Motorista Ativo</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Define se o motorista está ativo no sistema
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 py-4">
          {/* IDs de Plataformas */}
          <SectionCard
            icon={<Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
            title="IDs de Integração (Uber / Bolt)"
            headerClassName="bg-purple-50 dark:bg-purple-950/30 border-b"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="uber_uuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uber UUID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. e912..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bolt_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                       <Zap className="h-3 w-3 text-yellow-500" /> Bolt ID
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 12345/6789" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-[10px] text-muted-foreground sm:col-span-2 mt-1">
                Estes IDs são usados para unificar automaticamente os ganhos das plataformas no Dashboard financeiro.
              </p>
            </div>
          </SectionCard>

          {/* Observações */}
          <SectionCard
            icon={<MessageSquare className="h-4 w-4 text-pink-600 dark:text-pink-400" />}
            title="Observações Internas"
            headerClassName="bg-pink-50 dark:bg-pink-950/30 border-b"
          >
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Notas adicionais sobre o motorista..."
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SectionCard>
        </div>

        {/* Botão de salvar */}
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : "Guardar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
