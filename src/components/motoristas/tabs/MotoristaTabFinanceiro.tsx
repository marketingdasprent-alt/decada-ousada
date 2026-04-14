import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Check,
  X,
  RefreshCw,
  Coins,
  Receipt,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Motorista } from "@/pages/Motoristas";
import { MotoristaRecibosSection } from "./MotoristaRecibosSection";



interface MovimentoFinanceiro {
  id: string;
  tipo: "credito" | "debito";
  categoria: string | null;
  descricao: string;
  valor: number;
  data_movimento: string;
  data_pagamento: string | null;
  status: "pendente" | "pago" | "cancelado";
  referencia: string | null;
  created_at: string;
}

const CATEGORIAS = [
  { value: "salario", label: "Salário" },
  { value: "bonus", label: "Bónus" },
  { value: "desconto", label: "Desconto" },
  { value: "multa", label: "Multa" },
  { value: "caucao", label: "Caução" },
  { value: "renda_viatura", label: "Renda Viatura" },
  { value: "outro", label: "Outro" },
];

interface MotoristaTabFinanceiroProps {
  motorista: Motorista;
}

export function MotoristaTabFinanceiro({ motorista }: MotoristaTabFinanceiroProps) {
  const [movimentos, setMovimentos] = useState<MovimentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    tipo: "debito" as "credito" | "debito",
    categoria: "",
    descricao: "",
    valor: "",
    data_movimento: format(new Date(), "yyyy-MM-dd"),
    referencia: "",
  });

  useEffect(() => {
    loadMovimentos();
  }, [motorista.id]);

  const loadMovimentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("motorista_financeiro")
        .select("*")
        .eq("motorista_id", motorista.id)
        .order("data_movimento", { ascending: false });

      if (error) throw error;
      setMovimentos((data as MovimentoFinanceiro[]) || []);
    } catch (error) {
      console.error("Erro ao carregar movimentos:", error);
      toast.error("Erro ao carregar movimentos financeiros");
    } finally {
      setLoading(false);
    }
  };

  const calcularResumo = () => {
    let totalCreditos = 0;
    let totalDebitos = 0;
    let pendentes = 0;

    movimentos.forEach((m) => {
      if (m.status !== "cancelado") {
        if (m.tipo === "credito") {
          totalCreditos += Number(m.valor);
        } else {
          totalDebitos += Number(m.valor);
        }
        if (m.status === "pendente") {
          pendentes++;
        }
      }
    });

    const saldo = totalCreditos - totalDebitos;
    return { totalCreditos, totalDebitos, saldo, pendentes };
  };

  const resumo = calcularResumo();

  const handleSubmit = async () => {
    if (!formData.descricao || !formData.valor) {
      toast.error("Preencha a descrição e o valor");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("motorista_financeiro").insert({
        motorista_id: motorista.id,
        tipo: formData.tipo,
        categoria: formData.categoria || null,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_movimento: formData.data_movimento,
        referencia: formData.referencia || null,
        status: "pendente",
      });

      if (error) throw error;

      toast.success("Movimento adicionado com sucesso!");
      setDialogOpen(false);
      setFormData({
        tipo: "debito",
        categoria: "",
        descricao: "",
        valor: "",
        data_movimento: format(new Date(), "yyyy-MM-dd"),
        referencia: "",
      });
      loadMovimentos();
    } catch (error) {
      console.error("Erro ao adicionar movimento:", error);
      toast.error("Erro ao adicionar movimento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarcarPago = async (id: string) => {
    try {
      const { error } = await supabase
        .from("motorista_financeiro")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Movimento marcado como pago!");
      loadMovimentos();
    } catch (error) {
      console.error("Erro ao atualizar movimento:", error);
      toast.error("Erro ao atualizar movimento");
    }
  };

  const handleCancelar = async (id: string) => {
    try {
      const { error } = await supabase
        .from("motorista_financeiro")
        .update({ status: "cancelado" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Movimento cancelado!");
      loadMovimentos();
    } catch (error) {
      console.error("Erro ao cancelar movimento:", error);
      toast.error("Erro ao cancelar movimento");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">A carregar dados financeiros...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

        <>
          {/* Resumo Financeiro with colored cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="overflow-hidden border-t-4 border-t-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Créditos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(resumo.totalCreditos)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-t-4 border-t-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Débitos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(resumo.totalDebitos)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-t-4 border-t-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className={`text-2xl font-bold ${resumo.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(resumo.saldo)}
                    </p>
                    {resumo.pendentes > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {resumo.pendentes} movimento(s) pendente(s)
                      </p>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Wallet className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Movimentos in SectionCard */}
          <SectionCard
            icon={<ListOrdered className="h-4 w-4" />}
            title="Histórico de Movimentos"
            headerClassName="bg-blue-50 dark:bg-blue-950/30"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Histórico de movimentos financeiros do motorista.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadMovimentos}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Movimento
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum movimento financeiro registado.
                    </TableCell>
                  </TableRow>
                ) : (
                  movimentos.map((movimento) => (
                    <TableRow key={movimento.id} className={movimento.status === "cancelado" ? "opacity-50" : ""}>
                      <TableCell>
                        {format(new Date(movimento.data_movimento), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movimento.descricao}</p>
                          {movimento.referencia && (
                            <p className="text-xs text-muted-foreground">Ref: {movimento.referencia}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {movimento.categoria
                          ? CATEGORIAS.find((c) => c.value === movimento.categoria)?.label || movimento.categoria
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movimento.tipo === "credito" ? "default" : "secondary"}>
                          {movimento.tipo === "credito" ? "Crédito" : "Débito"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${movimento.tipo === "credito" ? "text-green-600" : "text-red-600"}`}>
                        {movimento.tipo === "credito" ? "+" : "-"}
                        {formatCurrency(Number(movimento.valor))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movimento.status === "pago"
                              ? "default"
                              : movimento.status === "cancelado"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {movimento.status === "pago" ? "Pago" : movimento.status === "cancelado" ? "Cancelado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {movimento.status === "pendente" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleMarcarPago(movimento.id)} title="Marcar como pago" className="text-green-600 hover:text-green-700">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCancelar(movimento.id)} title="Cancelar" className="text-destructive hover:text-destructive">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Dialog Novo Movimento */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Movimento Financeiro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as "credito" | "debito" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credito">Crédito (a receber)</SelectItem>
                        <SelectItem value="debito">Débito (a pagar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Ex: Salário semana 1 - Janeiro" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (€) *</Label>
                    <Input type="number" step="0.01" min="0" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={formData.data_movimento} onChange={(e) => setFormData({ ...formData, data_movimento: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Referência (opcional)</Label>
                  <Input value={formData.referencia} onChange={(e) => setFormData({ ...formData, referencia: e.target.value })} placeholder="Ex: Fatura #123" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "A guardar..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
    </div>
  );
}
