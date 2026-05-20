import { ArrowRightLeft, OctagonAlert, ScrollText, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOVIMENTO_TIPOS, MOVIMENTO_TIPO_LABELS, type MovimentoTipo } from '@/types/movimento';

const TIPO_META: Record<
  MovimentoTipo,
  { icon: React.ComponentType<{ className?: string }>; descricao: string }
> = {
  transferencia: { icon: ArrowRightLeft, descricao: 'Mudar a viatura de estação' },
  reparacao: { icon: Wrench, descricao: 'Avaria a corrigir' },
  manutencao: { icon: Wrench, descricao: 'Revisão / manutenção planeada' },
  impro: { icon: OctagonAlert, descricao: 'Viatura parada / indisponível' },
  inspecao: { icon: ScrollText, descricao: 'Inspeção periódica (IPO)' },
};

interface MovimentoTipoSelectorProps {
  value: MovimentoTipo;
  onChange: (tipo: MovimentoTipo) => void;
  disabled?: boolean;
}

export const MovimentoTipoSelector: React.FC<MovimentoTipoSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
    {MOVIMENTO_TIPOS.map((tipo) => {
      const meta = TIPO_META[tipo];
      const Icon = meta.icon;
      const selected = value === tipo;
      return (
        <button
          key={tipo}
          type="button"
          disabled={disabled}
          onClick={() => onChange(tipo)}
          className={cn(
            'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            selected
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
          )}
        >
          <Icon className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('text-sm font-semibold', selected && 'text-primary')}>
            {MOVIMENTO_TIPO_LABELS[tipo]}
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight">{meta.descricao}</span>
        </button>
      );
    })}
  </div>
);
