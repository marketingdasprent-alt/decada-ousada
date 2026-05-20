import { useMemo } from 'react';
import { ArrowRightLeft, OctagonAlert, ScrollText, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type Movimento } from '@/types/movimento';

interface MovimentosStatsCardsProps {
  movimentos: Movimento[];
}

interface StatDef {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  match: (m: Movimento) => boolean;
}

const STATS: StatDef[] = [
  {
    label: 'Transferências',
    icon: ArrowRightLeft,
    accent: 'text-sky-600 dark:text-sky-400',
    match: (m) => m.tipo === 'transferencia',
  },
  {
    label: 'Reparações / Manutenções',
    icon: Wrench,
    accent: 'text-amber-600 dark:text-amber-400',
    match: (m) => m.tipo === 'reparacao' || m.tipo === 'manutencao',
  },
  {
    label: 'Impros',
    icon: OctagonAlert,
    accent: 'text-red-600 dark:text-red-400',
    match: (m) => m.tipo === 'impro',
  },
  {
    label: 'Inspeções',
    icon: ScrollText,
    accent: 'text-teal-600 dark:text-teal-400',
    match: (m) => m.tipo === 'inspecao',
  },
];

export const MovimentosStatsCards: React.FC<MovimentosStatsCardsProps> = ({ movimentos }) => {
  const counts = useMemo(() => {
    return STATS.map((stat) => {
      const relevantes = movimentos.filter(stat.match);
      const aDecorrer = relevantes.filter((m) => m.estado === 'a_decorrer').length;
      const planeados = relevantes.filter((m) => m.estado === 'planeado').length;
      return { aDecorrer, planeados };
    });
  }, [movimentos]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        const { aDecorrer, planeados } = counts[i];
        return (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={cn('rounded-lg bg-muted p-2 shrink-0', stat.accent)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-foreground leading-tight mt-0.5">
                  {aDecorrer}
                </p>
                <p className="text-[11px] text-muted-foreground">Planeados: {planeados}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
