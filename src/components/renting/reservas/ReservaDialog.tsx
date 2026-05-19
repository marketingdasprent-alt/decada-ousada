import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, FileText, Loader2, Trash2 } from 'lucide-react';

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
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

import type { Reserva, ReservaInsert } from '@/types/reserva';
import {
  isoToLocalInput,
  localInputToIso,
  reservaDialogSchema,
  type ReservaFormValues,
} from './reservaDialog.schema';
import { ReservaFormFields } from './ReservaFormFields';
import { ReservaDeleteConfirm } from './ReservaDeleteConfirm';

interface ReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reserva existente (modo edição). Omitir para criar nova. */
  reserva?: Reserva | null;
}

const DEFAULT_VALUES: ReservaFormValues = {
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
};

export const ReservaDialog: React.FC<ReservaDialogProps> = ({
  open,
  onOpenChange,
  reserva = null,
}) => {
  const isEdit = !!reserva;
  const navigate = useNavigate();

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
    defaultValues: DEFAULT_VALUES,
  });

  // Reset do formulário quando abrir/mudar reserva
  useEffect(() => {
    if (!open) return;
    form.reset(
      reserva
        ? {
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
          }
        : DEFAULT_VALUES
    );
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
              <ReservaFormFields
                form={form}
                clientes={clientes}
                viaturas={viaturas}
                estacoes={estacoes}
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
                {isEdit &&
                  reserva &&
                  reserva.cliente_id &&
                  reserva.viatura_id &&
                  (reserva.estado === 'confirmada' || reserva.estado === 'em_curso') && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/renting/contratos/novo?reserva_id=${reserva.id}`);
                      }}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Criar Contrato
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

      <ReservaDeleteConfirm
        open={confirmDeleteOpen}
        onOpenChange={handleConfirmDeleteOpenChange}
        reserva={reserva}
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
};
