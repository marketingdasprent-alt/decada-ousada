import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Movimentos Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground border-b">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Descrição</th>
                <th className="pb-2 font-medium text-right">Valor</th>
                <th className="pb-2 font-medium text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.map((movimento) => (
                <tr key={movimento.id} className="border-b last:border-0">
                  <td className="py-3 text-sm">
                    {format(new Date(movimento.data_movimento), "dd/MM/yy", { locale: pt })}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {movimento.tipo === "credito" ? (
                        <ArrowUpCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm">{movimento.descricao}</span>
                    </div>
                  </td>
                  <td className={`py-3 text-right text-sm font-medium ${
                    movimento.tipo === "credito" ? "text-green-600" : "text-red-600"
                  }`}>
                    {movimento.tipo === "credito" ? "+" : "-"}
                    {formatCurrency(Number(movimento.valor))}
                  </td>
                  <td className="py-3 text-right">
                    {getStatusBadge(movimento.status)}
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
