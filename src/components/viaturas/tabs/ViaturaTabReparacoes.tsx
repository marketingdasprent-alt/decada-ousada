import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Wrench, Loader2, Trash2, Euro, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addWeeks, startOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [motoristaAssociado, setMotoristaAssociado] = useState<string | null>(null);
  const [parcelasMap, setParcelasMap] = useState<Record<string, Parcela[]>>({});
  const [expandedParcelas, setExpandedParcelas] = useState<string | null>(null);

  // Form state
  const [descricao, setDescricao] = useState('');
  const [oficina, setOficina] = useState('');
  const [custo, setCusto] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataSaida, setDataSaida] = useState('');
  const [kmEntrada, setKmEntrada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [motoristaResponsavel, setMotoristaResponsavel] = useState('');
  const [cobrarMotorista, setCobrarMotorista] = useState(false);
  const [valorACobrar, setValorACobrar] = useState('');
  const [numParcelas, setNumParcelas] = useState('');
  const [dataInicioCobranca, setDataInicioCobranca] = useState('');

  useEffect(() => {
    if (viaturaId) {
      loadReparacoes();
      loadMotoristas();
      loadMotoristaAssociado();
    }
  }, [viaturaId]);

  // Quando custo muda e cobrar está ativo, atualizar valor a cobrar
  useEffect(() => {
    if (cobrarMotorista && !valorACobrar && custo) {
      setValorACobrar(custo);
    }
  }, [custo, cobrarMotorista]);

  const loadMotoristas = async () => {
    const { data } = await supabase
      .from('motoristas_ativos')
      .select('id, nome')
      .eq('status_ativo', true)
      .order('nome');
    setMotoristas(data || []);
  };

  const loadMotoristaAssociado = async () => {
    if (!viaturaId) return;
    const { data } = await supabase
      .from('motorista_viaturas')
      .select('motorista_id')
      .eq('viatura_id', viaturaId)
      .eq('status', 'ativo')
      .maybeSingle();
    setMotoristaAssociado(data?.motorista_id || null);
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

  const gerarParcelas = async (reparacaoId: string, motoristaId: string, valorTotal: number, parcelas: number, dataInicio: string) => {
    const parcelasData = [];
    const valorParcela = Math.round((valorTotal / parcelas) * 100) / 100;
    const inicioDate = new Date(dataInicio);
    // Garantir que começa na segunda-feira
    const primeiraSegunda = startOfWeek(inicioDate, { weekStartsOn: 1 });

    for (let i = 0; i < parcelas; i++) {
      const semana = addWeeks(primeiraSegunda, i);
      parcelasData.push({
        reparacao_id: reparacaoId,
        motorista_id: motoristaId,
        numero_parcela: i + 1,
        valor: i === parcelas - 1 
          ? Math.round((valorTotal - valorParcela * (parcelas - 1)) * 100) / 100 
          : valorParcela,
        semana_referencia: format(semana, 'yyyy-MM-dd'),
        status: 'pendente',
      });
    }

    const { error } = await supabase
      .from('reparacao_parcelas')
      .insert(parcelasData);

    if (error) throw error;
  };

  const handleSubmit = async () => {
    if (!viaturaId || !descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    if (cobrarMotorista && !motoristaResponsavel) {
      toast.error('Selecione o motorista responsável para cobrar');
      return;
    }

    if (cobrarMotorista && (!valorACobrar || !numParcelas || !dataInicioCobranca)) {
      toast.error('Preencha todos os campos de cobrança');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('viatura_reparacoes')
        .insert({
          viatura_id: viaturaId,
          descricao: descricao.trim(),
          oficina: oficina.trim() || null,
          custo: custo ? parseFloat(custo) : null,
          data_entrada: dataEntrada || null,
          data_saida: dataSaida || null,
          km_entrada: kmEntrada ? parseInt(kmEntrada) : null,
          observacoes: observacoes.trim() || null,
          motorista_responsavel_id: motoristaResponsavel || null,
          cobrar_motorista: cobrarMotorista,
          valor_a_cobrar: cobrarMotorista && valorACobrar ? parseFloat(valorACobrar) : null,
          num_parcelas: cobrarMotorista && numParcelas ? parseInt(numParcelas) : null,
          data_inicio_cobranca: cobrarMotorista && dataInicioCobranca ? dataInicioCobranca : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Gerar parcelas se cobrar motorista
      if (cobrarMotorista && data?.id) {
        await gerarParcelas(
          data.id,
          motoristaResponsavel,
          parseFloat(valorACobrar),
          parseInt(numParcelas),
          dataInicioCobranca
        );
      }

      toast.success('Reparação registada com sucesso!');
      setDialogOpen(false);
      resetForm();
      loadReparacoes();
    } catch (error) {
      console.error('Erro ao registar reparação:', error);
      toast.error('Erro ao registar reparação');
    } finally {
      setSaving(false);
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

  const resetForm = () => {
    setDescricao('');
    setOficina('');
    setCusto('');
    setDataEntrada('');
    setDataSaida('');
    setKmEntrada('');
    setObservacoes('');
    setMotoristaResponsavel(motoristaAssociado || '');
    setCobrarMotorista(false);
    setValorACobrar('');
    setNumParcelas('');
    setDataInicioCobranca('');
  };

  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      setMotoristaResponsavel(motoristaAssociado || '');
    }
  };

  const totalCusto = reparacoes.reduce((acc, r) => acc + (r.custo || 0), 0);

  const parcelaPreview = cobrarMotorista && valorACobrar && numParcelas
    ? (parseFloat(valorACobrar) / parseInt(numParcelas)).toFixed(2)
    : null;

  const getMotoristaName = (id: string | null) => {
    if (!id) return null;
    return motoristas.find(m => m.id === id)?.nome || null;
  };

  if (!viaturaId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Guarde a viatura primeiro para registar reparações.
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Histórico de Reparações
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Reparação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registar Nova Reparação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva a reparação..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="oficina">Oficina</Label>
                    <Input
                      id="oficina"
                      placeholder="Nome da oficina"
                      value={oficina}
                      onChange={(e) => setOficina(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custo">Custo (€)</Label>
                    <Input
                      id="custo"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={custo}
                      onChange={(e) => setCusto(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_entrada">Data Entrada</Label>
                    <Input
                      id="data_entrada"
                      type="date"
                      value={dataEntrada}
                      onChange={(e) => setDataEntrada(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_saida">Data Saída</Label>
                    <Input
                      id="data_saida"
                      type="date"
                      value={dataSaida}
                      onChange={(e) => setDataSaida(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="km_entrada">Km à Entrada</Label>
                  <Input
                    id="km_entrada"
                    type="number"
                    placeholder="Quilometragem"
                    value={kmEntrada}
                    onChange={(e) => setKmEntrada(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Notas adicionais..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>

                {/* Motorista Responsável */}
                <div>
                  <Label>Motorista Responsável</Label>
                  <Select value={motoristaResponsavel} onValueChange={setMotoristaResponsavel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar motorista..." />
                    </SelectTrigger>
                    <SelectContent>
                      {motoristas.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cobrança */}
                {motoristaResponsavel && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="cobrar"
                        checked={cobrarMotorista}
                        onCheckedChange={(checked) => {
                          setCobrarMotorista(checked === true);
                          if (checked && custo && !valorACobrar) {
                            setValorACobrar(custo);
                          }
                        }}
                      />
                      <Label htmlFor="cobrar" className="font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cobrar ao motorista em parcelas semanais
                      </Label>
                    </div>

                    {cobrarMotorista && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Valor a cobrar (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={valorACobrar}
                              onChange={(e) => setValorACobrar(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Nº de parcelas semanais</Label>
                            <Input
                              type="number"
                              min="1"
                              max="52"
                              placeholder="Ex: 10"
                              value={numParcelas}
                              onChange={(e) => setNumParcelas(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Data início cobrança</Label>
                          <Input
                            type="date"
                            value={dataInicioCobranca}
                            onChange={(e) => setDataInicioCobranca(e.target.value)}
                          />
                        </div>
                        {parcelaPreview && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
                            <span className="font-medium text-blue-700 dark:text-blue-400">
                              {numParcelas} parcelas de {parseFloat(parcelaPreview).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€/semana
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Registar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
