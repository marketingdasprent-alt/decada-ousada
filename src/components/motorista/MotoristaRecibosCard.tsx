import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Plus, Upload, Loader2, FileText, Eye, Trash2, Check } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, isBefore, isEqual } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

interface Recibo {
  id: string;
  codigo: number;
  descricao: string;
  periodo_referencia: string;
  semana_referencia_inicio: string | null;
  valor_total: number;
  ficheiro_url: string;
  status: string;
  created_at: string;
}

interface SemanaOption {
  value: string;
  label: string;
  jaTemRecibo: boolean;
}

interface MotoristaRecibosCardProps {
  motoristaId: string;
  userId: string;
  dataContratacao?: string;
}

export function MotoristaRecibosCard({ motoristaId, userId, dataContratacao }: MotoristaRecibosCardProps) {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reciboToDelete, setReciboToDelete] = useState<Recibo | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Form state
  const [semanaSeleccionada, setSemanaSeleccionada] = useState("");
  const [valor, setValor] = useState("");
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [ficheiroUrl, setFicheiroUrl] = useState("");

  useEffect(() => {
    loadRecibos();
  }, [motoristaId]);

  // Subscripção Realtime para actualizar lista automaticamente
  useEffect(() => {
    if (!motoristaId) return;

    const channel = supabase
      .channel(`recibos-card-${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motorista_recibos',
          filter: `motorista_id=eq.${motoristaId}`
        },
        () => {
          loadRecibos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [motoristaId]);

  // Gerar lista de semanas desde a data de contratação
  const semanasDisponiveis = useMemo((): SemanaOption[] => {
    if (!dataContratacao) return [];
    
    const semanas: SemanaOption[] = [];
    const dataContratacaoDate = new Date(dataContratacao);
    let inicio = startOfWeek(dataContratacaoDate, { weekStartsOn: 1 });
    const hoje = new Date();
    // Incluir até a semana actual (o motorista pode submeter recibo da semana em curso)
    const fimVerificacao = addWeeks(startOfWeek(hoje, { weekStartsOn: 1 }), 1);
    
    // Criar set de semanas que já têm recibo
    const semanasComRecibo = new Set(
      recibos
        .filter(r => r.semana_referencia_inicio)
        .map(r => r.semana_referencia_inicio)
    );
    
    while (isBefore(inicio, fimVerificacao) || isEqual(inicio, startOfWeek(hoje, { weekStartsOn: 1 }))) {
      const fim = addDays(inicio, 6);
      const valorSemana = format(inicio, "yyyy-MM-dd");
      
      semanas.push({
        value: valorSemana,
        label: `${format(inicio, "dd MMM", { locale: pt })} - ${format(fim, "dd MMM yyyy", { locale: pt })}`,
        jaTemRecibo: semanasComRecibo.has(valorSemana)
      });
      
      inicio = addWeeks(inicio, 1);
    }
    
    // Ordenar do mais recente para o mais antigo
    return semanas.reverse();
  }, [dataContratacao, recibos]);

  async function loadRecibos() {
    try {
      const { data, error } = await supabase
        .from("motorista_recibos")
        .select("*")
        .eq("motorista_id", motoristaId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecibos(data || []);
    } catch (error) {
      console.error("Erro ao carregar recibos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ficheiro muito grande. Máximo 10MB.");
      return;
    }

    setUploading(true);
    setFicheiro(file);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${userId}/recibos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("motorista-recibos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setFicheiroUrl(filePath);
      toast.success("Ficheiro carregado com sucesso");
    } catch (error) {
      console.error("Erro ao carregar ficheiro:", error);
      toast.error("Erro ao carregar ficheiro");
      setFicheiro(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validação
    if (!semanaSeleccionada || !valor || !ficheiroUrl) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Verificar se já existe recibo para esta semana
    const semanaJaUsada = recibos.some(
      r => r.semana_referencia_inicio === semanaSeleccionada
    );
    
    if (semanaJaUsada) {
      toast.error("Já existe um recibo para esta semana");
      return;
    }

    setSubmitting(true);

    try {
      // Formatar label da semana para a descrição
      const semanaOption = semanasDisponiveis.find(s => s.value === semanaSeleccionada);
      const periodoLabel = semanaOption?.label || semanaSeleccionada;

      const { error } = await supabase
        .from("motorista_recibos")
        .insert({
          motorista_id: motoristaId,
          user_id: userId,
          descricao: `Recibo Verde - ${periodoLabel}`,
          periodo_referencia: periodoLabel,
          semana_referencia_inicio: semanaSeleccionada,
          valor_total: parseFloat(valor.replace(",", ".")),
          ficheiro_url: ficheiroUrl,
          nome_ficheiro: ficheiro?.name,
          status: "submetido"
        });

      if (error) throw error;

      toast.success("Recibo verde submetido com sucesso");
      setDialogOpen(false);
      resetForm();
      loadRecibos();
    } catch (error: any) {
      console.error("Erro ao submeter recibo:", error);
      // Verificar se é erro de constraint de duplicado
      if (error.code === "23505") {
        toast.error("Já existe um recibo para esta semana");
      } else {
        toast.error("Erro ao submeter recibo");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSemanaSeleccionada("");
    setValor("");
    setFicheiro(null);
    setFicheiroUrl("");
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "validado":
        return <Badge variant="default" className="bg-green-600">Validado</Badge>;
      case "submetido":
        return <Badge variant="secondary">Pendente</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function formatCodigo(codigo: number | null) {
    if (!codigo) return "-";
    return `#${String(codigo).padStart(4, '0')}`;
  }

  function formatSemanaReferencia(recibo: Recibo) {
    if (recibo.semana_referencia_inicio) {
      const inicio = new Date(recibo.semana_referencia_inicio);
      const fim = addDays(inicio, 6);
      return `${format(inicio, "dd/MM", { locale: pt })} - ${format(fim, "dd/MM", { locale: pt })}`;
    }
    return recibo.periodo_referencia || "-";
  }

  async function handleViewRecibo(url: string) {
    try {
      const { data, error } = await supabase.storage
        .from("motorista-recibos")
        .createSignedUrl(url, 3600);

      if (error) throw error;
      
      // Abordagem compatível com PWA/iOS
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Criar link temporário e clicar
      const link = document.createElement('a');
      link.href = objectUrl;
      link.target = '_blank';
      
      // Se for PDF ou imagem, abre no browser; senão força download
      const extension = url.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension || '')) {
        link.download = url.split('/').pop() || 'recibo';
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar objectURL após um delay
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Erro ao abrir recibo:", error);
      toast.error("Erro ao abrir recibo");
    }
  }

  async function handleDeleteRecibo() {
    if (!reciboToDelete) return;
    
    setDeleting(true);
    try {
      // 1. Apagar ficheiro do storage
      await supabase.storage
        .from("motorista-recibos")
        .remove([reciboToDelete.ficheiro_url]);
      
      // 2. Apagar registo da base de dados
      const { error } = await supabase
        .from("motorista_recibos")
        .delete()
        .eq("id", reciboToDelete.id);
      
      if (error) throw error;
      
      toast.success("Recibo apagado com sucesso");
      setDeleteDialogOpen(false);
      setReciboToDelete(null);
      loadRecibos();
    } catch (error) {
      console.error("Erro ao apagar recibo:", error);
      toast.error("Erro ao apagar recibo");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Recibos Verdes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Recibos Verdes
          </CardTitle>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Submeter Recibo Verde
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submeter Recibo Verde</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="semana">Semana de Referência</Label>
                  <Select value={semanaSeleccionada} onValueChange={setSemanaSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione a semana..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {semanasDisponiveis.map((semana) => (
                        <SelectItem 
                          key={semana.value} 
                          value={semana.value}
                          disabled={semana.jaTemRecibo}
                          className="flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            {semana.jaTemRecibo && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                            {semana.label}
                            {semana.jaTemRecibo && (
                              <span className="text-xs text-muted-foreground">(já submetido)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Seleccione a semana a que o recibo se refere
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor">Valor Total (€)</Label>
                  <Input
                    id="valor"
                    type="text"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ficheiro do Recibo Verde</Label>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    {ficheiro ? (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4" />
                        <span className="truncate">{ficheiro.name}</span>
                        {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Clique para carregar PDF ou imagem
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitting || uploading || !ficheiroUrl}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A submeter...
                    </>
                  ) : (
                    "Submeter Recibo Verde"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {recibos.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Sem recibos submetidos</p>
            <p className="text-sm">Submeta os seus recibos verdes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="pb-2 font-medium">Código</th>
                  <th className="pb-2 font-medium">Semana</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                  <th className="pb-2 font-medium text-right">Estado</th>
                  <th className="pb-2 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {recibos.map((recibo) => (
                  <tr key={recibo.id} className="border-b last:border-0">
                    <td className="py-3 text-sm font-mono font-bold text-primary">
                      {formatCodigo(recibo.codigo)}
                    </td>
                    <td className="py-3 text-sm">{formatSemanaReferencia(recibo)}</td>
                    <td className="py-3 text-right text-sm font-medium">
                      {formatCurrency(Number(recibo.valor_total || 0))}
                    </td>
                    <td className="py-3 text-right">
                      {getStatusBadge(recibo.status)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRecibo(recibo.ficheiro_url)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {recibo.status === "submetido" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setReciboToDelete(recibo);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dialog de confirmação de eliminação */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar Recibo Verde?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza que deseja apagar este recibo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRecibo}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A apagar...
                  </>
                ) : (
                  "Apagar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
