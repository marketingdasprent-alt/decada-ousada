import { useState, useEffect } from "react";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import {
  Car,
  Plus,
  X,
  RefreshCw,
  Calendar,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Motorista } from "@/pages/Motoristas";

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano: number | null;
  cor: string | null;
  categoria: string | null;
  status: string;
}

interface MotoristaViatura {
  id: string;
  viatura_id: string;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  viatura: Viatura;
}

interface MotoristaTabViaturasProps {
  motorista: Motorista;
}

export function MotoristaTabViaturas({ motorista }: MotoristaTabViaturasProps) {
  const [associacoes, setAssociacoes] = useState<MotoristaViatura[]>([]);
  const [viaturasDisponiveis, setViaturasDisponiveis] = useState<Viatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [desassociarDialogOpen, setDesassociarDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    viatura_id: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    observacoes: "",
  });

  useEffect(() => {
    loadData();
  }, [motorista.id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: assocData, error: assocError } = await supabase
        .from("motorista_viaturas")
        .select(`
          id,
          viatura_id,
          data_inicio,
          data_fim,
          status,
          observacoes,
          viatura:viaturas (
            id,
            matricula,
            marca,
            modelo,
            ano,
            cor,
            categoria,
            status
          )
        `)
        .eq("motorista_id", motorista.id)
        .order("data_inicio", { ascending: false });

      if (assocError) throw assocError;
      
      const typedAssocData = (assocData || []).map(item => ({
        ...item,
        viatura: item.viatura as unknown as Viatura
      }));
      
      setAssociacoes(typedAssocData);

      const { data: viaturasData, error: viaturasError } = await supabase
        .from("viaturas")
        .select("*")
        .eq("status", "disponivel")
        .order("matricula");

      if (viaturasError) throw viaturasError;
      setViaturasDisponiveis(viaturasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados de viaturas");
    } finally {
      setLoading(false);
    }
  };

  const viaturaAtual = associacoes.find((a) => a.status === "ativo");
  const historico = associacoes.filter((a) => a.status !== "ativo");

  const calcularDuracao = (dataInicio: string, dataFim: string | null) => {
    const inicio = new Date(dataInicio);
    const fim = dataFim ? new Date(dataFim) : new Date();
    const meses = differenceInMonths(fim, inicio);
    const dias = differenceInDays(fim, inicio) % 30;

    if (meses === 0) {
      return `${dias} dia(s)`;
    }
    return `${meses} mês(es)`;
  };

  const handleAssociar = async () => {
    if (!formData.viatura_id) {
      toast.error("Selecione uma viatura");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase.from("motorista_viaturas").insert({
        motorista_id: motorista.id,
        viatura_id: formData.viatura_id,
        data_inicio: formData.data_inicio,
        observacoes: formData.observacoes || null,
        status: "ativo",
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("viaturas")
        .update({ status: "em_uso" })
        .eq("id", formData.viatura_id);

      if (updateError) throw updateError;

      toast.success("Viatura associada com sucesso!");
      setDialogOpen(false);
      setFormData({
        viatura_id: "",
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        observacoes: "",
      });
      loadData();
    } catch (error) {
      console.error("Erro ao associar viatura:", error);
      toast.error("Erro ao associar viatura");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDesassociar = async () => {
    if (!viaturaAtual) return;

    setIsSubmitting(true);

    try {
      const { error: updateAssocError } = await supabase
        .from("motorista_viaturas")
        .update({
          status: "encerrado",
          data_fim: new Date().toISOString().split("T")[0],
        })
        .eq("id", viaturaAtual.id);

      if (updateAssocError) throw updateAssocError;

      const { error: updateViaturaError } = await supabase
        .from("viaturas")
        .update({ status: "disponivel" })
        .eq("id", viaturaAtual.viatura_id);

      if (updateViaturaError) throw updateViaturaError;

      toast.success("Viatura desassociada com sucesso!");
      setDesassociarDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Erro ao desassociar viatura:", error);
      toast.error("Erro ao desassociar viatura");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoriaColor = (categoria: string | null) => {
    switch (categoria?.toLowerCase()) {
      case "black":
        return "bg-black text-white";
      case "comfort":
        return "bg-blue-500 text-white";
      case "green":
        return "bg-green-500 text-white";
      case "x-saver":
        return "bg-orange-500 text-white";
      default:
        return "bg-secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">A carregar dados de viaturas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Viatura Atual */}
      <SectionCard
        icon={<Car className="h-4 w-4" />}
        title="Viatura Atual"
        headerClassName="bg-green-50 dark:bg-green-950/30"
      >
        {!viaturaAtual && viaturasDisponiveis.length > 0 && (
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Associar Viatura
            </Button>
          </div>
        )}

        {viaturaAtual ? (
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold">{viaturaAtual.viatura.matricula}</h4>
                  {viaturaAtual.viatura.categoria && (
                    <Badge className={getCategoriaColor(viaturaAtual.viatura.categoria)}>
                      {viaturaAtual.viatura.categoria}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {viaturaAtual.viatura.marca} {viaturaAtual.viatura.modelo}
                  {viaturaAtual.viatura.ano && ` (${viaturaAtual.viatura.ano})`}
                  {viaturaAtual.viatura.cor && ` - ${viaturaAtual.viatura.cor}`}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Desde: {format(new Date(viaturaAtual.data_inicio), "dd/MM/yyyy")}
                  </span>
                  <span>
                    Duração: {calcularDuracao(viaturaAtual.data_inicio, null)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDesassociarDialogOpen(true)}
            >
              <X className="h-4 w-4 mr-2" />
              Desassociar
            </Button>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <Car className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Nenhuma viatura associada</p>
            {viaturasDisponiveis.length === 0 && (
              <p className="text-xs mt-1">
                Não existem viaturas disponíveis para associar.
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Histórico */}
      {historico.length > 0 && (
        <SectionCard
          icon={<History className="h-4 w-4" />}
          title="Histórico de Viaturas"
          headerClassName="bg-muted/50"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Duração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.viatura.matricula}</TableCell>
                  <TableCell>
                    {item.viatura.marca} {item.viatura.modelo}
                  </TableCell>
                  <TableCell>
                    {item.viatura.categoria && (
                      <Badge className={getCategoriaColor(item.viatura.categoria)}>
                        {item.viatura.categoria}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.data_inicio), "dd/MM/yyyy")}
                    {item.data_fim && ` - ${format(new Date(item.data_fim), "dd/MM/yyyy")}`}
                  </TableCell>
                  <TableCell>{calcularDuracao(item.data_inicio, item.data_fim)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {/* Dialog Associar Viatura */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar Viatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Viatura *</Label>
              <Select value={formData.viatura_id} onValueChange={(value) => setFormData({ ...formData, viatura_id: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma viatura..." /></SelectTrigger>
                <SelectContent>
                  {viaturasDisponiveis.map((viatura) => (
                    <SelectItem key={viatura.id} value={viatura.id}>
                      {viatura.matricula} - {viatura.marca} {viatura.modelo}
                      {viatura.categoria && ` (${viatura.categoria})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input type="date" value={formData.data_inicio} onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} placeholder="Notas sobre esta associação..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssociar} disabled={isSubmitting}>
              {isSubmitting ? "A associar..." : "Associar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Desassociar */}
      <AlertDialog open={desassociarDialogOpen} onOpenChange={setDesassociarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desassociar Viatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende desassociar a viatura{" "}
              <strong>{viaturaAtual?.viatura.matricula}</strong> deste motorista?
              A viatura ficará novamente disponível para outros motoristas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesassociar} disabled={isSubmitting}>
              {isSubmitting ? "A processar..." : "Desassociar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
