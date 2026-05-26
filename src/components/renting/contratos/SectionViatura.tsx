import type React from 'react';
import { useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { ArrowRightLeft, MapPin } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Estacao } from '@/hooks/useEstacoes';
import type { ViaturaBasic } from '@/hooks/useViaturas';
import type { ContratoFormValues } from './contratoForm.schema';
import { EstacaoSelectField } from './EstacaoSelectField';
import { SectionTitle } from './SectionTitle';
import { SENTINEL_NONE } from './contratoFormConstants';
import { MovimentarViaturaModal } from '@/components/renting/MovimentarViaturaModal';

interface SectionViaturaProps {
  form: UseFormReturn<ContratoFormValues>;
  viaturas: ViaturaBasic[];
  estacoes: Estacao[];
}

export const SectionViatura: React.FC<SectionViaturaProps> = ({ form, viaturas, estacoes }) => {
  const [movModalOpen, setMovModalOpen] = useState(false);
  const viaturaId = form.watch('viatura_id');
  const estacaoEntregaId = form.watch('estacao_entrega_id');

  const viaturaSelecionada = useMemo(
    () => viaturas.find((v) => v.id === viaturaId) ?? null,
    [viaturas, viaturaId]
  );
  const precisaMovimentar =
    !!viaturaSelecionada &&
    !!estacaoEntregaId &&
    viaturaSelecionada.estacao_id !== estacaoEntregaId;
  const estacaoViaturaNome = viaturaSelecionada?.estacao_id
    ? (estacoes.find((e) => e.id === viaturaSelecionada.estacao_id)?.nome ?? null)
    : null;

  return (
    <div>
      <SectionTitle>Viatura</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="estacao_origem_viatura_id"
          render={({ field }) => (
            <EstacaoSelectField
              value={field.value}
              onChange={field.onChange}
              estacoes={estacoes}
              label="Estação Origem Viatura"
            />
          )}
        />

        <FormField
          control={form.control}
          name="viatura_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Viatura <span className="text-red-500">*</span>
              </FormLabel>
              <Select
                value={field.value || SENTINEL_NONE}
                onValueChange={(v) => {
                  const newId = v === SENTINEL_NONE ? '' : v;
                  field.onChange(newId);
                  const via = viaturas.find((x) => x.id === newId);
                  if (via) form.setValue('matricula', via.matricula);
                }}
              >
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccione viatura" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE} disabled>
                    — Seleccione —
                  </SelectItem>
                  {viaturas.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.matricula} — {v.marca} {v.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="grupo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grupo</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  {...field}
                  value={field.value ?? ''}
                  placeholder="ex.: C4 (ou similar)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {precisaMovimentar && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {estacaoViaturaNome ? (
                <>
                  A viatura encontra-se na estação <strong>{estacaoViaturaNome}</strong> —
                  diferente da estação de entrega.
                </>
              ) : (
                <>A viatura não tem estação definida.</>
              )}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMovModalOpen(true)}
            className="shrink-0 gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Movimentar viatura
          </Button>
        </div>
      )}

      <MovimentarViaturaModal
        open={movModalOpen}
        onOpenChange={setMovModalOpen}
        viatura={
          viaturaSelecionada
            ? {
                id: viaturaSelecionada.id,
                matricula: viaturaSelecionada.matricula,
                estacao_id: viaturaSelecionada.estacao_id,
              }
            : null
        }
        estacoes={estacoes}
        estacaoDestinoSugerida={estacaoEntregaId}
      />
    </div>
  );
};
