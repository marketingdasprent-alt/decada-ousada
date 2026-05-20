import { useEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Check, ChevronsUpDown, Coins, EyeOff, FileText } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

import { ALDFields } from '@/components/renting/shared/ALDFields';
import { FranquiaKmsFields } from '@/components/renting/shared/FranquiaKmsFields';

import type { ReservaFormValues } from '../reservaDialog.schema';
import type { ViaturaBasic } from '@/hooks/useViaturas';
import type { Estacao } from '@/hooks/useEstacoes';
import type { ClienteComDocumentos } from '@/types/cliente';
import { ESTADO_LABELS, type ReservaEstado } from '@/types/reserva';

const SENTINEL_NONE = '__none__';

const normalizeForSearch = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-\s]/g, '');

const ESTADOS_EDITAVEIS: ReservaEstado[] = ['confirmada', 'cancelada'];

interface ReservaTabGeralProps {
  form: UseFormReturn<ReservaFormValues>;
  viaturas: ViaturaBasic[];
  estacoes: Estacao[];
  clientes: ClienteComDocumentos[];
}

function diferencaDias(inicio: string, fim: string): number | null {
  if (!inicio || !fim) return null;
  const di = new Date(inicio).getTime();
  const df = new Date(fim).getTime();
  if (Number.isNaN(di) || Number.isNaN(df) || df <= di) return null;
  return Math.max(1, Math.ceil((df - di) / (1000 * 60 * 60 * 24)));
}

