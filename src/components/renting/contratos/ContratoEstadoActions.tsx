import { useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';

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

// Entrega e devolução são feitas via fluxo QR/check-out pendente — os
// botões "Confirmar entrega"/"Marcar devolução" foram removidos para
// evitar transições directas sem fotos. Cancelar continua disponível.
type AccaoEstado = 'cancelar';

interface AccaoConfig {
  novoEstado: ContratoEstadoOperacional;
  estadosOrigem: ContratoEstadoOperacional[];
  label: string;
  Icon: typeof XCircle;
  variant: 'default' | 'destructive' | 'outline';
  dialogTitle: string;
  dialogDescription: (codigo: number) => string;
}

const ACCOES: Record<AccaoEstado, AccaoConfig> = {
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

export const ContratoEstadoActions: React.FC<ContratoEstadoActionsProps> = ({ contrato }) => {
  const [accaoAberta, setAccaoAberta] = useState<AccaoEstado | null>(null);
  const updateMutation = useUpdateContratoRenting();

  const isFacturado = contrato.estado_financeiro === 'facturado';
  const isPending = updateMutation.isPending;

  const accoesVisiveis = (Object.entries(ACCOES) as [AccaoEstado, AccaoConfig][]).filter(
    ([, cfg]) => cfg.estadosOrigem.includes(contrato.estado_operacional)
  );

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
