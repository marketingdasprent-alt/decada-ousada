import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, User, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface HistoricoItem {
  id: string;
  motorista_id: string;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  motorista?: {
    nome: string;
    email: string | null;
  };
}

interface ViaturaTabHistoricoProps {
  viaturaId: string | undefined;
}

export function ViaturaTabHistorico({ viaturaId }: ViaturaTabHistoricoProps) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (viaturaId) {
      loadHistorico();
    }
  }, [viaturaId]);

  const loadHistorico = async () => {
    if (!viaturaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('motorista_viaturas')
        .select(`
          *,
          motorista:motoristas_ativos(nome, email)
        `)
        .eq('viatura_id', viaturaId)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'finalizado': return 'bg-muted text-muted-foreground border-border';
      case 'suspenso': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'finalizado': return 'Finalizado';
      case 'suspenso': return 'Suspenso';
      default: return status;
    }
  };

  if (!viaturaId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Guarde a viatura primeiro para ver o histórico.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Motoristas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum motorista atribuído a esta viatura.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historico.map((item, index) => (
              <div 
                key={item.id} 
                className={`relative pl-6 pb-4 ${index !== historico.length - 1 ? 'border-l-2 border-muted ml-2' : 'ml-2'}`}
              >
                {/* Timeline dot */}
                <div className={`absolute left-0 top-0 w-4 h-4 rounded-full border-2 -translate-x-1/2 ${
                  item.status === 'ativo' 
                    ? 'bg-green-500 border-green-500' 
                    : 'bg-background border-muted-foreground'
                }`} />

                <div className="border rounded-lg p-4 ml-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.motorista?.nome || 'Motorista desconhecido'}</p>
                        {item.motorista?.email && (
                          <p className="text-sm text-muted-foreground">{item.motorista.email}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(item.data_inicio), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                      {item.data_fim 
                        ? ` — ${format(new Date(item.data_fim), "d 'de' MMMM 'de' yyyy", { locale: pt })}`
                        : ' — Presente'
                      }
                    </span>
                  </div>

                  {item.observacoes && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 mt-3">
                      {item.observacoes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
