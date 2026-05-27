import { useState } from 'react';
import { CheckCircle2, Loader2, PackageCheck, XCircle } from 'lucide-react';

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
import { Button } from '@/components/ui/button';
import { useUpdateContratoRenting } from '@/hooks/useContratosRenting';
import type { ContratoEstadoOperacional, ContratoRenting } from '@/types/contratoRenting';

type AccaoEstado = 'entrega' | 'devolucao' | 'cancelar';

interface AccaoConfig {
  /** Estado para o qual transitar */
  novoEstado: ContratoEstadoOperacional;
  /** Estados a partir dos quais a acção é válida */
  estadosOrigem: ContratoEstadoOperacional[];
  label: string;
  Icon: typeof CheckCircle2;
  variant: 'default' | 'destructive' | 'outline';
  dialogTitle: string;
  dialogDescription: (codigo: number) => string;
}

const ACCOES: Record<AccaoEstado, AccaoConfig> = {
  entrega: {
    novoEstado: 'em_curso',
    estadosOrigem: ['agendado'],
    label: 'Confirmar entrega',
    Icon: PackageCheck,
    variant: 'default',
    dialogTitle: 'Confirmar entrega ao cliente?',
    dialogDescription: (codigo) =>
      `O contrato #${codigo} passa a "em curso" — a viatura fica em uso e a reserva associada já está activa. Esta transição deve corresponder à entrega física da viatura.`,
  },
  devolucao: {
    novoEstado: 'devolvido',
    estadosOrigem: ['em_curso'],
    label: 'Marcar devolução',
    Icon: CheckCircle2,
    variant: 'default',
    dialogTitle: 'Marcar contrato como devolvido?',
    dialogDescription: (codigo) =>
      `O contrato #${codigo} passa a "devolvido". A reserva é concluída, a viatura volta a disponibilidade (se nada mais a ocupar) e os eventos no calendário são limpos.`,
  },
  cancelar: {
    novoEstado: 'cancelado',
    estadosOrigem: ['agendado', 'em_curso'],
    label: 'Cancelar contrato',
    Icon: XCircle,
    variant: 'destructive',
    dialogTitle: 'Cancelar este contrato?',
    dialogDescription: (codigo) =>
      `O contrato #${codigo} passa a "cancelado". Se estava agendado, a reserva volta a "confirmada" (continua válida). Se estava em curso, a reserva também é cancelada. Os eventos derivados no calendário são apagados.`,
  },
};

interface ContratoEstadoActionsProps {
  contrato: ContratoRenting;
}

/**
 * Botões de transição de estado_operacional do contrato. Cada acção
 * tem confirmação por AlertDialog e dispara mutation com cascata via
 * triggers SQL (reserva, viatura, eventos do calendário).
 */
export const ContratoEstadoActions: React.FC<ContratoEstadoActionsProps> = ({ contrato }) => {
  const [accaoAberta, setAccaoAberta] = useState<AccaoEstado | null>(null);
  const updateMutation = useUpdateContratoRenting();

  const isFacturado = contrato.estado_financeiro === 'facturado';
  const isPending = updateMutation.isPending;

  const accoesVisiveis = (Object.entries(ACCOES) as [AccaoEstado, AccaoConfig][]).filter(
    ([, cfg]) => cfg.estadosOrigem.includes(contrato.estado_operacional)
  );

  // Contrato facturado é imutável (SAF-T) — esconder todas as acções.
  if (isFacturado) return null;
  if (accoesVisiveis.length === 0) return null;

  const confirmar = () => {
    if (!accaoAberta) return;
    const cfg = ACCOES[accaoAberta];
    updateMutation.mutate(
      { id: contrato.id, estado_operacional: cfg.novoEstado },
      { onSuccess: () => setAccaoAberta(null) }
    );
  };

  const accaoActiva = accaoAberta ? ACCOES[accaoAberta] : null;

  return (
    <>
      {accoesVisiveis.map(([key, cfg]) => {
        const Icon = cfg.Icon;
        return (
          <Button
            key={key}
            type="button"
            variant={cfg.variant}
            onClick={() => setAccaoAberta(key)}
            disabled={isPending}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {cfg.label}
          </Button>
        );
      })}

      <AlertDialog open={!!accaoAberta} onOpenChange={(open) => !open && setAccaoAberta(null)}>
        <AlertDialogContent>
          {accaoActiva && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{accaoActiva.dialogTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {accaoActiva.dialogDescription(contrato.codigo)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  className={
                    accaoActiva.variant === 'destructive'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : undefined
                  }
                  disabled={isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    confirmar();
                  }}
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
