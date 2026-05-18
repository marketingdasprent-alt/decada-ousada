import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CONTRATO_ESTADO_OP_LABELS, type ContratoEstadoOperacional } from '@/types/contratoRenting';

const STYLES: Record<ContratoEstadoOperacional, string> = {
  agendado: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  em_curso: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  devolvido: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cancelado: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
};

interface EstadoOperacionalBadgeProps {
  estado: ContratoEstadoOperacional;
}

export const EstadoOperacionalBadge: React.FC<EstadoOperacionalBadgeProps> = ({ estado }) => (
  <Badge variant="outline" className={cn('font-medium', STYLES[estado])}>
    {CONTRATO_ESTADO_OP_LABELS[estado]}
  </Badge>
);
