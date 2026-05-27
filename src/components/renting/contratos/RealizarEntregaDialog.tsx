import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, CheckCircle2, Clock, Loader2, Smartphone } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { useGerarTokenRealizacao, usePollEventoRealizado } from '@/hooks/useRealizacaoToken';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Evento de entrega/recolha a realizar — null fecha o dialog. */
  eventoId: string | null;
  tipo: 'entrega' | 'recolha';
  /** Resumo para mostrar no header (matrícula, contrato#). */
  resumo?: string;
  /** Após confirmação no telemóvel, chamado para limpar estado. */
  onDone?: () => void;
}

/**
 * Dialog mandatório: ao abrir um contrato com entrega/recolha por
 * realizar, o user tem de escolher entre:
 *   • Realizar agora — gera QR para o telemóvel (fotos + KM no terreno)
 *   • Deixar pendente — outro colaborador apanha via Check Out drawer
 */
export const RealizarEntregaDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  eventoId,
  tipo,
  resumo,
  onDone,
}) => {
  const [tokenId, setTokenId] = useState<string | null>(null);
  const gerarToken = useGerarTokenRealizacao();
  const realizado = usePollEventoRealizado(eventoId, !!tokenId);

  useEffect(() => {
    if (!open) setTokenId(null);
  }, [open]);

  const url = useMemo(
    () => (tokenId ? `${window.location.origin}/realizar/${tokenId}` : null),
    [tokenId]
  );

  const handleRealizarAgora = () => {
    if (!eventoId) return;
    gerarToken.mutate(eventoId, {
      onSuccess: (id) => setTokenId(id),
    });
  };

  // Telemóvel confirmou: fecha automaticamente após 1.2s
  useEffect(() => {
    if (realizado && tokenId) {
      const t = setTimeout(() => {
        onOpenChange(false);
        onDone?.();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [realizado, tokenId, onOpenChange, onDone]);

  // Determina o que mostrar
  const showInitial = !tokenId && !realizado;
  const showQR = !!tokenId && !realizado;
  const showRealizado = !!realizado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        // Bloqueia dismiss casual — utilizador tem que escolher um dos caminhos.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {tipo === 'entrega' ? 'Entrega' : 'Recolha'} pendente
          </DialogTitle>
          <DialogDescription>
            {resumo ?? ''}
            {resumo ? ' · ' : ''}
            Como queres realizar esta {tipo}? Escolhe se vais fazer agora (com fotos via telemóvel)
            ou se deixas pendente para outro colaborador fazer.
          </DialogDescription>
        </DialogHeader>

        {showRealizado && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-12 w-12" />
            <p className="font-semibold">{tipo === 'entrega' ? 'Entrega' : 'Recolha'} confirmada</p>
            <p className="text-xs text-muted-foreground">A fechar...</p>
          </div>
        )}

        {showQR && url && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="bg-white p-4 rounded-lg border">
              <QRCodeSVG value={url} size={220} level="M" />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Expira em 30 minutos
            </p>
            <p className="text-xs text-center text-muted-foreground break-all px-4">
              Ou abre directamente:{' '}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{url}</code>
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />À espera da confirmação no telemóvel...
            </div>
          </div>
        )}

        {showInitial && (
          <div className="py-2 space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Realizar agora:</strong> abre um QR code que,
              escaneado pelo telemóvel, leva-te à página de check-out — tiras fotos da viatura,
              preenches km/combustível e confirmas.
            </p>
            <p>
              <strong className="text-foreground">Deixar pendente:</strong> o evento fica na lista
              de pendentes (Check Out / Check In no calendário) para qualquer colaborador da org
              realizar mais tarde.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          {showRealizado ? (
            <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          ) : showQR ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setTokenId(null)}
              className="gap-2 w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Deixar pendente
              </Button>
              <Button
                type="button"
                onClick={handleRealizarAgora}
                disabled={gerarToken.isPending || !eventoId}
                className="gap-2 w-full sm:w-auto"
              >
                {gerarToken.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Smartphone className="h-4 w-4" />
                Realizar agora (telemóvel)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
