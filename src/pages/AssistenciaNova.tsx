import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Search,
  Car,
  ChevronRight,
  Loader2,
  Wrench,
  Calendar,
  Gauge,
  Droplet,
  X,
} from 'lucide-react';

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  cor?: string | null;
  ano?: number | null;
  status: string;
  km_atual?: number | null;
}

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

export default function AssistenciaNova() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [filteredViaturas, setFilteredViaturas] = useState<Viatura[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [viaturaSubstituta, setViaturaSubstituta] = useState<Viatura | null>(null);
  const [viaturasDisponiveis, setViaturasDisponiveis] = useState<Viatura[]>([]);
  const [showSubstituteSearch, setShowSubstituteSearch] = useState(false);
  const [substituteSearchTerm, setSubstituteSearchTerm] = useState('');
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoria_id: '',
    titulo: '',
    descricao: '',
    prioridade: 'media',
    km_inicio: '',
    combustivel_inicio: 'meio',
    data_entrada: new Date().toISOString().split('T')[0],
    valor_orcamento: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        supabase
          .from('viaturas')
          .select('id, matricula, marca, modelo, cor, ano, status, km_atual')
          .neq('status', 'vendida')
          .order('matricula'),
        supabase
          .from('assistencia_categorias')
          .select('id, nome, cor')
          .eq('ativo', true)
          .order('ordem'),
      ]);

      if (vRes.error) throw vRes.error;
      if (cRes.error) throw cRes.error;

      setViaturas(vRes.data || []);
      setFilteredViaturas(vRes.data || []);
      setCategorias(cRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as viaturas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredViaturas(
      viaturas.filter(
        v =>
          v.matricula.toLowerCase().includes(term) ||
          v.marca.toLowerCase().includes(term) ||
          v.modelo.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, viaturas]);

  const handleSelectViatura = async (viatura: Viatura) => {
    setSelectedViatura(viatura);
    setFormData(prev => ({ ...prev, km_inicio: viatura.km_atual?.toString() || '' }));

    // Buscar motorista associado
    const { data: assoc } = await supabase
      .from('motorista_viaturas')
      .select('motorista_id')
      .eq('viatura_id', viatura.id)
      .eq('status', 'ativo')
      .is('data_fim', null)
      .maybeSingle();
    setMotoristaId(assoc?.motorista_id || null);

    // Buscar viaturas disponíveis para eventual substituta
    const { data: disponiveis } = await supabase
      .from('viaturas')
      .select('id, matricula, marca, modelo, status, km_atual')
      .eq('status', 'disponivel')
      .neq('id', viatura.id)
      .order('matricula');
    setViaturasDisponiveis(disponiveis || []);

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedViatura) return;

    if (!formData.titulo.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um título descritivo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      // 1. Criar o Ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('assistencia_tickets')
        .insert({
          viatura_id: selectedViatura.id,
          motorista_id: motoristaId || null,
          categoria_id: formData.categoria_id || null,
          titulo: formData.titulo.trim(),
          descricao: formData.descricao.trim(),
          prioridade: formData.prioridade,
          status: 'em_andamento',
          km_inicio: parseInt(formData.km_inicio) || null,
          combustivel_inicio: formData.combustivel_inicio,
          valor_orcamento: formData.valor_orcamento ? parseFloat(formData.valor_orcamento) : null,
          criado_por: user?.id,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

       // 1.1 Criar mensagem inicial de log com orçamento e detalhes
       await supabase.from('assistencia_mensagens').insert({
         ticket_id: ticket.id,
         autor_id: user?.id,
         mensagem: `Ticket criado com check-in: 
         - Orçamento Estimado: ${formData.valor_orcamento ? formData.valor_orcamento + '€' : 'Não definido'}
         - KM Inicial: ${formData.km_inicio || 'Não informado'}
         - Combustível: ${formData.combustivel_inicio}`,
         tipo: 'status_change',
       });

      // 2. Viatura original → manutencao
      const { error: viaturaError } = await supabase
        .from('viaturas')
        .update({ status: 'manutencao' })
        .eq('id', selectedViatura.id);
      if (viaturaError) throw viaturaError;

      // 3. Viatura substituta (se selecionada)
      if (viaturaSubstituta && motoristaId && ticket) {
        await supabase.from('motorista_viaturas').insert({
          motorista_id: motoristaId,
          viatura_id: viaturaSubstituta.id,
          data_inicio: new Date().toISOString().split('T')[0],
          status: 'ativo',
          tipo: 'substituta',
        });
        await supabase.from('viaturas').update({ status: 'em_uso' }).eq('id', viaturaSubstituta.id);
        await supabase.from('assistencia_tickets')
          .update({ viatura_substituta_id: viaturaSubstituta.id })
          .eq('id', ticket.id);
      }

      toast({
        title: 'Sucesso',
        description: viaturaSubstituta
          ? 'Viatura em manutenção. Substituta atribuída ao motorista.'
          : 'Viatura colocada em assistência com sucesso.',
      });

      navigate('/assistencia');
    } catch (error: any) {
      console.error('Erro ao criar assistência:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar a entrada da viatura.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => step === 1 ? navigate('/assistencia') : setStep(1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Nova Entrada em Assistência
          </h1>
          <p className="text-muted-foreground">
            {step === 1 ? 'Selecione a viatura' : `Entrada para ${selectedViatura?.matricula}`}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <Card className="border-border/50">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por matrícula ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
                autoFocus
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredViaturas.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-4 opacity-20" />
                Nenhuma viatura encontrada.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Viatura</TableHead>
                      <TableHead>Status Atual</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViaturas.map((v) => (
                      <TableRow 
                        key={v.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectViatura(v)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Car className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-mono font-bold">{v.matricula}</p>
                              <p className="text-xs text-muted-foreground">{v.marca} {v.modelo}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                            v.status === 'disponivel' ? 'bg-green-100 text-green-700' : 
                            v.status === 'manutencao' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {v.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Selecionar
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Detalhes do Problema</CardTitle>
                  <CardDescription>O que precisa ser verificado ou reparado?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título da Assistência *</Label>
                    <Input
                      id="titulo"
                      placeholder="Ex: Revisão Anual, Barulho no motor..."
                      value={formData.titulo}
                      onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select 
                      value={formData.categoria_id} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, categoria_id: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Detalhes adicionais sobre o estado da viatura ou pedido..."
                      className="min-h-[100px]"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select 
                      value={formData.prioridade} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, prioridade: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Check-in</CardTitle>
                  <CardDescription>Estado no momento da entrega</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_entrada" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Data Entrada
                    </Label>
                    <Input
                      id="data_entrada"
                      type="date"
                      value={formData.data_entrada}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_entrada: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="km_inicio" className="flex items-center gap-2">
                      <Gauge className="h-4 w-4" /> Quilometragem
                    </Label>
                    <Input
                      id="km_inicio"
                      type="number"
                      placeholder="KM à entrada"
                      value={formData.km_inicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, km_inicio: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="combustivel" className="flex items-center gap-2">
                      <Droplet className="h-4 w-4" /> Nível Combustível
                    </Label>
                    <Select 
                      value={formData.combustivel_inicio} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, combustivel_inicio: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vazio">Vazio</SelectItem>
                        <SelectItem value="reserva">Reserva</SelectItem>
                        <SelectItem value="1/4">1/4</SelectItem>
                        <SelectItem value="meio">1/2 (Meio)</SelectItem>
                        <SelectItem value="3/4">3/4</SelectItem>
                        <SelectItem value="cheio">Cheio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor_orcamento" className="flex items-center gap-2">
                      Orçamento Estimado (€)
                    </Label>
                    <Input
                      id="valor_orcamento"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.valor_orcamento}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_orcamento: e.target.value }))}
                    />
                  </div>

                  {/* Viatura Substituta */}
                  {motoristaId && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Car className="h-4 w-4" /> Viatura Substituta (opcional)
                      </Label>
                      {viaturaSubstituta ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/20">
                          <Car className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="flex-1 text-sm font-mono font-bold">{viaturaSubstituta.matricula}</span>
                          <span className="text-xs text-muted-foreground">{viaturaSubstituta.marca} {viaturaSubstituta.modelo}</span>
                          <button type="button" onClick={() => setViaturaSubstituta(null)} className="ml-1 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {!showSubstituteSearch ? (
                            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShowSubstituteSearch(true)}>
                              <Car className="h-4 w-4 mr-2" /> Atribuir viatura substituta ao motorista
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  placeholder="Pesquisar..."
                                  value={substituteSearchTerm}
                                  onChange={(e) => setSubstituteSearchTerm(e.target.value)}
                                  className="pl-8 h-8 text-sm"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {viaturasDisponiveis
                                  .filter(v =>
                                    v.matricula.toLowerCase().includes(substituteSearchTerm.toLowerCase()) ||
                                    v.marca.toLowerCase().includes(substituteSearchTerm.toLowerCase()) ||
                                    v.modelo.toLowerCase().includes(substituteSearchTerm.toLowerCase())
                                  )
                                  .map(v => (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => { setViaturaSubstituta(v); setShowSubstituteSearch(false); setSubstituteSearchTerm(''); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors text-left"
                                    >
                                      <span className="font-mono font-bold">{v.matricula}</span>
                                      <span className="text-muted-foreground">{v.marca} {v.modelo}</span>
                                    </button>
                                  ))}
                                {viaturasDisponiveis.length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-2">Sem viaturas disponíveis</p>
                                )}
                              </div>
                              <Button type="button" variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowSubstituteSearch(false)}>
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A processar...
                      </>
                    ) : (
                      'Colocar em Assistência'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