function addDaysToLocalInput(localInput: string, days: number): string | null {
  if (!localInput) return null;
  const d = new Date(localInput);
  if (Number.isNaN(d.getTime())) return null;
  const novo = new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${novo.getFullYear()}-${pad(novo.getMonth() + 1)}-${pad(novo.getDate())}T${pad(novo.getHours())}:${pad(novo.getMinutes())}`;
}

export const ReservaTabGeral: React.FC<ReservaTabGeralProps> = ({
  form,
  viaturas,
  estacoes,
  clientes,
}) => {
  const [viaturaPopoverOpen, setViaturaPopoverOpen] = useState(false);

  const clienteId = form.watch('cliente_id');
  const estadoAtual = form.watch('estado');
  const dataInicio = form.watch('data_inicio');
  const dataFim = form.watch('data_fim');

  const cliente = clienteId ? (clientes.find((c) => c.id === clienteId) ?? null) : null;

  const dias = useMemo(() => diferencaDias(dataInicio, dataFim), [dataInicio, dataFim]);

  // Estado local para o input — permite digitar livremente sem que o valor
  // seja sobreposto pelo derivado `dias` durante a edição.
  const [diasInput, setDiasInput] = useState<string>(dias !== null ? String(dias) : '');

  useEffect(() => {
    setDiasInput(dias !== null ? String(dias) : '');
  }, [dias]);

  const estadoExtra =
    estadoAtual && !ESTADOS_EDITAVEIS.includes(estadoAtual as ReservaEstado) ? estadoAtual : null;

  const handleDiasManualChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    setDiasInput(cleaned);
    if (cleaned === '') return;
    const n = parseInt(cleaned, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    if (!dataInicio) return;
    const novoFim = addDaysToLocalInput(dataInicio, n);
    if (novoFim) form.setValue('data_fim', novoFim, { shouldValidate: true });
  };

  return (
    <div className="space-y-8">
      {/* === Cliente da Reserva === */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2 border-b mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Cliente da Reserva</h3>
            <span className="text-red-500 text-sm">*</span>
          </div>
          <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
            Quem encomendou
          </span>
        </div>

        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Cliente</FormLabel>
              <Select
                value={field.value ?? SENTINEL_NONE}
                onValueChange={(v) => {
                  const newId = v === SENTINEL_NONE ? null : v;
                  field.onChange(newId);
                  const cli = clientes.find((c) => c.id === newId);
                  form.setValue('cliente_nome', cli?.nome ?? '');
                }}
              >
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Clique para escolher cliente..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE}>— Sem cliente —</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.codigo ? `(#${c.codigo})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {cliente && (
          <div className="mt-3 p-3 rounded-md border bg-muted/20 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{cliente.nome}</p>
            </div>
            {cliente.nif && (
              <div>
                <p className="text-xs text-muted-foreground">NIF</p>
                <p className="font-mono">{cliente.nif}</p>
              </div>
            )}
            {cliente.telefone && (
              <div>
                <p className="text-xs text-muted-foreground">Telemóvel</p>
                <p>{cliente.telefone}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === Entrega | Recolha === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b h-10">
            <h3 className="text-base font-semibold">Entrega</h3>
          </div>
          <FormField
            control={form.control}
            name="estacao_entrega_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Estação Início <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  value={field.value ?? SENTINEL_NONE}
                  onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona estação..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SENTINEL_NONE}>— Sem estação —</SelectItem>
                    {estacoes.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
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
            name="data_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Data Início <span className="text-red-500">*</span>
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
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b h-10">
            <h3 className="text-base font-semibold">Recolha</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Nº Dias</span>
              <Input
                type="text"
                inputMode="numeric"
                value={diasInput}
                onChange={(e) => handleDiasManualChange(e.target.value)}
                disabled={!dataInicio}
                className="h-9 w-16 text-center bg-background text-base font-semibold"
                placeholder="—"
                title={
                  dataInicio
                    ? 'Editar ajusta a Data Fim automaticamente'
                    : 'Define primeiro a Data Início'
                }
              />
            </div>
          </div>
          <FormField
            control={form.control}
            name="estacao_recolha_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Estação Fim <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  value={field.value ?? SENTINEL_NONE}
                  onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona estação..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SENTINEL_NONE}>— Sem estação —</SelectItem>
                    {estacoes.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
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
            name="data_fim"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Data Fim <span className="text-red-500">*</span>
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
        </div>
      </div>

      {/* === Aluguer Longa Duração + Renovação (shared) === */}
      <ALDFields idPrefix="reserva" />

      {/* === Viatura === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <h3 className="text-base font-semibold">Viatura</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="viatura_id"
            render={({ field }) => {
              const selected = field.value ? viaturas.find((x) => x.id === field.value) : null;
              return (
                <FormItem>
                  <FormLabel>
                    Viatura <span className="text-red-500">*</span>
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
                          <CommandEmpty>Nenhuma viatura encontrada.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__sem_viatura__"
                              onSelect={() => {
                                field.onChange(null);
                                form.setValue('matricula', '');
                                setViaturaPopoverOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  !field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              — Sem viatura —
                            </CommandItem>
                            {viaturas.map((v) => (
                              <CommandItem
                                key={v.id}
                                value={`${v.matricula} ${v.marca} ${v.modelo} ${v.categoria ?? ''}`}
                                onSelect={() => {
                                  field.onChange(v.id);
                                  form.setValue('matricula', v.matricula);
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
            name="grupo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grupo Viatura</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="ex.: Económico, SUV"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {estadoExtra && (
                      <SelectItem value={estadoExtra}>
                        {ESTADO_LABELS[estadoExtra as ReservaEstado]} (automático)
                      </SelectItem>
                    )}
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* === Franquia / Caução / Kms (shared) === */}
      <FranquiaKmsFields />

      {/* === Tarifa (placeholder) === */}
      <div className="rounded-lg border border-dashed bg-muted/10 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold text-muted-foreground">Tarifa</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
            em construção
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecção de grupo de tarifas, vouchers e cálculo automático ficam disponíveis em breve.
          Por agora utiliza o campo <em>Valor total</em> na tab <strong>Caixa</strong>.
        </p>
      </div>

      {/* === Observações === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <h3 className="text-base font-semibold">Observações</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Observações Públicas
                  <span className="text-xs font-normal text-muted-foreground">
                    (apresentadas no relatório)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background min-h-[120px]"
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
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <EyeOff className="h-4 w-4 text-amber-600" />
                  Observações Internas
                  <span className="text-xs font-normal text-muted-foreground">
                    (apenas uso interno)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background min-h-[120px] border-amber-500/30"
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
    </div>
  );
};
