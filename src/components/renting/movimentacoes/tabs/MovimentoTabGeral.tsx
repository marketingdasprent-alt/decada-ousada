import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Check, ChevronsUpDown } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { MovimentoFormValues } from '../movimentoForm.schema';
import { MovimentoTipoSelector } from '../MovimentoTipoSelector';
import type { ViaturaBasic } from '@/hooks/useViaturas';
import type { Colaborador } from '@/types/movimento';
import { MOVIMENTO_ESTADO_LABELS, MOVIMENTO_ESTADOS } from '@/types/movimento';

const SENTINEL_NONE = '__none__';

const normalizeForSearch = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-\s]/g, '');

interface MovimentoTabGeralProps {
  form: UseFormReturn<MovimentoFormValues>;
  viaturas: ViaturaBasic[];
  colaboradores: Colaborador[];
}

export const MovimentoTabGeral: React.FC<MovimentoTabGeralProps> = ({
  form,
  viaturas,
  colaboradores,
}) => {
  const [viaturaPopoverOpen, setViaturaPopoverOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* === Tipo de Movimento === */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b mb-4">
          <h3 className="text-base font-semibold">Tipo de Movimento</h3>
        </div>
        <MovimentoTipoSelector />
      </div>

      {/* === Viatura + Estado === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <h3 className="text-base font-semibold">Viatura</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="viatura_id"
            render={({ field }) => {
              const selected = field.value ? viaturas.find((x) => x.id === field.value) : null;
              return (
                <FormItem>
                  <FormLabel>
                    Viatura <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover
                    open={viaturaPopoverOpen}
                    onOpenChange={setViaturaPopoverOpen}
                    modal={false}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={viaturaPopoverOpen}
                          className="w-full justify-between font-normal bg-background"
                        >
                          {selected
                            ? `${selected.matricula} — ${selected.marca} ${selected.modelo}`
                            : 'Pesquisa por matrícula...'}
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
                        <CommandInput placeholder="Pesquisar por matrícula..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>Nenhuma viatura disponível.</CommandEmpty>
                          <CommandGroup>
                            {viaturas.map((v) => (
                              <CommandItem
                                key={v.id}
                                value={`${v.matricula} ${v.marca} ${v.modelo} ${v.categoria ?? ''}`}
                                onSelect={() => {
                                  field.onChange(v.id);
                                  form.setValue('matricula', v.matricula);
                                  // Pré-preenche o KM inicial com o KM atual da viatura.
                                  if (
                                    v.km_atual != null &&
                                    (form.getValues('km_inicial') == null ||
                                      form.getValues('km_inicial') === undefined)
                                  ) {
                                    form.setValue('km_inicial', v.km_atual);
                                  }
                                  setViaturaPopoverOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === v.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {v.matricula} — {v.marca} {v.modelo}
                                {v.categoria && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({v.categoria})
                                  </span>
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
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado do Movimento</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MOVIMENTO_ESTADOS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {MOVIMENTO_ESTADO_LABELS[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* === Datas & Responsável === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <h3 className="text-base font-semibold">Datas & Responsável</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="data_partida"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Data Partida <span className="text-destructive">*</span>
                </FormLabel>
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
          <FormField
            control={form.control}
            name="data_chegada"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Chegada / Conclusão</FormLabel>
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
          <FormField
            control={form.control}
            name="colaborador_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colaborador Responsável</FormLabel>
                <Select
                  value={field.value ?? SENTINEL_NONE}
                  onValueChange={(v) => {
                    const newId = v === SENTINEL_NONE ? null : v;
                    field.onChange(newId);
                    const col = colaboradores.find((c) => c.id === newId);
                    form.setValue('colaborador_nome', col?.nome ?? '');
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Escolher colaborador..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SENTINEL_NONE}>— Sem responsável —</SelectItem>
                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Info Resumida</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  placeholder="ex.: aguarda peças, perca total - sinistro, IPO anual..."
                  maxLength={255}
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
};
