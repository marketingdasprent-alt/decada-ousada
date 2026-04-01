import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MotoristaDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: any | null;
  onSuccess: () => void;
}

export function MotoristaDeleteDialog({
  open,
  onOpenChange,
  motorista,
  onSuccess,
}: MotoristaDeleteDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!motorista) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("motoristas_ativos")
        .delete()
        .eq("id", motorista.id);

      if (error) throw error;

      toast({
        title: "Motorista deletado",
        description: "O motorista foi removido com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O motorista{" "}
            <strong>{motorista?.nome}</strong> será permanentemente removido do
            sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deletando..." : "Deletar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
