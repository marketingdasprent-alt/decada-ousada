import { Car, CheckCircle, AlertTriangle, Wrench, BadgeX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ViaturaStatsSummary } from '@/lib/viaturas';

interface ViaturaStatsCardsProps {
  stats: ViaturaStatsSummary;
}

export function ViaturaStatsCards({ stats }: ViaturaStatsCardsProps) {
  const cards = [
    {
      title: 'Total de Viaturas',
      value: stats.total,
      icon: Car,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Disponíveis',
      value: stats.disponiveis,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Em Uso',
      value: stats.emUso,
      icon: AlertTriangle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Manutenção',
      value: stats.manutencao,
      icon: Wrench,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Vendidas',
      value: stats.vendidas,
      icon: BadgeX,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
