import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Car, 
  User, 
  History, 
  FileText, 
  Calendar, 
  Gauge, 
  Fuel, 
  Shield,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano?: number | null;
  cor?: string | null;
  categoria?: string | null;
  combustivel?: string | null;
  status?: string | null;
  km_atual?: number | null;
  seguro_numero?: string | null;
  seguro_validade?: string | null;
  inspecao_validade?: string | null;
  observacoes?: string | null;
  created_at?: string;
}

interface MotoristaAtual {
  id: string;
  nome: string;
  data_inicio: string;
}

interface HistoricoItem {
  id: string;
  motorista_nome: string;
  data_inicio: string;
  data_fim: string | null;
}

interface ViaturaDetailsModalProps {
  viatura: Viatura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViaturaDetailsModal({ viatura, open, onOpenChange }: ViaturaDetailsModalProps) {
  const [motoristaAtual, setMotoristaAtual] = useState<MotoristaAtual | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (viatura && open) {
      loadData();
    }
  }, [viatura, open]);

  const loadData = async () => {
    if (!viatura) return;
    setLoading(true);
    try {
      // Buscar motorista atual
      const { data: motoristaData } = await supabase
        .from('motorista_viaturas')
        .select(`
          id,
          data_inicio,
          motoristas_ativos!inner(id, nome)
        `)
        .eq('viatura_id', viatura.id)
        .eq('status', 'ativo')
        .maybeSingle();

      if (motoristaData) {
        const motorista = motoristaData.motoristas_ativos as any;
        setMotoristaAtual({
          id: motorista.id,
          nome: motorista.nome,
          data_inicio: motoristaData.data_inicio,
        });
      } else {
        setMotoristaAtual(null);
      }

      // Buscar histórico
      const { data: historicoData } = await supabase
        .from('motorista_viaturas')
        .select(`
          id,
          data_inicio,
          data_fim,
          motoristas_ativos!inner(nome)
        `)
        .eq('viatura_id', viatura.id)
        .order('data_inicio', { ascending: false });

      if (historicoData) {
        setHistorico(
          historicoData.map((item: any) => ({
            id: item.id,
            motorista_nome: item.motoristas_ativos.nome,
            data_inicio: item.data_inicio,
            data_fim: item.data_fim,
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!viatura) return null;

  const getCategoriaColor = (categoria: string | null | undefined) => {
    switch (categoria?.toLowerCase()) {
      case 'green': return 'bg-green-500 text-white';
      case 'comfort': return 'bg-blue-500 text-white';
      case 'black': return 'bg-black text-white';
      case 'x-saver': return 'bg-orange-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'disponivel': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'em_uso': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'manutencao': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'inativo': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string | null | undefined) => {
    switch (status) {
      case 'disponivel': return 'Disponível';
      case 'em_uso': return 'Em Uso';
      case 'manutencao': return 'Manutenção';
      case 'inativo': return 'Inativo';
      default: return status || 'N/D';
    }
  };

  const isExpiringSoon = (date: string | null | undefined) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (date: string | null | undefined) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {viatura.marca} {viatura.modelo}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-mono font-bold text-muted-foreground">
                  {viatura.matricula}
                </span>
                <Badge className={getCategoriaColor(viatura.categoria)}>
                  {viatura.categoria || 'Sem categoria'}
                </Badge>
                <Badge variant="outline" className={getStatusColor(viatura.status)}>
                  {getStatusLabel(viatura.status)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="dados" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="motorista" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Motorista</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Informações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marca</span>
                    <span className="font-medium">{viatura.marca}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelo</span>
                    <span className="font-medium">{viatura.modelo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ano</span>
                    <span className="font-medium">{viatura.ano || 'N/D'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cor</span>
                    <span className="font-medium">{viatura.cor || 'N/D'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Combustível</span>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">{viatura.combustivel || 'N/D'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Km Atual</span>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {viatura.km_atual?.toLocaleString('pt-PT') || '0'} km
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Documentação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Seguro</span>
                    </div>
                    <span className="font-medium">{viatura.seguro_numero || 'N/D'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Validade Seguro</span>
                    <div className="flex items-center gap-2">
                      {isExpired(viatura.seguro_validade) && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {isExpiringSoon(viatura.seguro_validade) && !isExpired(viatura.seguro_validade) && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className={`font-medium ${isExpired(viatura.seguro_validade) ? 'text-destructive' : ''}`}>
                        {viatura.seguro_validade 
                          ? format(new Date(viatura.seguro_validade), 'dd/MM/yyyy', { locale: pt })
                          : 'N/D'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Validade Inspeção</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpired(viatura.inspecao_validade) && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {isExpiringSoon(viatura.inspecao_validade) && !isExpired(viatura.inspecao_validade) && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className={`font-medium ${isExpired(viatura.inspecao_validade) ? 'text-destructive' : ''}`}>
                        {viatura.inspecao_validade 
                          ? format(new Date(viatura.inspecao_validade), 'dd/MM/yyyy', { locale: pt })
                          : 'N/D'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {viatura.observacoes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{viatura.observacoes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="motorista" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Motorista Atual</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">A carregar...</p>
                ) : motoristaAtual ? (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="p-3 rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{motoristaAtual.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Desde {format(new Date(motoristaAtual.data_inicio), 'dd/MM/yyyy', { locale: pt })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Esta viatura não está atribuída a nenhum motorista.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Histórico de Atribuições</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">A carregar...</p>
                ) : historico.length > 0 ? (
                  <div className="space-y-3">
                    {historico.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.motorista_nome}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.data_inicio), 'dd/MM/yyyy', { locale: pt })}
                          {' → '}
                          {item.data_fim 
                            ? format(new Date(item.data_fim), 'dd/MM/yyyy', { locale: pt })
                            : 'Atual'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Sem histórico de atribuições.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Documentos da Viatura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Funcionalidade de documentos em desenvolvimento.</p>
                  <p className="text-sm mt-1">Em breve poderá fazer upload de documentos aqui.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
