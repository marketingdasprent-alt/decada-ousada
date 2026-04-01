import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campanha: any;
}

const EnvioDetalhes = ({ envioId }: { envioId: string }) => {
  const { data: detalhes, isLoading } = useQuery({
    queryKey: ['marketing-envio-detalhes', envioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_envio_detalhes' as any)
        .select('*')
        .eq('envio_id', envioId)
        .order('status', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detalhes?.length) {
    return <p className="text-sm text-muted-foreground py-2 px-4">Sem detalhes disponíveis para este envio.</p>;
  }

  const erros = detalhes.filter((d: any) => d.status === 'erro');
  const enviados = detalhes.filter((d: any) => d.status === 'enviado');

  return (
    <div className="space-y-3 px-2 py-2">
      {erros.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-destructive flex items-center gap-1 mb-2">
            <AlertCircle className="h-4 w-4" /> Erros ({erros.length})
          </h4>
          <div className="space-y-1">
            {erros.map((d: any) => (
              <div key={d.id} className="text-sm border border-destructive/20 rounded-md p-2 bg-destructive/5">
                <div className="font-medium">{d.contacto_nome || '—'} &lt;{d.contacto_email}&gt;</div>
                {d.erro_mensagem && (
                  <p className="text-xs text-muted-foreground mt-1 break-all">{d.erro_mensagem}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {enviados.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1 cursor-pointer hover:underline">
            <CheckCircle2 className="h-4 w-4" /> Enviados com sucesso ({enviados.length})
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-2">
              {enviados.map((d: any) => (
                <div key={d.id} className="text-sm text-muted-foreground px-2">
                  {d.contacto_nome || '—'} &lt;{d.contacto_email}&gt;
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

const HistoricoEnviosDialog = ({ open, onOpenChange, campanha }: Props) => {
  const [expandedEnvio, setExpandedEnvio] = useState<string | null>(null);

  const { data: envios, isLoading } = useQuery({
    queryKey: ['marketing-envios', campanha?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_envios')
        .select('*, marketing_listas(nome), marketing_assinaturas(nome)')
        .eq('campanha_id', campanha.id)
        .order('enviado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!campanha?.id,
  });

  const toggleExpand = (envioId: string) => {
    setExpandedEnvio(prev => prev === envioId ? null : envioId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Envios</DialogTitle>
          <DialogDescription>
            Campanha: <strong>{campanha?.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !envios?.length ? (
          <p className="text-center text-muted-foreground py-8">Nenhum envio registado.</p>
        ) : (
          <div className="space-y-2">
            {envios.map((e: any) => (
              <div key={e.id} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(e.id)}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {expandedEnvio === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">
                      {format(new Date(e.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                    </span>
                    <span className="text-muted-foreground">
                      {(e.marketing_listas as any)?.nome || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                      {e.total_enviados} ✓
                    </Badge>
                    {e.total_erros > 0 && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive">
                        {e.total_erros} ✗
                      </Badge>
                    )}
                  </div>
                </div>
                {expandedEnvio === e.id && (
                  <div className="border-t">
                    <EnvioDetalhes envioId={e.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HistoricoEnviosDialog;
