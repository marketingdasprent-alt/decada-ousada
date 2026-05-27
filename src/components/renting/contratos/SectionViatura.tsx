import type React from 'react';
import { Lock } from 'lucide-react';
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
  /**
   * Quando true, o campo viatura fica readonly. Usado em contratos
   * vindos de reserva — a viatura é fixada pela reserva e mudar exige
   * editar a reserva primeiro (preserva o EXCLUDE anti-overbooking).
   */
  viaturaLocked?: boolean;
  reservaCodigo?: number | null;
}

export const SectionViatura: React.FC<SectionViaturaProps> = ({
  form,
  viaturas,
  estacoes,
  viaturaLocked = false,
  reservaCodigo,
}) => (
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
            <FormLabel className="flex items-center gap-1.5">
              Viatura <span className="text-red-500">*</span>
              {viaturaLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </FormLabel>
            <Select
              value={field.value || SENTINEL_NONE}
              disabled={viaturaLocked}
              onValueChange={(v) => {
                const newId = v === SENTINEL_NONE ? '' : v;
                field.onChange(newId);
                const via = viaturas.find((x) => x.id === newId);
                if (via) form.setValue('matricula', via.matricula);
              }}
            >
              <FormControl>
                <SelectTrigger
                  className={viaturaLocked ? 'bg-muted/50 cursor-not-allowed' : 'bg-background'}
                >
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
            {viaturaLocked && (
              <p className="text-xs text-muted-foreground">
                Esta viatura vem da reserva
                {reservaCodigo ? ` #${reservaCodigo}` : ''}. Para alterar, edita primeiro a reserva
                — assim a disponibilidade fica consistente.
              </p>
            )}
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
