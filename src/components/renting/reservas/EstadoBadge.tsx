import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ESTADO_LABELS, type ReservaEstado } from '@/types/reserva';

const STYLES: Record<ReservaEstado, string> = {
  pendente: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  confirmada: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  em_curso: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  concluida: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  cancelada: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  expirada: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

interface EstadoBadgeProps {
  estado: ReservaEstado;
}

export const EstadoBadge: React.FC<EstadoBadgeProps> = ({ estado }) => (
  <Badge variant="outline" className={cn('font-medium', STYLES[estado])}>
    {ESTADO_LABELS[estado]}
  </Badge>
);
