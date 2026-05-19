import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import type { Estacao } from '@/hooks/useEstacoes';
import type { ContratoFormValues } from './contratoForm.schema';
import { EstacaoSelectField } from './EstacaoSelectField';
import { SectionTitle } from './SectionTitle';

interface SectionEntregaRecolhaProps {
  form: UseFormReturn<ContratoFormValues>;
  estacoes: Estacao[];
}

export const SectionEntregaRecolha: React.FC<SectionEntregaRecolhaProps> = ({ form, estacoes }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <SectionTitle>Entrega</SectionTitle>
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="estacao_entrega_id"
          render={({ field }) => (
            <EstacaoSelectField
              value={field.value}
              onChange={field.onChange}
              estacoes={estacoes}
              label="Estação Início"
            />
          )}
        />
        <FormField
          control={form.control}
          name="data_inicio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Início *</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  className="bg-background"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>

    <div>
      <SectionTitle>Recolha</SectionTitle>
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="estacao_recolha_id"
          render={({ field }) => (
            <EstacaoSelectField
              value={field.value}
              onChange={field.onChange}
              estacoes={estacoes}
              label="Estação Fim"
            />
          )}
        />
        <FormField
          control={form.control}
          name="data_fim"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Fim *</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  className="bg-background"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  </div>
);
