import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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

interface SectionViaturaProps {
  form: UseFormReturn<ContratoFormValues>;
  viaturas: ViaturaBasic[];
  estacoes: Estacao[];
}

export const SectionViatura: React.FC<SectionViaturaProps> = ({ form, viaturas, estacoes }) => (
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
            <FormLabel>Viatura *</FormLabel>
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
  </div>
);
