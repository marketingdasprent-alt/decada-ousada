import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CONTRATO_ESTADO_FIN_LABELS, type ContratoEstadoFinanceiro } from '@/types/contratoRenting';

const STYLES: Record<ContratoEstadoFinanceiro, string> = {
  pendente: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  facturado: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  pago: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  anulado: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

interface EstadoFinanceiroBadgeProps {
  estado: ContratoEstadoFinanceiro;
}

export const EstadoFinanceiroBadge: React.FC<EstadoFinanceiroBadgeProps> = ({ estado }) => (
  <Badge variant="outline" className={cn('font-medium', STYLES[estado])}>
    {CONTRATO_ESTADO_FIN_LABELS[estado]}
  </Badge>
);
