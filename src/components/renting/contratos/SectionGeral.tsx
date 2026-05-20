import type React from 'react';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Check, ChevronsUpDown } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

import type { ClienteComDocumentos } from '@/types/cliente';
import type { Cobertura } from '@/types/cobertura';
import type { ContratoFormValues } from './contratoForm.schema';
import { SectionTitle } from './SectionTitle';
import {
  SENTINEL_NONE,
  ORIGEM_OPTIONS,
  ESTADO_OP_OPTIONS,
  ESTADO_FIN_OPTIONS,
  DEFAULT_IVA_PERCENTAGE,
} from './contratoFormConstants';

interface SectionGeralProps {
  form: UseFormReturn<ContratoFormValues>;
  clientes: ClienteComDocumentos[];
  coberturas: Cobertura[];
}

const normalizeForSearch = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-\s]/g, '');

export const SectionGeral: React.FC<SectionGeralProps> = ({ form, clientes, coberturas }) => {
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  return (
  <div>
    <SectionTitle>Geral</SectionTitle>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="cliente_id"
        render={({ field }) => {
          const selected = field.value
            ? (clientes.find((c) => c.id === field.value) ?? null)
            : null;
          return (
            <FormItem>
              <FormLabel>
                Cliente <span className="text-red-500">*</span>
              </FormLabel>
              <Popover
                open={clientePopoverOpen}
                onOpenChange={setClientePopoverOpen}
                modal={false}
              >
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientePopoverOpen}
                      className="w-full justify-between font-normal bg-background"
                    >
                      {selected
                        ? `${selected.nome}${selected.codigo ? ` (#${selected.codigo})` : ''}`
                        : 'Clique ou escreva para procurar cliente...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command
                    filter={(value, search) => {
                      const v = normalizeForSearch(value);
                      const s = normalizeForSearch(search);
                      return s === '' || v.includes(s) ? 1 : 0;
                    }}
                  >
                    <CommandInput placeholder="Pesquisar por nome, NIF..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clientes.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.nome} ${c.nif ?? ''} ${c.codigo ?? ''}`}
                            onSelect={() => {
                              field.onChange(c.id);
                              setClientePopoverOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === c.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {c.nome}
                            {c.codigo && (
                              <span className="ml-1 text-muted-foreground">(#{c.codigo})</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="origem"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Origem</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ORIGEM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
        name="estado_operacional"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estado Operacional</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ESTADO_OP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
        name="estado_financeiro"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estado Financeiro</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ESTADO_FIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
        name="tarifa_diaria"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tarifa diária (€)</FormLabel>
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
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="valor_total_manual"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Valor total manual (€)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="bg-background"
                placeholder="Opcional — sobrepõe cálculo"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="desconto_percentagem"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Desconto (%)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="bg-background"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="taxa_iva"
        render={({ field }) => (
          <FormItem>
            <FormLabel>IVA (%)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="bg-background"
                value={field.value ?? DEFAULT_IVA_PERCENTAGE}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="cobertura_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cobertura</FormLabel>
            <Select
              value={field.value || SENTINEL_NONE}
              onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? null : v)}
            >
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sem cobertura" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={SENTINEL_NONE}>— Sem cobertura —</SelectItem>
                {coberturas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                    {c.valor_diario != null ? ` (${c.valor_diario.toFixed(2)} €/dia)` : ''}
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
        name="voucher_codigo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Voucher</FormLabel>
            <FormControl>
              <Input
                className="bg-background"
                {...field}
                value={field.value ?? ''}
                placeholder="Código promocional"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
  );
};
