import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useClientes } from '@/hooks/useClientes';
import { useViaturas } from '@/hooks/useViaturas';
import { useEstacoes } from '@/hooks/useEstacoes';
import {
  useCreateReserva,
  useUpdateReserva,
  useDeleteReserva,
  useReservaConflito,
} from '@/hooks/useReservas';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Reserva, ReservaInsert } from '@/types/reserva';
import {
  isoToLocalInput,
  localInputToIso,
  reservaDialogSchema,
  type ReservaFormValues,
} from './reservaDialog.schema';

interface ReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reserva existente (modo edição). Omitir para criar nova. */
  reserva?: Reserva | null;
}

const SENTINEL_NONE = '__none__';

export const ReservaDialog: React.FC<ReservaDialogProps> = ({
  open,
  onOpenChange,
  reserva = null,
}) => {
  const isEdit = !!reserva;

  const { data: clientes = [] } = useClientes();
  const { data: viaturas = [] } = useViaturas();
  const { data: estacoes = [] } = useEstacoes({ apenasAtivas: false });

  const createMutation = useCreateReserva();
  const updateMutation = useUpdateReserva();
  const deleteMutation = useDeleteReserva();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ReservaFormValues>({
    resolver: zodResolver(reservaDialogSchema),
    defaultValues: {
      viatura_id: null,
      matricula: '',
      grupo: '',
      estacao_entrega_id: null,
      estacao_recolha_id: null,
      data_inicio: '',
      data_fim: '',
      cliente_id: null,
      cliente_nome: '',
      condutor_id: null,
      condutor_nome: '',
      estado: 'pendente',
      valor_total: null,
      observacoes: '',
    },
  });

  // Reset do formulário quando abrir/mudar reserva
  useEffect(() => {
    if (!open) return;
    if (reserva) {
      form.reset({
        viatura_id: reserva.viatura_id,
        matricula: reserva.matricula ?? '',
        grupo: reserva.grupo ?? '',
        estacao_entrega_id: reserva.estacao_entrega_id,
        estacao_recolha_id: reserva.estacao_recolha_id,
        data_inicio: isoToLocalInput(reserva.data_inicio),
        data_fim: isoToLocalInput(reserva.data_fim),
        cliente_id: reserva.cliente_id,
        cliente_nome: reserva.cliente_nome ?? '',
        condutor_id: reserva.condutor_id,
        condutor_nome: reserva.condutor_nome ?? '',
        estado: reserva.estado,
        valor_total: reserva.valor_total,
        observacoes: reserva.observacoes ?? '',
      });
    } else {
      form.reset({
        viatura_id: null,
        matricula: '',
        grupo: '',
        estacao_entrega_id: null,
        estacao_recolha_id: null,
        data_inicio: '',
        data_fim: '',
        cliente_id: null,
        cliente_nome: '',
        condutor_id: null,
        condutor_nome: '',
        estado: 'pendente',
        valor_total: null,
        observacoes: '',
      });
    }
  }, [open, reserva, form]);

  // Pré-check de conflito — só UX. Gate real é o EXCLUDE na BD.
  const viaturaId = form.watch('viatura_id');
  const dataInicio = form.watch('data_inicio');
  const dataFim = form.watch('data_fim');

  const conflitoArgs = useMemo(() => {
    const di = dataInicio ? new Date(dataInicio) : null;
    const df = dataFim ? new Date(dataFim) : null;
    return {
      viaturaId: viaturaId ?? null,
      dataInicio: di && !Number.isNaN(di.getTime()) ? di : null,
      dataFim: df && !Number.isNaN(df.getTime()) ? df : null,
      excluirId: reserva?.id ?? null,
    };
  }, [viaturaId, dataInicio, dataFim, reserva?.id]);

  const { data: temConflito } = useReservaConflito(conflitoArgs);

  const onSubmit = (values: ReservaFormValues) => {
    // Snapshot de matrícula a partir da viatura escolhida, se não foi preenchida manualmente
    const viaturaSelecionada = viaturas.find((v) => v.id === values.viatura_id);
    const matriculaFinal = values.matricula || viaturaSelecionada?.matricula || null;

    const payload: ReservaInsert = {
      viatura_id: values.viatura_id || null,
      matricula: matriculaFinal,
      grupo: values.grupo || null,
      estacao_entrega_id: values.estacao_entrega_id || null,
      estacao_recolha_id: values.estacao_recolha_id || null,
      data_inicio: localInputToIso(values.data_inicio),
      data_fim: localInputToIso(values.data_fim),
      cliente_id: values.cliente_id || null,
      cliente_nome: values.cliente_nome || null,
      condutor_id: values.condutor_id || null,
      condutor_nome: values.condutor_nome || null,
      estado: values.estado,
      valor_total: values.valor_total,
      observacoes: values.observacoes || null,
    };

    if (isEdit && reserva) {
      updateMutation.mutate(
        { id: reserva.id, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const handleDelete = () => {
    if (!reserva) return;
    // Fecha o Dialog de edição antes de abrir o AlertDialog,
    // para evitar conflito de overlays/focus trap do Radix.
    onOpenChange(false);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!reserva) return;
    deleteMutation.mutate(reserva.id, {
      onSuccess: () => setConfirmDeleteOpen(false),
    });
  };

  // Se o AlertDialog fechar sem ter eliminado, reabrir o Dialog de edição.
  const handleConfirmDeleteOpenChange = (next: boolean) => {
    setConfirmDeleteOpen(next);
    if (!next && !deleteMutation.isSuccess) {
      onOpenChange(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isEdit ? `Editar reserva #${reserva?.codigo}` : 'Criar Reserva'}
            </DialogTitle>
            <DialogDescription>
              Preenche os campos da reserva. A confirmação verifica conflitos de disponibilidade.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select
                        value={field.value ?? SENTINEL_NONE}
                        onValueChange={(v) => {
                          const newId = v === SENTINEL_NONE ? null : v;
                          field.onChange(newId);
                          // snapshot do nome para histórico
                          const cli = clientes.find((c) => c.id === newId);
                          if (cli) form.setValue('cliente_nome', cli.nome);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sem cliente" />
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

                <FormField
                  control={form.control}
                  name="viatura_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Viatura</FormLabel>
                      <Select
                        value={field.value ?? SENTINEL_NONE}
                        onValueChange={(v) => {
                          const newId = v === SENTINEL_NONE ? null : v;
                          field.onChange(newId);
                          const via = viaturas.find((x) => x.id === newId);
                          if (via) form.setValue('matricula', via.matricula);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sem viatura atribuída" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={SENTINEL_NONE}>— Sem viatura —</SelectItem>
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
                  name="data_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data início</FormLabel>
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
                  name="data_fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data fim</FormLabel>
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
                  name="estacao_entrega_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estação entrega</FormLabel>
                      <Select
                        value={field.value ?? SENTINEL_NONE}
                        onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? null : v)}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sem estação" />
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
                  name="estacao_recolha_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estação recolha</FormLabel>
                      <Select
                        value={field.value ?? SENTINEL_NONE}
                        onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? null : v)}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sem estação" />
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
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="confirmada">Confirmada</SelectItem>
                          <SelectItem value="em_curso">Em Curso</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                          <SelectItem value="expirada">Expirada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor total (€)</FormLabel>
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
                  name="grupo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo</FormLabel>
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
                  name="condutor_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condutor (nome)</FormLabel>
                      <FormControl>
                        <Input className="bg-background" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
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

              {temConflito && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Conflito de datas — esta viatura já tem outra reserva activa que se sobrepõe a
                    este período. Guardar irá falhar.
                  </p>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                {isEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="mr-auto"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="ml-1">Eliminar</span>
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {isEdit ? 'Guardar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={handleConfirmDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              A reserva <strong>#{reserva?.codigo}</strong>
              {reserva?.cliente_nome ? (
                <>
                  {' '}
                  de <strong>{reserva.cliente_nome}</strong>
                </>
              ) : null}{' '}
              será removida da lista. Para recuperar, contacta o administrador técnico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
