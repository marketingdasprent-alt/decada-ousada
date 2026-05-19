import { Paperclip } from 'lucide-react';

interface ReservaTabAnexosProps {
  reservaId: string | null;
}

export const ReservaTabAnexos: React.FC<ReservaTabAnexosProps> = ({ reservaId }) => {
  if (!reservaId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Paperclip className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Guarda a reserva primeiro para poderes adicionar anexos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Paperclip className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm font-medium">Anexos de reserva</p>
      <p className="text-xs text-muted-foreground max-w-sm">
        Funcionalidade em desenvolvimento. Brevemente vais poder anexar ficheiros (PDFs, fotos,
        contratos digitalizados) directamente à reserva.
      </p>
    </div>
  );
};
