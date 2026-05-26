import { useMemo } from 'react';
import { ArrowRight, ArrowRightLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useMovimentacoes } from '@/hooks/useMovimentacoes';
import { useViaturas } from '@/hooks/useViaturas';
import { useEstacoes } from '@/hooks/useEstacoes';

const RentingMovimentacoes = () => {
  const { data: movimentacoes = [], isLoading } = useMovimentacoes();
  const { data: viaturas = [] } = useViaturas();
  const { data: estacoes = [] } = useEstacoes({ apenasAtivas: false });

  const viaturaById = useMemo(() => {
    const m = new Map<string, (typeof viaturas)[number]>();
    viaturas.forEach((v) => m.set(v.id, v));
    return m;
  }, [viaturas]);

  const estacaoNome = useMemo(() => {
    const m = new Map<string, string>();
    estacoes.forEach((e) => m.set(e.id, e.nome));
    return (id: string | null | undefined) => (id ? (m.get(id) ?? '—') : '—');
  }, [estacoes]);

  return (
    <div className="w-full">
      <StickyPageHeader
        title="Movimentações"
        description="Histórico de movimentação de viaturas entre estações"
        icon={ArrowRightLeft}
      />

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Data
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Viatura
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Movimentação
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Observações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="py-16">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : movimentacoes.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <ArrowRightLeft className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Ainda não há movimentações registadas.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  movimentacoes.map((m) => {
                    const viatura = viaturaById.get(m.viatura_id);
                    return (
                      <TableRow key={m.id} className="border-border">
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(new Date(m.data_movimentacao), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {viatura
                            ? `${viatura.matricula} — ${viatura.marca} ${viatura.modelo}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                              {estacaoNome(m.estacao_origem_id)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium">
                              {estacaoNome(m.estacao_destino_id)}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.observacoes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentingMovimentacoes;
