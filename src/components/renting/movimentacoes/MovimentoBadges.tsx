import { ArrowRightLeft, OctagonAlert, ScrollText, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MOVIMENTO_ESTADO_LABELS,
  MOVIMENTO_TIPO_LABELS,
  type MovimentoEstado,
  type MovimentoTipo,
} from '@/types/movimento';

// ────────────────────────────────────────────────────────────
// Tipo
// ────────────────────────────────────────────────────────────

const TIPO_STYLES: Record<MovimentoTipo, string> = {
  transferencia: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  reparacao: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  manutencao: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  impro: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  inspecao: 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300',
};

const TIPO_ICONS: Record<MovimentoTipo, React.ComponentType<{ className?: string }>> = {
  transferencia: ArrowRightLeft,
  reparacao: Wrench,
  manutencao: Wrench,
  impro: OctagonAlert,
  inspecao: ScrollText,
};

export const MovimentoTipoBadge: React.FC<{ tipo: MovimentoTipo }> = ({ tipo }) => {
  const Icon = TIPO_ICONS[tipo];
  return (
    <Badge variant="outline" className={cn('font-medium gap-1', TIPO_STYLES[tipo])}>
      <Icon className="h-3 w-3" />
      {MOVIMENTO_TIPO_LABELS[tipo]}
    </Badge>
  );
};

// ────────────────────────────────────────────────────────────
// Estado
// ────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<MovimentoEstado, string> = {
  planeado: 'border-slate-400/40 bg-slate-400/10 text-slate-600 dark:text-slate-300',
  a_decorrer: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  concluido: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  cancelado: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
};

const ESTADO_DOT: Record<MovimentoEstado, string> = {
  planeado: 'bg-slate-400',
  a_decorrer: 'bg-emerald-500',
  concluido: 'bg-indigo-500',
  cancelado: 'bg-red-500',
};

export const MovimentoEstadoBadge: React.FC<{ estado: MovimentoEstado }> = ({ estado }) => (
  <Badge variant="outline" className={cn('font-medium gap-1.5', ESTADO_STYLES[estado])}>
    <span className={cn('h-1.5 w-1.5 rounded-full', ESTADO_DOT[estado])} />
    {MOVIMENTO_ESTADO_LABELS[estado]}
  </Badge>
);
