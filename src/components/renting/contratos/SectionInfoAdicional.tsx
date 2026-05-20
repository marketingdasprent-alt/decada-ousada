import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { EyeOff, FileText } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { ContratoFormValues } from './contratoForm.schema';
import { SectionTitle } from './SectionTitle';

interface SectionInfoAdicionalProps {
  form: UseFormReturn<ContratoFormValues>;
}

export const SectionInfoAdicional: React.FC<SectionInfoAdicionalProps> = ({ form }) => (
  <div>
    <SectionTitle>Informação Adicional</SectionTitle>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="numero_processo"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Nº Processo / Referência</FormLabel>
            <FormControl>
              <Input className="bg-background" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="voo_referencia"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Referência de Voo</FormLabel>
            <FormControl>
              <Input
                className="bg-background"
                {...field}
                value={field.value ?? ''}
                placeholder="ex.: TP1234 chegada / TP5678 partida"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="local_entrega"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Local Entrega</FormLabel>
            <FormControl>
              <Input
                className="bg-background"
                {...field}
                value={field.value ?? ''}
                placeholder="ex.: Hotel XYZ"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="local_recolha"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Local Recolha</FormLabel>
            <FormControl>
              <Input className="bg-background" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="comentarios_entrega"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comentários Entrega</FormLabel>
            <FormControl>
              <Textarea
                className="bg-background min-h-[80px]"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="comentarios_recolha"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comentários Recolha</FormLabel>
            <FormControl>
              <Textarea
                className="bg-background min-h-[80px]"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="observacoes"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-600" />
              Observações Públicas
              <span className="text-xs font-normal text-muted-foreground">
                (apresentadas no relatório)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                className="bg-background min-h-[80px]"
                placeholder="Visível ao cliente no contrato e relatórios..."
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="observacoes_internas"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel className="flex items-center gap-1.5">
              <EyeOff className="h-4 w-4 text-amber-600" />
              Observações Internas
              <span className="text-xs font-normal text-muted-foreground">
                (apenas uso interno)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                className="bg-background min-h-[80px] border-amber-500/30"
                placeholder="Notas internas — não aparecem em documentos do cliente..."
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
);
