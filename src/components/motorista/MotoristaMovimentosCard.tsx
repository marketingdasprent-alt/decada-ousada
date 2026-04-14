import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Movimento {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_movimento: string;
  status: string;
  categoria: string;
}

interface MotoristaMovimentosCardProps {
  motoristaId: string;
}

export function MotoristaMovimentosCard({ motoristaId }: MotoristaMovimentosCardProps) {
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovimentos();
  }, [motoristaId]);

  async function loadMovimentos() {
    try {
      const { data, error } = await supabase
        .from("motorista_financeiro")
        .select("*")
        .eq("motorista_id", motoristaId)
        .order("data_movimento", { ascending: false })
        .limit(5);

      if (error) throw error;
      setMovimentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar movimentos:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pago":
        return <Badge variant="default" className="bg-green-600">Pago</Badge>;
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Movimentos Recentes
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

  if (movimentos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Movimentos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Sem movimentos registados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden leading-relaxed">
      <CardHeader className="p-8 pb-4 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-xl">
              <Wallet className="w-5 h-5 text-teal-600" />
            </div>
            Movimentos Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" className="bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl text-[10px] font-bold uppercase tracking-wider h-8">
            Ver Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
                <th className="px-8 py-4 font-black">Data</th>
                <th className="px-8 py-4 font-black">Descrição</th>
                <th className="px-8 py-4 font-black text-right">Valor</th>
                <th className="px-8 py-4 font-black text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {movimentos.map((movimento) => (
                <tr key={movimento.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 text-xs text-slate-500 whitespace-nowrap">
                    {format(new Date(movimento.data_movimento), "dd MMM, yyyy", { locale: pt })}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        movimento.tipo === "credito" ? "bg-green-50" : "bg-red-50"
                      )}>
                        {movimento.tipo === "credito" ? (
                          <ArrowUpCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{movimento.descricao}</span>
                    </div>
                  </td>
                  <td className={cn(
                    "px-8 py-5 text-right text-sm font-black",
                    movimento.tipo === "credito" ? "text-green-600" : "text-red-700"
                  )}>
                    {movimento.tipo === "credito" ? "+" : "-"}
                    {formatCurrency(Number(movimento.valor))}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      movimento.status === "pago" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {movimento.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
