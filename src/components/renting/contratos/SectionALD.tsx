import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
  CONTRATO_RENOVACAO_OPCAO_LABELS,
  CONTRATO_RENOVACAO_OPCOES,
} from '@/types/contratoRenting';
import type { ContratoFormValues } from './contratoForm.schema';
import { SENTINEL_NONE } from './contratoFormConstants';

interface SectionALDProps {
  form: UseFormReturn<ContratoFormValues>;
}

export const SectionALD: React.FC<SectionALDProps> = ({ form }) => {
  const longaDuracao = form.watch('is_longa_duracao');
  const renovacaoOpcao = form.watch('renovacao_opcao');

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 p-3 rounded-md border bg-muted/20 transition-colors',
        longaDuracao && 'border-primary/40 bg-primary/5'
      )}
    >
      <FormField
        control={form.control}
        name="is_longa_duracao"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => {
                  const next = v === true;
                  field.onChange(next);
                  if (!next) {
                    form.setValue('renovacao_opcao', null);
                    form.setValue('renovacao_intervalo_dias', null);
                  }
                }}
                id="contrato-longa-duracao"
              />
            </FormControl>
            <FormLabel
              htmlFor="contrato-longa-duracao"
              className="cursor-pointer font-semibold m-0"
            >
              Aluguer de Longa Duração
            </FormLabel>
          </FormItem>
        )}
      />

      <span
        className={cn(
          'text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full',
          longaDuracao
            ? 'bg-primary/15 text-primary border border-primary/30'
            : 'bg-muted text-muted-foreground border border-border'
        )}
      >
        {longaDuracao ? 'Longa duração' : 'Curta duração'}
      </span>

      {longaDuracao && (
        <>
          <div className="h-5 w-px bg-border hidden sm:block" />

          <FormField
            control={form.control}
            name="renovacao_opcao"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 flex-1 min-w-[200px]">
                <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground m-0 shrink-0">
                  Renovação
                </FormLabel>
                <Select
                  value={field.value ?? SENTINEL_NONE}
                  onValueChange={(v) => {
                    const next =
                      v === SENTINEL_NONE
                        ? null
                        : (v as (typeof CONTRATO_RENOVACAO_OPCOES)[number]);
                    field.onChange(next);
                    if (next !== 'intervalo_dias') {
                      form.setValue('renovacao_intervalo_dias', null);
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="h-8 bg-background flex-1">
                      <SelectValue placeholder="Escolhe..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                    {CONTRATO_RENOVACAO_OPCOES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {CONTRATO_RENOVACAO_OPCAO_LABELS[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {renovacaoOpcao === 'intervalo_dias' && (
            <FormField
              control={form.control}
              name="renovacao_intervalo_dias"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0 shrink-0">
                  <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground m-0">
                    a cada
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-20 bg-background text-center"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <span className="text-xs text-muted-foreground">dias</span>
                </FormItem>
              )}
            />
          )}
        </>
      )}
    </div>
  );
};
