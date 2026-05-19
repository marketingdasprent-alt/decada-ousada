import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ContratoRenting } from '@/types/contratoRenting';
import { CONTRATO_ESTADO_FIN_LABELS, CONTRATO_ESTADO_OP_LABELS } from '@/types/contratoRenting';

import { formatDate, getEstadoBadgeColor } from './clienteReservasUtils';

interface ContratosTableProps {
  contratos: ContratoRenting[];
  navigate: (path: string) => void;
}

export const ContratosTable: React.FC<ContratosTableProps> = ({ contratos, navigate }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground px-1">Contratos</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-xs">Código</TableHead>
              <TableHead className="h-9 text-xs">Matrícula</TableHead>
              <TableHead className="h-9 text-xs">Data Início</TableHead>
              <TableHead className="h-9 text-xs">Data Fim</TableHead>
              <TableHead className="h-9 text-xs">Estado Op.</TableHead>
              <TableHead className="h-9 text-xs">Estado Fin.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/renting/contratos/${c.id}`)}
              >
                <TableCell className="text-sm font-medium">#{c.codigo}</TableCell>
                <TableCell className="text-sm">{c.matricula || '—'}</TableCell>
                <TableCell className="text-sm">{formatDate(c.data_inicio)}</TableCell>
                <TableCell className="text-sm">{formatDate(c.data_fim)}</TableCell>
                <TableCell>
                  <Badge className={getEstadoBadgeColor(c.estado_operacional)}>
                    {CONTRATO_ESTADO_OP_LABELS[c.estado_operacional]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getEstadoBadgeColor(c.estado_financeiro)}>
                    {CONTRATO_ESTADO_FIN_LABELS[c.estado_financeiro]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
