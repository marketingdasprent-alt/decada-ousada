import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, Loader2, Trash2, Euro, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Reparacao {
  id: string;
  descricao: string;
  oficina: string | null;
  custo: number | null;
  data_entrada: string | null;
  data_saida: string | null;
  km_entrada: number | null;
  observacoes: string | null;
  created_at: string;
  motorista_responsavel_id: string | null;
  cobrar_motorista: boolean;
  valor_a_cobrar: number | null;
  num_parcelas: number | null;
  data_inicio_cobranca: string | null;
}

interface Parcela {
  id: string;
  numero_parcela: number;
  valor: number;
  semana_referencia: string;
  status: string;
  cobrada_em: string | null;
}

interface Motorista {
  id: string;
  nome: string;
}

interface ViaturaTabReparacoesProps {
  viaturaId: string | undefined;
}

export function ViaturaTabReparacoes({ viaturaId }: ViaturaTabReparacoesProps) {
  const [reparacoes, setReparacoes] = useState<Reparacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [parcelasMap, setParcelasMap] = useState<Record<string, Parcela[]>>({});
  const [expandedParcelas, setExpandedParcelas] = useState<string | null>(null);

  useEffect(() => {
    if (viaturaId) {
      loadReparacoes();
      loadMotoristas();
    }
  }, [viaturaId]);

  const loadMotoristas = async () => {
    const { data } = await supabase
      .from('motoristas_ativos')
      .select('id, nome')
      .eq('status_ativo', true)
      .order('nome');
    setMotoristas(data || []);
  };

  const loadReparacoes = async () => {
    if (!viaturaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viatura_reparacoes')
        .select('*')
        .eq('viatura_id', viaturaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const reps = (data || []) as Reparacao[];
      setReparacoes(reps);

      // Carregar parcelas para reparações com cobrança
      const idsComCobranca = reps.filter(r => r.cobrar_motorista).map(r => r.id);
      if (idsComCobranca.length > 0) {
        const { data: parcData } = await supabase
          .from('reparacao_parcelas')
          .select('*')
          .in('reparacao_id', idsComCobranca)
          .order('numero_parcela');

        const map: Record<string, Parcela[]> = {};
        (parcData || []).forEach((p: any) => {
          if (!map[p.reparacao_id]) map[p.reparacao_id] = [];
          map[p.reparacao_id].push(p);
        });
        setParcelasMap(map);
      }
    } catch (error) {
      console.error('Erro ao carregar reparações:', error);
      toast.error('Erro ao carregar reparações');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reparacaoId: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta reparação?')) return;

    try {
      const { error } = await supabase
        .from('viatura_reparacoes')
        .delete()
        .eq('id', reparacaoId);

      if (error) throw error;
      toast.success('Reparação eliminada!');
      loadReparacoes();
    } catch (error) {
      console.error('Erro ao eliminar reparação:', error);
      toast.error('Erro ao eliminar reparação');
    }
  };

  const totalCusto = reparacoes.reduce((acc, r) => acc + (r.custo || 0), 0);

  const getMotoristaName = (id: string | null) => {
    if (!id) return null;
    return motoristas.find(m => m.id === id)?.nome || null;
  };

  if (!viaturaId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Guarde a viatura primeiro para ver reparações.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {reparacoes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{reparacoes.length}</div>
              <p className="text-sm text-muted-foreground">Total Reparações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {totalCusto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
              </div>
              <p className="text-sm text-muted-foreground">Custo Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Histórico de Reparações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reparacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma reparação registada.</p>
              <p className="text-xs mt-1">As reparações são criadas ao fechar tickets na página de Assistência.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reparacoes.map((reparacao) => {
                const parcelas = parcelasMap[reparacao.id] || [];
                const parcelasCobradas = parcelas.filter(p => p.status === 'cobrada').length;
                const totalParcelas = parcelas.length;

                return (
                  <div key={reparacao.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{reparacao.descricao}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                          {reparacao.oficina && (
                            <span className="bg-muted px-2 py-0.5 rounded">
                              {reparacao.oficina}
                            </span>
                          )}
                          {reparacao.data_entrada && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(reparacao.data_entrada), 'dd/MM/yyyy')}
                              {reparacao.data_saida && ` - ${format(new Date(reparacao.data_saida), 'dd/MM/yyyy')}`}
                            </span>
                          )}
                          {reparacao.km_entrada && (
                            <span>{reparacao.km_entrada.toLocaleString('pt-PT')} km</span>
                          )}
                          {getMotoristaName(reparacao.motorista_responsavel_id) && (
                            <Badge variant="outline" className="text-xs">
                              👤 {getMotoristaName(reparacao.motorista_responsavel_id)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {reparacao.custo !== null && (
                          <Badge variant="secondary" className="font-mono">
                            <Euro className="h-3 w-3 mr-1" />
                            {reparacao.custo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                          </Badge>
                        )}
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(reparacao.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Cobrança info */}
                    {reparacao.cobrar_motorista && totalParcelas > 0 && (
                      <div className="border-t pt-3">
                        <button
                          onClick={() => setExpandedParcelas(expandedParcelas === reparacao.id ? null : reparacao.id)}
                          className="flex items-center gap-2 text-sm w-full text-left"
                        >
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-700 dark:text-blue-400">
                            Cobrança: {parcelasCobradas}/{totalParcelas} parcelas
                          </span>
                          <Badge variant={parcelasCobradas === totalParcelas ? "default" : "outline"} className="ml-auto text-xs">
                            {reparacao.valor_a_cobrar?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                          </Badge>
                        </button>

                        {/* Barra de progresso */}
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${totalParcelas > 0 ? (parcelasCobradas / totalParcelas) * 100 : 0}%` }}
                          />
                        </div>

                        {expandedParcelas === reparacao.id && (
                          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                            {parcelas.map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted/50">
                                <span>Parcela {p.numero_parcela}</span>
                                <span className="text-muted-foreground">
                                  Semana {format(new Date(p.semana_referencia), 'dd/MM/yyyy')}
                                </span>
                                <span className="font-mono">{p.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€</span>
                                <Badge variant={p.status === 'cobrada' ? 'default' : p.status === 'cancelada' ? 'destructive' : 'outline'} className="text-xs">
                                  {p.status === 'cobrada' ? 'Cobrada' : p.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {reparacao.observacoes && (
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                        {reparacao.observacoes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
