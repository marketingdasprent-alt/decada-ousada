import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatMatricula } from './calendarioUtils';

import {
  useEventosPendentesRenting,
  useRealizarEventoRenting,
} from '@/hooks/useEventosPendentesRenting';

interface Props {
  tipo: 'entrega' | 'recolha';
}

/** Secção embebida nos drawers Check Out / Check In — lista
 *  eventos pendentes de contratos de renting com um botão "Realizar". */
export const RentingPendentesSection: React.FC<Props> = ({ tipo }) => {
  const { data: pendentes = [], isLoading } = useEventosPendentesRenting({ tipo });
  const realizar = useRealizarEventoRenting();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />A carregar pendentes de renting...
      </div>
    );
  }

  if (pendentes.length === 0) return null;

  return (
    <div className="border-b">
      <div className="px-4 py-2 bg-primary/5 border-b">
        <h3 className="text-xs uppercase tracking-wide font-semibold text-primary">
          Aluguer / Renting · {pendentes.length} {tipo === 'entrega' ? 'entrega(s)' : 'recolha(s)'}{' '}
          pendente(s)
        </h3>
      </div>
      <ul className="divide-y">
        {pendentes.map((ev) => {
          const matricula = ev.titulo ? formatMatricula(ev.titulo) : '—';
          const cidade = ev.cidade ? ` · ${ev.cidade}` : '';
          const dataFmt = format(new Date(ev.data_inicio), "dd/MM 'às' HH:mm", {
            locale: pt,
          });
          const isRealizando =
            realizar.isPending && realizar.variables?.contratoId === ev.origem_id;
          return (
            <li key={ev.id} className="px-4 py-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {matricula}
                  {cidade}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ev.contrato_codigo ? `Contrato #${ev.contrato_codigo} · ` : ''}
                  {dataFmt}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => realizar.mutate({ contratoId: ev.origem_id, tipo })}
                disabled={realizar.isPending}
                className="gap-1 shrink-0"
              >
                {isRealizando ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Realizar
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
