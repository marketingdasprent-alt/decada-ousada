import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Table as TableIcon,
  X,
  Edit2,
  Check
} from "lucide-react";
import { format, startOfWeek, addWeeks, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Motorista } from "@/pages/Motoristas";

interface CustoAdicional {
  id: string;
  motorista_id: string;
  tipo: string;
  valor: number;
  semana_referencia: string;
  status: string;
  descricao: string | null;
  created_at: string;
}

interface MotoristaTabOutrosCustosProps {
  motorista: Motorista;
}

export function MotoristaTabOutrosCustos({ motorista }: MotoristaTabOutrosCustosProps) {
  const [custos, setCustos] = useState<CustoAdicional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCusto, setEditCusto] = useState<Partial<CustoAdicional>>({});

  // Form states
  const [tipo, setTipo] = useState<string>("Caução");
  const [valor, setValor] = useState<string>("");
  const [semanas, setSemanas] = useState<string>("1");
  const [dataInicio, setDataInicio] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );

  useEffect(() => {
    loadCustos();
  }, [motorista.id]);

  async function loadCustos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("motorista_custos_adicionais")
        .select("*")
        .eq("motorista_id", motorista.id)
        .order("semana_referencia", { ascending: true });

      if (error) throw error;
      setCustos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar custos:", error);
      // Don't toast error if table doesn't exist yet, we'll handle it nicely
    } finally {
      setLoading(false);
    }
  }

  async function handleGerarCustos() {
    if (!valor || Number(valor) <= 0) {
      toast.error("Insira um valor válido.");
      return;
    }
    if (!semanas || Number(semanas) <= 0) {
      toast.error("Insira o número de semanas.");
      return;
    }

    try {
      setGenerating(true);
      const numSemanas = parseInt(semanas);
      const valorNum = parseFloat(valor);
      const payloads = [];
      let currentWeek = parseISO(dataInicio);

      for (let i = 0; i < numSemanas; i++) {
        payloads.push({
          motorista_id: motorista.id,
          tipo,
          valor: valorNum,
          semana_referencia: format(currentWeek, "yyyy-MM-dd"),
          status: "pendente",
          descricao: `Gerado automaticamente: ${numSemanas} semanas`
        });
        currentWeek = addWeeks(currentWeek, 1);
      }

      const { error } = await supabase
        .from("motorista_custos_adicionais")
        .insert(payloads);

      if (error) throw error;

      toast.success(`${numSemanas} lançamentos gerados com sucesso!`);
      setShowForm(false);
      loadCustos();
      
      // Reset form
      setValor("");
      setSemanas("1");
    } catch (error: any) {
      console.error("Erro ao gerar custos:", error);
      toast.error("Erro ao gerar custos: " + error.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from("motorista_custos_adicionais")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Lançamento removido.");
      setCustos(custos.filter(c => c.id !== id));
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  }

  async function handleUpdateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("motorista_custos_adicionais")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      setCustos(custos.map(c => c.id === id ? { ...c, status: newStatus } : c));
      toast.success("Status atualizado.");
    } catch (error: any) {
      toast.error("Erro ao atualizar status.");
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editCusto.valor || editCusto.valor <= 0) {
      toast.error("Insira um valor válido.");
      return;
    }

    try {
      const { error } = await supabase
        .from("motorista_custos_adicionais")
        .update({
          tipo: editCusto.tipo,
          valor: editCusto.valor,
          semana_referencia: editCusto.semana_referencia,
        })
        .eq("id", editingId);

      if (error) throw error;
      
      setEditingId(null);
      await loadCustos();
      toast.success("Custo atualizado com sucesso.");
    } catch (error: any) {
      toast.error("Erro ao salvar alterações.");
    }
  }

  function startEditing(custo: CustoAdicional) {
    setEditingId(custo.id);
    setEditCusto({
      tipo: custo.tipo,
      valor: custo.valor,
      semana_referencia: custo.semana_referencia,
    });
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestão de Outros Custos</h3>
          <p className="text-sm text-muted-foreground">Agende cauções, seguros e outras deduções semanais.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Incluir Custos
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              Novo Agendamento de Custo
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Tipo de Custo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caução">Caução</SelectItem>
                    <SelectItem value="Seguros">Seguros</SelectItem>
                    <SelectItem value="Outros Custos">Outros Custos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor Semanal (€)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={valor} 
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nº Semanas</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={semanas} 
                  onChange={(e) => setSemanas(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Semana de Início</Label>
                <Input 
                  type="date" 
                  value={dataInicio} 
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="md:col-start-4">
                <Button 
                  onClick={handleGerarCustos} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                  Gerar Custos
                </Button>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground italic">
              * Ao clicar em "Gerar Custos", o sistema criará individualmente os lançamentos para as semanas seguintes, permitindo controlo granular por período.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Semana / Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {custos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <TableIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  Nenhum custo adicional agendado para este motorista.
                </TableCell>
              </TableRow>
            ) : (
              custos.map((custo) => {
                const isEditing = editingId === custo.id;
                return (
                  <TableRow key={custo.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input 
                          type="date" 
                          className="h-8 py-0"
                          value={editCusto.semana_referencia}
                          onChange={(e) => setEditCusto({...editCusto, semana_referencia: e.target.value})}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {format(parseISO(custo.semana_referencia), "dd/MM/yyyy")}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select 
                          value={editCusto.tipo} 
                          onValueChange={(v) => setEditCusto({...editCusto, tipo: v})}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Caução">Caução</SelectItem>
                            <SelectItem value="Seguros">Seguros</SelectItem>
                            <SelectItem value="Outros Custos">Outros Custos</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          {custo.tipo}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={cn("font-semibold text-destructive", isEditing && "py-1")}>
                      {isEditing ? (
                        <Input 
                          type="number" 
                          className="h-8 py-0"
                          value={editCusto.valor}
                          onChange={(e) => setEditCusto({...editCusto, valor: parseFloat(e.target.value)})}
                        />
                      ) : (
                         formatCurrency(custo.valor)
                      )}
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handleUpdateStatus(custo.id, custo.status === 'pendente' ? 'cobrado' : 'pendente')}
                        className="focus:outline-none"
                      >
                        {custo.status === "cobrado" ? (
                          <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Pago
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pendente
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-600 hover:bg-green-50"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:bg-muted"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:bg-muted"
                              onClick={() => startEditing(custo)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(custo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
