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
import type { Reserva } from '@/types/reserva';

interface ReservaDeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: Reserva | null;
  isPending: boolean;
  onConfirm: () => void;
}

export const ReservaDeleteConfirm: React.FC<ReservaDeleteConfirmProps> = ({
  open,
  onOpenChange,
  reserva,
  isPending,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
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
