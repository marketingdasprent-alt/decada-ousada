import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Receipt } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { ReservaFormValues } from '../reservaDialog.schema';
import type { Estacao } from '@/hooks/useEstacoes';

const IVA_RATE = 0.23;

function diferencaDias(inicio: string, fim: string): number | null {
  if (!inicio || !fim) return null;
  const di = new Date(inicio).getTime();
  const df = new Date(fim).getTime();
  if (Number.isNaN(di) || Number.isNaN(df) || df <= di) return null;
  return Math.max(1, Math.ceil((df - di) / (1000 * 60 * 60 * 24)));
}

function formatEur(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '€0,00';
  return `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ReservaTabCaixaProps {
  form: UseFormReturn<ReservaFormValues>;
  estacoes: Estacao[];
}

export const ReservaTabCaixa: React.FC<ReservaTabCaixaProps> = ({ form, estacoes }) => {
  const valorTotal = form.watch('valor_total');
  const dataInicio = form.watch('data_inicio');
  const dataFim = form.watch('data_fim');
  const estacaoEntregaId = form.watch('estacao_entrega_id');
  const estacaoRecolhaId = form.watch('estacao_recolha_id');
  const grupo = form.watch('grupo');

  const dias = useMemo(() => diferencaDias(dataInicio, dataFim), [dataInicio, dataFim]);
  const total = valorTotal ?? 0;
  const subtotal = total > 0 ? total / (1 + IVA_RATE) : 0;
  const iva = total - subtotal;
  const tarifaDiaria = dias && subtotal > 0 ? subtotal / dias : 0;

  const estacaoEntregaNome = estacoes.find((e) => e.id === estacaoEntregaId)?.nome ?? '?';
  const estacaoRecolhaNome = estacoes.find((e) => e.id === estacaoRecolhaId)?.nome ?? '?';

  const descricaoAluguer = `Aluguer: ${estacaoEntregaNome} > ${estacaoRecolhaNome}${grupo ? ` (${grupo})` : ''}`;

  return (
    <div className="space-y-8">
      {/* Valor total / Tarifa manual */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b mb-4">
          <h3 className="text-base font-semibold">Tarifa Manual</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valor_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor total da reserva (€, IVA incl.)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bg-background"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                    placeholder="0,00"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-xs text-muted-foreground self-end pb-2">
            O valor inserido inclui IVA à taxa de {(IVA_RATE * 100).toFixed(0)}%. O sub-total e IVA
            são calculados a partir deste valor.
          </div>
        </div>
      </div>

      {/* Tabela Artigos */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b mb-4">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Artigos</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-2">Indicação de preços com IVA incluído.</p>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">
                  Descrição
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right w-24">
                  Unidades
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right w-32">
                  Preço Unit.
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right w-20">
                  IVA
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right w-32">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{descricaoAluguer}</TableCell>
                <TableCell className="text-right">{dias ?? 1}</TableCell>
                <TableCell className="text-right">{formatEur(tarifaDiaria || null)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {(IVA_RATE * 100).toFixed(0)}%
                </TableCell>
                <TableCell className="text-right font-medium">{formatEur(total || null)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cálculos */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div />
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-2 px-4 py-2 text-sm border-b">
            <span className="text-muted-foreground">Sub-total</span>
            <span className="text-right">{formatEur(subtotal)}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-2 text-sm border-b items-center">
            <span className="text-muted-foreground">Desconto</span>
            <div className="text-right">
              <span className="text-muted-foreground text-xs">0 %</span>
            </div>
          </div>
          <div className="grid grid-cols-2 px-4 py-2 text-sm border-b">
            <span className="text-muted-foreground">Sub-total c/ desconto</span>
            <span className="text-right">{formatEur(subtotal)}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-2 text-sm border-b bg-muted/20">
            <span className="text-muted-foreground">
              Total IVA ({(IVA_RATE * 100).toFixed(0)}%)
            </span>
            <span className="text-right">{formatEur(iva)}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 text-base font-semibold bg-muted/40">
            <span>Total</span>
            <span className="text-right">{formatEur(total)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">
        O cálculo de IVA assume {(IVA_RATE * 100).toFixed(0)}% e o sub-total é derivado do valor
        total. Linhas adicionais (extras, taxas, descontos persistentes) requerem expansão do modelo
        de dados — fica para fase futura.
      </p>
    </div>
  );
};
