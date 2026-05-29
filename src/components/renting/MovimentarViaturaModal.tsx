import { useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCriarMovimentacao } from '@/hooks/useMovimentacoes';
import type { Estacao } from '@/hooks/useEstacoes';

interface MovimentarViaturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viatura: { id: string; matricula: string; estacao_id: string | null } | null;
  estacoes: Estacao[];
  /** Estação destino sugerida (pré-selecionada — ex.: estação de início da reserva). */
  estacaoDestinoSugerida?: string | null;
  onMovimentada?: () => void;
}

/** Modal para mover uma viatura de uma estação para outra. */
export const MovimentarViaturaModal: React.FC<MovimentarViaturaModalProps> = ({
  open,
  onOpenChange,
  viatura,
  estacoes,
  estacaoDestinoSugerida,
  onMovimentada,
}) => {
  const criar = useCriarMovimentacao();
  const [destino, setDestino] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open) {
      setDestino(estacaoDestinoSugerida ?? '');
      setObservacoes('');
    }
  }, [open, estacaoDestinoSugerida]);

  const estacaoAtual = viatura?.estacao_id
    ? (estacoes.find((e) => e.id === viatura.estacao_id) ?? null)
    : null;

  const handleConfirmar = () => {
    if (!viatura || !destino) return;
    criar.mutate(
      { viatura_id: viatura.id, estacao_destino_id: destino, observacoes },
      {
        onSuccess: () => {
          onOpenChange(false);
          onMovimentada?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Movimentar Viatura
          </DialogTitle>
          <DialogDescription>
            {viatura ? `Viatura ${viatura.matricula}` : 'Sem viatura selecionada'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            <span className="text-muted-foreground">Estação atual: </span>
            <strong>{estacaoAtual?.nome ?? 'Sem estação definida'}</strong>
          </div>

          <div className="space-y-2">
            <Label>
              Estação de destino <span className="text-red-500">*</span>
            </Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Escolhe a estação..." />
              </SelectTrigger>
              <SelectContent>
                {estacoes
                  .filter((e) => e.id !== viatura?.estacao_id)
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo da movimentação (opcional)..."
              className="min-h-[80px] bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={!viatura || !destino || criar.isPending}
            className="gap-2"
          >
            {criar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Movimentar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
