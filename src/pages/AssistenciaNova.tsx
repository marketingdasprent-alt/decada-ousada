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
  const [formData, setFormData] = useState({
    categoria_id: '',
    titulo: '',
    descricao: '',
    prioridade: 'media',
    km_inicio: '',
    combustivel_inicio: 'meio',
    data_entrada: new Date().toISOString().split('T')[0],
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

  const handleSelectViatura = (viatura: Viatura) => {
    setSelectedViatura(viatura);
    setFormData(prev => ({
      ...prev,
      km_inicio: viatura.km_atual?.toString() || '',
    }));
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
          categoria_id: formData.categoria_id || null,
          titulo: formData.titulo.trim(),
          descricao: formData.descricao.trim(),
          prioridade: formData.prioridade,
          status: 'em_andamento', // Já começa em andamento pois estamos a dar entrada
          km_inicio: parseInt(formData.km_inicio) || null,
          combustivel_inicio: formData.combustivel_inicio,
          criado_por: user?.id,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Atualizar Status da Viatura para Manutenção
      const { error: viaturaError } = await supabase
        .from('viaturas')
        .update({ status: 'manutencao' })
        .eq('id', selectedViatura.id);

      if (viaturaError) throw viaturaError;

      toast({
        title: 'Sucesso',
        description: 'Viatura colocada em assistência com sucesso.',
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
