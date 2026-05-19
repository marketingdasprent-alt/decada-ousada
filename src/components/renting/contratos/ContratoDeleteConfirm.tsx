import { Loader2 } from 'lucide-react';

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
import type { ContratoRenting } from '@/types/contratoRenting';

interface ContratoDeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoRenting | null;
  isPending: boolean;
  onConfirm: () => void;
}

export const ContratoDeleteConfirm: React.FC<ContratoDeleteConfirmProps> = ({
  open,
  onOpenChange,
  contrato,
  isPending,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Eliminar contrato?</AlertDialogTitle>
        <AlertDialogDescription>
          O contrato <strong>#{contrato?.codigo}</strong> será removido da lista. A reserva
          associada não é afectada. Para recuperar, contacta o administrador técnico.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            onConfirm();
          }}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Eliminar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
