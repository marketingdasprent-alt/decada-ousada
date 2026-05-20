import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ContratoFormValues } from './contratoForm.schema';
import { SectionTitle } from './SectionTitle';

interface SectionRegimeProps {
  form: UseFormReturn<ContratoFormValues>;
}

/** Regime do contrato (rent-a-car vs TVDE) — primeira escolha do formulário. */
export const SectionRegime: React.FC<SectionRegimeProps> = ({ form }) => (
  <div>
    <SectionTitle>Regime do Contrato</SectionTitle>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="regime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Regime <span className="text-red-500">*</span>
            </FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="rent_a_car">Rent-a-Car</SelectItem>
                <SelectItem value="tvde">TVDE</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);
