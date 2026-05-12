import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image, ArrowRight, ArrowLeft, PlayCircle } from 'lucide-react';
import type { Ticket, Anexo } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  anexos: Anexo[];
  onOpenLightbox: (mediaList: Anexo[], index: number) => void;
}

const MediaThumb: React.FC<{
  anexo: Anexo;
  list: Anexo[];
  onOpenLightbox: Props['onOpenLightbox'];
}> = ({ anexo, list, onOpenLightbox }) => {
  const isVideo =
    anexo.tipo_ficheiro === 'video' || !!anexo.ficheiro_url?.match(/\.(mp4|webm|mov|ogg)$/i);

  return (
    <div
      className="group relative aspect-square rounded-lg border overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
      onClick={() => onOpenLightbox(list, list.indexOf(anexo))}
    >
      {isVideo ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <PlayCircle className="h-10 w-10 text-white/70" />
        </div>
      ) : (
        <img src={anexo.ficheiro_url} className="w-full h-full object-cover" alt="" />
      )}
      {anexo.legenda && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] p-1 truncate">
          {anexo.legenda}
        </div>
      )}
    </div>
  );
};

export const TicketGalleryDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  ticket,
  anexos,
  onOpenLightbox,
}) => {
  const checkin = anexos.filter(
    (a) => !a.tipo_inspecao || a.tipo_inspecao === 'checkin' || a.tipo_inspecao === 'entrada'
  );
  const checkout = anexos.filter(
    (a) => a.tipo_inspecao === 'checkout' || a.tipo_inspecao === 'saida'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Galeria de Multimédia — Ticket #{String(ticket.numero).padStart(4, '0')}
          </DialogTitle>
          <DialogDescription>
            Visualize todas as fotos e vídeos registados nesta assistência.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-8 p-1">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2 border-b pb-2">
                <ArrowRight className="h-4 w-4 text-blue-500" /> Check-in de Entrada
              </h3>
              {checkin.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Nenhuma média de entrada registada.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {checkin.map((a) => (
                    <MediaThumb
                      key={a.id}
                      anexo={a}
                      list={checkin}
                      onOpenLightbox={onOpenLightbox}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2 border-b pb-2">
                <ArrowLeft className="h-4 w-4 text-green-500" /> Check-out de Saída
              </h3>
              {checkout.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Nenhuma média de saída registada.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {checkout.map((a) => (
                    <MediaThumb
                      key={a.id}
                      anexo={a}
                      list={checkout}
                      onOpenLightbox={onOpenLightbox}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
