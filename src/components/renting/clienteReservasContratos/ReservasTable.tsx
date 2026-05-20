import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Reserva } from '@/types/reserva';
import { ESTADO_LABELS } from '@/types/reserva';

import { formatDate, getEstadoBadgeColor } from './clienteReservasUtils';

interface ReservasTableProps {
  reservas: Reserva[];
  navigate: (path: string) => void;
}

export const ReservasTable: React.FC<ReservasTableProps> = ({ reservas, navigate }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground px-1">Reservas</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-xs">Código</TableHead>
              <TableHead className="h-9 text-xs">Matrícula</TableHead>
              <TableHead className="h-9 text-xs">Data Início</TableHead>
              <TableHead className="h-9 text-xs">Data Fim</TableHead>
              <TableHead className="h-9 text-xs">Valor</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservas.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/renting/reservas/${r.id}`)}
              >
                <TableCell className="text-sm font-medium">#{r.codigo}</TableCell>
                <TableCell className="text-sm">{r.matricula || '—'}</TableCell>
                <TableCell className="text-sm">{formatDate(r.data_inicio)}</TableCell>
                <TableCell className="text-sm">{formatDate(r.data_fim)}</TableCell>
                <TableCell className="text-sm">
                  {r.valor_total ? `€${r.valor_total.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={getEstadoBadgeColor(r.estado)}>{ESTADO_LABELS[r.estado]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
