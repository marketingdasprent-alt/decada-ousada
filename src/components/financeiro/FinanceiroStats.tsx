import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, CheckCircle, XCircle } from "lucide-react";

interface FinanceiroStatsProps {
  recibos: Array<{
    status: string | null;
    valor_total: number | null;
  }>;
}

export function FinanceiroStats({ recibos }: FinanceiroStatsProps) {
  const stats = {
    pendentes: recibos.filter(r => r.status === 'submetido'),
    validados: recibos.filter(r => r.status === 'validado'),
    rejeitados: recibos.filter(r => r.status === 'rejeitado'),
    total: recibos
  };

  const calcularValor = (lista: typeof recibos) => 
    lista.reduce((acc, r) => acc + (r.valor_total || 0), 0);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  const cards = [
    {
      title: "Pendentes",
      count: stats.pendentes.length,
      value: calcularValor(stats.pendentes),
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      title: "Totais",
      count: stats.total.length,
      value: calcularValor(stats.total),
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Validados",
      count: stats.validados.length,
      value: calcularValor(stats.validados),
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Recusados",
      count: stats.rejeitados.length,
      value: calcularValor(stats.rejeitados),
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                <p className="text-xl font-bold">{card.count}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatCurrency(card.value)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
