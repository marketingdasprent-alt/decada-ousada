import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Fuel } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FuelTransaction {
  id: string;
  date: string;
  station: string;
  amount: number;
  quantity: number;
  type: 'bp' | 'repsol' | 'edp';
  fuelType?: string;
}

interface MotoristaCombustivelCardProps {
  motoristaId: string;
}

export function MotoristaCombustivelCard({ motoristaId }: MotoristaCombustivelCardProps) {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [motoristaId]);

  async function loadTransactions() {
    try {
      setLoading(true);
      
      // Fetch from all fuel tables in parallel
      const [bpRes, repsolRes, edpRes] = await Promise.all([
        supabase.from("bp_transacoes").select("*").eq("motorista_id", motoristaId).order("transaction_date", { ascending: false }).limit(5),
        supabase.from("repsol_transacoes").select("*").eq("motorista_id", motoristaId).order("transaction_date", { ascending: false }).limit(5),
        supabase.from("edp_transacoes").select("*").eq("motorista_id", motoristaId).order("transaction_date", { ascending: false }).limit(5)
      ]);

      const consolidated: FuelTransaction[] = [
        ...(bpRes.data || []).map(t => ({
          id: t.id,
          date: t.transaction_date,
          station: t.station_name || "Posto BP",
          amount: Number(t.amount),
          quantity: Number(t.quantity),
          type: 'bp' as const,
          fuelType: t.fuel_type
        })),
        ...(repsolRes.data || []).map(t => ({
          id: t.id,
          date: t.transaction_date,
          station: t.station_name || "Posto Repsol",
          amount: Number(t.amount),
          quantity: Number(t.quantity),
          type: 'repsol' as const,
          fuelType: t.fuel_type
        })),
        ...(edpRes.data || []).map(t => ({
          id: t.id,
          date: t.transaction_date,
          station: t.station_name || "Posto EDP",
          amount: Number(t.amount),
          quantity: Number(t.quantity),
          type: 'edp' as const
        }))
      ];

      // Sort by date and take last 5
      consolidated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(consolidated.slice(0, 5));
    } catch (error) {
      console.error("Erro ao carregar transações de combustível:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  };

  const getBrandBadge = (type: string) => {
    switch (type) {
      case 'bp': return <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">BP</span>;
      case 'repsol': return <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">Repsol</span>;
      case 'edp': return <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">EDP</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Fuel className="w-4 h-4 text-teal-500" />
            Transações de Combustível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm rounded-[2rem] overflow-hidden border-border bg-background">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black px-1 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Fuel className="w-5 h-5 text-primary" />
            </div>
            Abastecimentos Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" className="bg-muted text-muted-foreground hover:text-foreground rounded-xl text-[10px] font-bold uppercase tracking-wider h-8 border border-border">
            Ver Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border">
                <th className="px-8 py-4 font-black">Posto</th>
                <th className="px-8 py-4 font-black">Data</th>
                <th className="px-8 py-4 font-black">Valor</th>
                <th className="px-8 py-4 font-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground italic text-sm">
                    Nenhum abastecimento encontrado.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border border-border shadow-sm",
                          t.type === 'bp' ? "bg-green-500/10" : t.type === 'repsol' ? "bg-orange-500/10" : "bg-red-500/10"
                        )}>
                          <Fuel className={cn(
                            "w-5 h-5",
                            t.type === 'bp' ? "text-green-600" : t.type === 'repsol' ? "text-orange-600" : "text-red-600"
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{t.station}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                            {t.quantity.toFixed(2)} {t.type === 'edp' ? 'kWh' : 'Lts'} • {t.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {format(new Date(t.date), "MMM dd, HH:mm", { locale: pt })}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-foreground">
                        {formatCurrency(t.amount)}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-wider">
                        Processado
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
