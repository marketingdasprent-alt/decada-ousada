import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';
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
import { 
  Eye, 
  Download, 
  Check, 
  X, 
  Loader2,
  Receipt,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Recibo {
  id: string;
  codigo: number;
  motorista_id: string;
  user_id: string | null;
  descricao: string;
  periodo_referencia: string | null;
  semana_referencia_inicio: string | null;
  valor_total: number | null;
  ficheiro_url: string;
  nome_ficheiro: string | null;
  status: string;
  validado_por: string | null;
  data_validacao: string | null;
  observacoes: string | null;
  created_at: string;
}

interface MotoristaRecibosSectionProps {
  motoristaId: string;
  selectedWeek: Date;
  motorista: any;
}

export const MotoristaRecibosSection: React.FC<MotoristaRecibosSectionProps> = ({
  motoristaId,
  selectedWeek,
  motorista,
}) => {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  
  // Resumo Financeiro Real-time
  const [resumoSemanal, setResumoSemanal] = useState({
    faturadoBolt: 0,
    faturadoUber: 0,
    outrasReceitas: 0,
    totalFaturado: 0,
    custosSemanal: 0,
    liquido: 0,
    loading: false
  });

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  useEffect(() => {
    loadData();
  }, [motoristaId, selectedWeek]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadRecibos(),
      loadResumoSemanal()
    ]);
    setLoading(false);
  };

  const loadRecibos = async () => {
    try {
      const { data, error } = await supabase
        .from('motorista_recibos')
        .select('*')
        .eq('motorista_id', motoristaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecibos(data || []);
    } catch (error) {
      console.error('Erro ao carregar recibos:', error);
    }
  };

  const loadResumoSemanal = async () => {
    setResumoSemanal(prev => ({ ...prev, loading: true }));
    const weekStartISO = weekStart.toISOString();
    const weekEndISO = weekEnd.toISOString();
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const weekEndStr = format(weekEnd, "yyyy-MM-dd");

    try {
      // 1. Fetch ALL associated Uber IDs for this driver
      const { data: associatedUberDrivers } = await supabase
        .from("uber_drivers")
        .select("uber_driver_id")
        .eq("motorista_id", motoristaId);

      const associatedUberIds = (associatedUberDrivers || []).map(d => d.uber_driver_id);

      // 2. Uber Data (Official Transactions for ALL associated IDs)
      const { data: uberTrans } = await supabase
        .from("uber_transactions")
        .select("gross_amount")
        .in("uber_driver_id", associatedUberIds)
        .gte("occurred_at", weekStartISO)
        .lte("occurred_at", weekEndISO);

      const uberTotal = (uberTrans || []).reduce((acc, curr) => acc + (Number(curr.gross_amount) || 0), 0);

      // 3. Bolt Data: SUM BOTH Viagens AND Weekly Summaries (Just like Admin)
      const { data: boltViagens } = await supabase
        .from("bolt_viagens")
        .select("driver_earnings")
        .eq("motorista_id", motoristaId)
        .gte("payment_confirmed_timestamp", weekStartISO)
        .lte("payment_confirmed_timestamp", weekEndISO);

      const boltViagensTotal = (boltViagens || []).reduce((acc, curr) => acc + (Number(curr.driver_earnings) || 0), 0);

      const { data: boltResumos } = await supabase
        .from("bolt_resumos_semanais")
        .select("ganhos_liquidos")
        .eq("motorista_id", motoristaId)
        .lte("periodo_inicio", weekEndStr)
        .gte("periodo_fim", weekStartStr);
      
      const boltResumosTotal = (boltResumos || []).reduce((acc, curr) => acc + (Number(curr.ganhos_liquidos) || 0), 0);
      
      // 4. Combustíveis (BP, Repsol, EDP)
      const [bpRes, repsolRes, edpRes] = await Promise.all([
        supabase.from("bp_transacoes").select("amount").eq("motorista_id", motoristaId).gte("transaction_date", weekStartISO).lte("transaction_date", weekEndISO),
        supabase.from("repsol_transacoes").select("amount").eq("motorista_id", motoristaId).gte("transaction_date", weekStartISO).lte("transaction_date", weekEndISO),
        supabase.from("edp_transacoes").select("amount").eq("motorista_id", motoristaId).gte("transaction_date", weekStartISO).lte("transaction_date", weekEndISO)
      ]);

      const fuelTotal = 
        (bpRes.data || []).reduce((a, b) => a + (Number(b.amount) || 0), 0) +
        (repsolRes.data || []).reduce((a, b) => a + (Number(b.amount) || 0), 0) +
        (edpRes.data || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);

      // 5. Financeiro Manual (Mirroring Admin: ONLY 'pendente')
      const { data: finData } = await supabase
        .from("motorista_financeiro")
        .select("valor, tipo, categoria")
        .eq("motorista_id", motoristaId)
        .gte("data_movimento", weekStartStr)
        .lte("data_movimento", weekEndStr)
        .eq("status", "pendente");

      // 5b. Fetch Fixed Vehicle Rent (SUM all active to match Admin robustly)
      const { data: viaturaContratos } = await supabase
        .from("motorista_viaturas")
        .select("viaturas(valor_aluguer)")
        .eq("motorista_id", motoristaId)
        .eq("status", "ativo");

      const fixedRent = (viaturaContratos || []).reduce((acc, curr) => {
        return acc + (Number((curr.viaturas as any)?.valor_aluguer) || 0);
      }, 0);

      // 5c. Fetch Additional Costs (motorista_custos_adicionais)
      const { data: extraCostsData } = await supabase
        .from("motorista_custos_adicionais")
        .select("valor")
        .eq("motorista_id", motoristaId)
        .gte("semana_referencia", weekStartStr)
        .lte("semana_referencia", weekEndStr);
      
      const extraCostsTotal = (extraCostsData || []).reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

      let extraCredits = 0;
      let extraDebits = 0;
      
      (finData || []).forEach((mov: any) => {
        const val = Number(mov.valor) || 0;
        if (mov.tipo === "credito") extraCredits += val;
        else extraDebits += val;
      });

      // 6. FINAL AGGREGATION (MIRROR OF ContasResumoTab.tsx:resumosCalculados)
      const passesReciboVerde = motorista.recibo_verde ?? true;
      
      // To match Admin EXACTLY, we sum Bolt sources if they both exist (Admin is additive)
      const boltTotal = boltViagensTotal + boltResumosTotal;
      const faturadoPlataformas = uberTotal + boltTotal;
      const totalFaturadoReal = faturadoPlataformas + extraCredits;
      
      // Admin uses: revenue = passesReciboVerde ? totalFaturado : (faturado_bolt + faturado_uber) / 1.06 + extrasValor;
      const receitaLiquidaPlataformas = passesReciboVerde 
        ? faturadoPlataformas 
        : faturadoPlataformas / 1.06;

      const receitaTotalFinal = receitaLiquidaPlataformas + extraCredits;
      const custosTotal = extraDebits + fuelTotal + fixedRent + extraCostsTotal;
      const liquidoFinal = receitaTotalFinal - custosTotal;

      setResumoSemanal({
        faturadoBolt: boltTotal,
        faturadoUber: uberTotal,
        outrasReceitas: extraCredits,
        totalFaturado: totalFaturadoReal,
        custosSemanal: custosTotal,
        liquido: liquidoFinal,
        loading: false
      });

    } catch (error) {
      console.error("Erro ao carregar resumo semanal:", error);
      setResumoSemanal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleVisualizar = async (ficheiro_url: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('motorista-recibos')
        .createSignedUrl(ficheiro_url, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      toast.error('Erro ao visualizar recibo');
    }
  };

  const handleDownload = async (ficheiro_url: string, nome_ficheiro: string | null) => {
    try {
      const { data, error } = await supabase.storage
        .from('motorista-recibos')
        .download(ficheiro_url);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome_ficheiro || 'recibo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erro ao descarregar recibo');
    }
  };

  const handleValidar = async (reciboId: string) => {
    try {
      const { error } = await supabase
        .from('motorista_recibos')
        .update({
          status: 'validado',
          validado_por: (await supabase.auth.getUser()).data.user?.id,
          data_validacao: new Date().toISOString(),
        })
        .eq('id', reciboId);
      if (error) throw error;
      toast.success('Recibo validado com sucesso');
      loadRecibos();
    } catch (error) {
      toast.error('Erro ao validar recibo');
    }
  };

  const handleRejeitar = async (reciboId: string) => {
    try {
      const { error } = await supabase
        .from('motorista_recibos')
        .update({
          status: 'rejeitado',
          validado_por: (await supabase.auth.getUser()).data.user?.id,
          data_validacao: new Date().toISOString(),
        })
        .eq('id', reciboId);
      if (error) throw error;
      toast.success('Recibo rejeitado');
      loadRecibos();
    } catch (error) {
      toast.error('Erro ao rejeitar recibo');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submetido':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>;
      case 'validado':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Validado</Badge>;
      case 'rejeitado':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filtrar recibos por semana e status
  const recibosFiltrados = recibos.filter(recibo => {
    if (filtroStatus !== 'todos' && recibo.status !== filtroStatus) return false;
    
    // Filtro temporal: se o recibo tem semana de referência, deve bater com o início da semana selecionada
    if (recibo.semana_referencia_inicio) {
      const recWeekStart = format(new Date(recibo.semana_referencia_inicio), "yyyy-MM-dd");
      const selWeekStart = format(weekStart, "yyyy-MM-dd");
      return recWeekStart === selWeekStart;
    }
    
    // Se não tem semana de referência, tentamos ver se a data de criação cai na semana (opcional)
    // Mas o mais correto é o motorista associar à semana certa.
    return true; 
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Resumo Real-time */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Faturação Total</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            {resumoSemanal.loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(resumoSemanal.totalFaturado)}</p>
            )}
            <div className="mt-2 text-[10px] text-green-600 flex flex-wrap gap-x-3 gap-y-1">
              <span>Bolt: {formatCurrency(resumoSemanal.faturadoBolt)}</span>
              <span>Uber: {formatCurrency(resumoSemanal.faturadoUber)}</span>
              {resumoSemanal.outrasReceitas > 0 && (
                <span className="font-bold underline">Outras: {formatCurrency(resumoSemanal.outrasReceitas)}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Custos & Débitos</span>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            {resumoSemanal.loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(resumoSemanal.custosSemanal)}</p>
            )}
            <p className="mt-2 text-[10px] text-red-600">Aluguer, Combustível, Outros</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Líquido Estimado</span>
              <Wallet className="h-4 w-4 text-indigo-600" />
            </div>
            {resumoSemanal.loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(resumoSemanal.liquido)}</p>
            )}
            <p className="mt-2 text-[10px] text-indigo-600 italic">Cálculo em tempo real</p>
          </CardContent>
        </Card>

        <Card className="flex items-center justify-center border-dashed">
          <Button variant="outline" className="gap-2 h-12 w-full mx-4 border-dashed" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir Resumo
          </Button>
        </Card>
      </div>

      <Separator />

      {/* Recibos Verdes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recibos Verdes da Semana
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="submetido">Pendente</SelectItem>
                <SelectItem value="validado">Validado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {recibosFiltrados.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-muted/20">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">Nenhum recibo submetido para esta semana.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recibosFiltrados.map((recibo) => (
                  <TableRow key={recibo.id}>
                    <TableCell className="text-xs font-mono font-bold text-primary">
                      {`#${String(recibo.codigo).padStart(4, '0')}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{recibo.descricao}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Submetido em {format(new Date(recibo.created_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {recibo.valor_total ? formatCurrency(recibo.valor_total) : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(recibo.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleVisualizar(recibo.ficheiro_url)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(recibo.ficheiro_url, recibo.nome_ficheiro)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        {recibo.status === 'submetido' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:bg-green-50" onClick={() => handleValidar(recibo.id)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleRejeitar(recibo.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
