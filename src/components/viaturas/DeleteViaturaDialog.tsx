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

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  status?: string;
}

interface DeleteViaturaDialogProps {
  viatura: Viatura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteViaturaDialog({
  viatura,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: DeleteViaturaDialogProps) {
  if (!viatura) return null;

  const isEmUso = viatura.status === 'em_uso';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Viatura</AlertDialogTitle>
          <AlertDialogDescription>
            {isEmUso ? (
              <span className="text-destructive">
                Esta viatura está atualmente em uso por um motorista. 
                Não é possível eliminar uma viatura em uso.
              </span>
            ) : (
              <>
                Tem a certeza que deseja eliminar a viatura{' '}
                <strong>{viatura.marca} {viatura.modelo}</strong> com matrícula{' '}
                <strong>{viatura.matricula}</strong>?
                <br /><br />
                Esta ação não pode ser desfeita.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          {!isEmUso && (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'A eliminar...' : 'Eliminar'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
