import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  Plus, 
  Search, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NovoTicketDialog } from '@/components/assistencia/NovoTicketDialog';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Ticket {
  id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  created_at: string;
  data_estimada: string | null;
  viatura: {
    id: string;
    matricula: string;
    marca: string;
    modelo: string;
  } | null;
  categoria: {
    id: string;
    nome: string;
    cor: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aberto: { label: 'Aberto', color: 'bg-blue-500', icon: <AlertCircle className="h-4 w-4" /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  aguardando: { label: 'Aguardando', color: 'bg-orange-500', icon: <Clock className="h-4 w-4" /> },
  resolvido: { label: 'Resolvido', color: 'bg-green-500', icon: <CheckCircle2 className="h-4 w-4" /> },
  fechado: { label: 'Fechado', color: 'bg-gray-500', icon: <CheckCircle2 className="h-4 w-4" /> },
};

const prioridadeConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-gray-400' },
  media: { label: 'Média', color: 'bg-blue-400' },
  alta: { label: 'Alta', color: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: 'bg-red-500' },
};

import { StickyPageHeader } from '@/components/ui/StickyPageHeader';

const MeusTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [novoTicketOpen, setNovoTicketOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyTickets();
    }
  }, [user]);

  const fetchMyTickets = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch only tickets created by current user
      const { data: ticketsData, error } = await supabase
        .from('assistencia_tickets')
        .select(`
          id,
          numero,
          titulo,
          descricao,
          prioridade,
          status,
          created_at,
          data_estimada,
          viatura_id,
          categoria_id
        `)
        .eq('criado_por', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch related data
      const viaturaIds = [...new Set(ticketsData?.map(t => t.viatura_id).filter(Boolean))] as string[];
      const categoriaIds = [...new Set(ticketsData?.map(t => t.categoria_id).filter(Boolean))] as string[];
      
      const [viaturasRes, categoriasRes] = await Promise.all([
        viaturaIds.length > 0 
          ? supabase.from('viaturas').select('id, matricula, marca, modelo').in('id', viaturaIds)
          : Promise.resolve({ data: [] }),
        categoriaIds.length > 0
          ? supabase.from('assistencia_categorias').select('id, nome, cor').in('id', categoriaIds)
          : Promise.resolve({ data: [] }),
      ]);
      
      const viaturasMap = new Map((viaturasRes.data || []).map(v => [v.id, v]));
      const categoriasMap = new Map((categoriasRes.data || []).map(c => [c.id, c]));
      
      const enrichedTickets = (ticketsData || []).map(ticket => ({
        ...ticket,
        viatura: ticket.viatura_id ? viaturasMap.get(ticket.viatura_id) || null : null,
        categoria: ticket.categoria_id ? categoriasMap.get(ticket.categoria_id) || null : null,
      }));
      
      setTickets(enrichedTickets as Ticket[]);
    } catch (error: any) {
      console.error('Erro ao carregar tickets:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os seus tickets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.viatura?.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.numero.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'todos' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    abertos: tickets.filter(t => t.status === 'aberto').length,
    emAndamento: tickets.filter(t => t.status === 'em_andamento' || t.status === 'aguardando').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido' || t.status === 'fechado').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StickyPageHeader
        title="Meus Tickets de Assistência"
        description="Acompanhe os pedidos de reparação que submeteu"
        icon={Wrench}
      >
        <Button onClick={() => setNovoTicketOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ticket
        </Button>
      </StickyPageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{stats.abertos}</div>
            <p className="text-xs text-muted-foreground">Abertos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">{stats.emAndamento}</div>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.resolvidos}</div>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título, matrícula ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="fechado">Fechado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum ticket encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'todos'
                ? 'Tente ajustar os filtros de pesquisa.'
                : 'Ainda não submeteu nenhum pedido de assistência.'}
            </p>
            <Button onClick={() => setNovoTicketOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <Card 
              key={ticket.id} 
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/meus-tickets/${ticket.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Left: Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{String(ticket.numero).padStart(4, '0')}
                      </span>
                      {ticket.categoria && (
                        <Badge 
                          variant="outline" 
                          style={{ borderColor: ticket.categoria.cor, color: ticket.categoria.cor }}
                        >
                          {ticket.categoria.nome}
                        </Badge>
                      )}
                      <Badge className={prioridadeConfig[ticket.prioridade]?.color || 'bg-gray-400'}>
                        {prioridadeConfig[ticket.prioridade]?.label || ticket.prioridade}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-foreground truncate">{ticket.titulo}</h3>
                    
                    {ticket.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {ticket.descricao}
                      </p>
                    )}
                  </div>
                  
                  {/* Middle: Vehicle */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {ticket.viatura && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Car className="h-4 w-4" />
                        <span>{ticket.viatura.matricula} - {ticket.viatura.marca} {ticket.viatura.modelo}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Status & Date */}
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">
                        {format(new Date(ticket.created_at), "dd MMM yyyy", { locale: pt })}
                      </div>
                    </div>
                    
                    <Badge className={`${statusConfig[ticket.status]?.color || 'bg-gray-500'} flex items-center gap-1`}>
                      {statusConfig[ticket.status]?.icon}
                      {statusConfig[ticket.status]?.label || ticket.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para novo ticket */}
      <NovoTicketDialog 
        open={novoTicketOpen} 
        onOpenChange={setNovoTicketOpen}
        onSuccess={() => {
          setNovoTicketOpen(false);
          fetchMyTickets();
        }}
      />
    </div>
  );
};

export default MeusTickets;
