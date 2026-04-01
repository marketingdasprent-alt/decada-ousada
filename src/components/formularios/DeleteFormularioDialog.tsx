
import React from 'react';
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

interface DeleteFormularioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formularioNome: string;
}

export const DeleteFormularioDialog: React.FC<DeleteFormularioDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  formularioNome
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-gray-900 border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Excluir Formulário
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Tem certeza que deseja excluir o formulário "{formularioNome}"? 
            Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
