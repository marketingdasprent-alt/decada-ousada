import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Loader2,
  Search,
  Fuel,
  Euro,
  X,
  Upload,
  CheckCircle2,
  MapPin,
  Calendar as CalendarIcon,
  Zap,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AdminFiltros } from './AdminFiltros';

interface Transacao {
  id: string;
  transaction_date: string;
  amount: number | null;
  quantity: number | null;
  fuel_type: string | null;
  station_name: string | null;
  station_location: string | null;
  card_number: string | null;
  motorista_id: string | null;
  motorista?: { nome: string };
  integracao_id: string;
  integracao?: { nome: string };
}

interface Integracao {
  id: string;
  nome: string;
  ativo: boolean;
  plataforma: string;
}

export const EdpDataTab: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIntegracao, setSelectedIntegracao] = useState('all');
  const [selectedWeek, setSelectedWeek] = useState<Date>(subWeeks(new Date(), 1));

  useEffect(() => {
    fetchIntegracoes();
  }, []);
  useEffect(() => {
    fetchTransacoes();
  }, [selectedIntegracao, selectedWeek]);

  const fetchIntegracoes = async () => {
    try {
      const { data, error } = await supabase
        .from('plataformas_configuracao')
        .select('id, nome, ativo, plataforma, robot_target_platform')
        .or('plataforma.eq.edp,and(plataforma.eq.robot,robot_target_platform.eq.edp)')
        .order('nome');
      if (error) throw error;
      setIntegracoes((data || []) as Integracao[]);
      if (data && data.length > 0) setSelectedIntegracao(data[0].id);
    } catch (error) {
      console.error('Erro ao carregar integrações EDP:', error);
    }
  };

  const fetchTransacoes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('edp_transacoes')
        .select(`*, motorista:motoristas_ativos (nome), integracao:plataformas_configuracao (nome)`)
        .order('transaction_date', { ascending: false });

      const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);
      query = query
        .gte('transaction_date', weekStart.toISOString())
        .lte('transaction_date', weekEnd.toISOString());
      if (selectedIntegracao !== 'all') query = query.eq('integracao_id', selectedIntegracao);

      const { data, error } = await query;
      if (error) throw error;
      setTransacoes((data || []) as Transacao[]);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Falha ao carregar dados EDP.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = transacoes.filter(
    (t) =>
      !searchTerm ||
      normalize(t.motorista?.nome || '').includes(normalize(searchTerm)) ||
      normalize(t.station_name || '').includes(normalize(searchTerm))
  );

  function normalize(s: string) {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  const stats = {
    total: filtered.length,
    energia: filtered.reduce((s, t) => s + (t.quantity || 0), 0),
    valor: filtered.reduce((s, t) => s + (t.amount || 0), 0),
  };

  return (
    <div className="space-y-4">
      <AdminFiltros
        selectedWeek={selectedWeek}
        onSelectedWeekChange={setSelectedWeek}
        integracoes={integracoes}
        selectedIntegracao={selectedIntegracao}
        onSelectedIntegracaoChange={setSelectedIntegracao}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        searchPlaceholder="Pesquisar motorista ou posto..."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Carregamentos" value={stats.total} icon={<Zap className="h-4 w-4" />} />
        <StatCard
          title="Total Energia"
          value={`${stats.energia.toFixed(2)} kWh`}
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          title="Custo Total"
          value={`€${stats.valor.toFixed(2)}`}
          icon={<Euro className="h-4 w-4" />}
          color="text-green-500"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin mx-auto" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Ponto de Carga</TableHead>
                <TableHead className="text-right">Energia</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.transaction_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    {t.motorista?.nome || (
                      <span className="italic text-muted-foreground">Não ident.</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.card_number || '-'}</TableCell>
                  <TableCell>{t.station_name || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {t.quantity?.toFixed(2)} kWh
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-500">
                    €{t.amount?.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <Card className="border-border/50 bg-card/50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </CardContent>
  </Card>
);
