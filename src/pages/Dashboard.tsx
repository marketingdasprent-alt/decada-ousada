import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Car,
  Wrench,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Euro,
  LayoutDashboard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear, subMonths, subWeeks, endOfMonth, endOfWeek, parseISO, eachMonthOfInterval, eachWeekOfInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

type PeriodPreset = 'semana' | 'mes' | 'trimestre' | 'ano';

interface DateRange {
  from: Date;
  to: Date;
}

interface FleetCounts {
  total: number;
  disponiveis: number;
  ocupadas: number;
  manutencao: number;
}

interface AtividadePoint {
  periodo: string;
  label: string;
  rentabilidade: number;
  alugadas: number;
  devolvidas: number;
}

interface UpgradeData {
  count: number;
  rendaAtual: number;
  rendaAnterior: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodRange(preset: PeriodPreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'semana':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'mes':
      return { from: startOfMonth(now), to: now };
    case 'trimestre':
      return { from: startOfQuarter(now), to: now };
    case 'ano':
      return { from: startOfYear(now), to: now };
  }
}


function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatPct(curr: number, prev: number): { pct: number; up: boolean } {
  if (prev === 0) return { pct: 0, up: curr >= 0 };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  return { pct: Math.abs(pct), up: pct >= 0 };
}

// ── Palette ──────────────────────────────────────────────────────────────────

const COLORS = {
  disponivel: '#22c55e',
  ocupada: '#3b82f6',
  manutencao: '#f59e0b',
  inativo: '#6b7280',
  rentabilidade: '#8b5cf6',
  alugadas: '#3b82f6',
  devolvidas: '#22c55e',
};

// ── Dashboard Component ───────────────────────────────────────────────────────

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<PeriodPreset>('mes');
  const [range, setRange] = useState<DateRange>(getPeriodRange('mes'));
  const [loading, setLoading] = useState(true);

  // State for each data section
  const [fleet, setFleet] = useState<FleetCounts>({ total: 0, disponiveis: 0, ocupadas: 0, manutencao: 0 });
  const [candidaturasPendentes, setCandidaturasPendentes] = useState(0);
  const [atividadeData, setAtividadeData] = useState<AtividadePoint[]>([]);
  const [upgradeData, setUpgradeData] = useState<UpgradeData>({ count: 0, rendaAtual: 0, rendaAnterior: 0 });
  const [trocasCount, setTrocasCount] = useState(0);
  const [frotaPie, setFrotaPie] = useState<{ name: string; value: number; color: string }[]>([]);

  // ── Period change ────────────────────────────────────────────────────────

  const handlePreset = (p: PeriodPreset) => {
    setPreset(p);
    setRange(getPeriodRange(p));
  };

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const fromStr = range.from.toISOString();
      const toStr = range.to.toISOString();

      // ── 1. Fleet counts ────────────────────────────────────────────────
      const { data: viaturas } = await supabase
        .from('viaturas')
        .select('id, status')
        .neq('status', 'vendida');

      const fleetCounts: FleetCounts = {
        total: viaturas?.length || 0,
        disponiveis: viaturas?.filter(v => v.status === 'disponivel').length || 0,
        ocupadas: viaturas?.filter(v => v.status === 'em_uso').length || 0,
        manutencao: viaturas?.filter(v => v.status === 'manutencao').length || 0,
      };
      setFleet(fleetCounts);

      const pieData = [
        { name: 'Disponíveis', value: fleetCounts.disponiveis, color: COLORS.disponivel },
        { name: 'Ocupadas', value: fleetCounts.ocupadas, color: COLORS.ocupada },
        { name: 'Reparação', value: fleetCounts.manutencao, color: COLORS.manutencao },
      ].filter(d => d.value > 0);
      setFrotaPie(pieData);

      // ── 2. Candidaturas pendentes ────────────────────────────────────
      const { count: pendentes } = await supabase
        .from('motorista_candidaturas')
        .select('id', { count: 'exact', head: true })
        .in('status', ['submetido', 'em_analise']);

      setCandidaturasPendentes(pendentes || 0);

      // ── 3. Atividade & Rentabilidade ─────────────────────────────────
      // Buscar todas as associações ativas ou que terminaram no período
      const fromDate = range.from.toISOString().split('T')[0];
      const toDate = range.to.toISOString().split('T')[0];

      const { data: associacoes } = await supabase
        .from('motorista_viaturas')
        .select('data_inicio, data_fim, viaturas(valor_aluguer)')
        .lte('data_inicio', toDate)
        .or(`data_fim.is.null,data_fim.gte.${fromDate}`);

      const points = buildAtividadePoints(associacoes || [], range);
      setAtividadeData(points);

      // ── 5. Upgrades/Downgrades ────────────────────────────────────────
      const { data: upgradeEvents } = await supabase
        .from('calendario_eventos')
        .select('id, titulo, matricula_devolver')
        .eq('tipo', 'upgrade')
        .gte('data_inicio', fromStr)
        .lte('data_inicio', toStr);

      // Renda anterior = soma do valor_aluguer das viaturas devolvidas (substituídas)
      const matriculasDevolver = (upgradeEvents || [])
        .map((e: any) => e.matricula_devolver)
        .filter(Boolean);

      let rendaAnterior = 0;
      if (matriculasDevolver.length > 0) {
        const { data: viaturasAntigas } = await supabase
          .from('viaturas')
          .select('valor_aluguer')
          .in('matricula', matriculasDevolver);
        rendaAnterior = (viaturasAntigas || [])
          .reduce((sum, v) => sum + Number((v as any).valor_aluguer || 0), 0);
      }

      // Renda atual = soma do valor_aluguer das viaturas NOVAS dos upgrades (titulo = matrícula nova)
      const matriculasNovas = (upgradeEvents || [])
        .map((e: any) => e.titulo)
        .filter(Boolean);

      let rendaAtual = 0;
      if (matriculasNovas.length > 0) {
        const { data: viaturasNovas } = await supabase
          .from('viaturas')
          .select('valor_aluguer')
          .in('matricula', matriculasNovas);
        rendaAtual = (viaturasNovas || [])
          .reduce((sum, v) => sum + Number((v as any).valor_aluguer || 0), 0);
      }

      setUpgradeData({
        count: (upgradeEvents || []).length,
        rendaAtual,
        rendaAnterior,
      });

      // ── 6. Trocas ─────────────────────────────────────────────────────
      const { count: trocas } = await supabase
        .from('calendario_eventos')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'troca')
        .gte('data_inicio', fromStr)
        .lte('data_inicio', toStr);

      setTrocasCount(trocas || 0);

    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o dashboard.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [range, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Chart data builders ──────────────────────────────────────────────────

  function buildAtividadePoints(
    associacoes: { data_inicio: string; data_fim: string | null; viaturas: { valor_aluguer: number | null } | null }[],
    r: DateRange
  ): AtividadePoint[] {
    const diffDays = (r.to.getTime() - r.from.getTime()) / (1000 * 60 * 60 * 24);

    const calcBucket = (bucketStart: Date, bucketEnd: Date, label: string, periodo: string): AtividadePoint => {
      const bStartStr = bucketStart.toISOString().split('T')[0];
      const bEndStr = bucketEnd.toISOString().split('T')[0];

      // Rentabilidade: soma valor_aluguer das associações ativas no bucket
      const rentabilidade = associacoes
        .filter(a => a.data_inicio <= bEndStr && (a.data_fim == null || a.data_fim >= bStartStr))
        .reduce((sum, a) => sum + Number((a.viaturas as any)?.valor_aluguer || 0), 0);

      // Alugadas: associações que iniciaram no bucket
      const alugadas = associacoes.filter(a => a.data_inicio >= bStartStr && a.data_inicio <= bEndStr).length;

      // Devolvidas: associações que terminaram no bucket
      const devolvidas = associacoes.filter(a => a.data_fim != null && a.data_fim >= bStartStr && a.data_fim <= bEndStr).length;

      return { periodo, label, rentabilidade, alugadas, devolvidas };
    };

    if (diffDays <= 60) {
      const weeks = eachWeekOfInterval({ start: r.from, end: r.to }, { weekStartsOn: 1 });
      return weeks.map((weekStart, i) => {
        const weekEnd = i + 1 < weeks.length ? new Date(weeks[i + 1].getTime() - 1) : r.to;
        return calcBucket(
          weekStart, weekEnd,
          `Semana ${format(weekStart, 'dd MMM', { locale: pt })}`,
          format(weekStart, 'dd/MM', { locale: pt }),
        );
      });
    } else {
      const months = eachMonthOfInterval({ start: r.from, end: r.to });
      return months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        return calcBucket(
          monthStart, monthEnd,
          format(monthStart, 'MMMM yyyy', { locale: pt }),
          format(monthStart, 'MMM yy', { locale: pt }),
        );
      });
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const rendaDiff = formatPct(upgradeData.rendaAtual, upgradeData.rendaAnterior);
  const totalRentabilidade = atividadeData.reduce((sum, p) => sum + p.rentabilidade, 0);
  const totalAlugadas = atividadeData.reduce((sum, p) => sum + p.alugadas, 0);
  const totalDevolvidas = atividadeData.reduce((sum, p) => sum + p.devolvidas, 0);

  // ── Tooltip customizado ──────────────────────────────────────────────────

  const CustomTooltipAtividade = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = atividadeData.find(p => p.periodo === label);
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm space-y-1">
        <p className="font-medium text-foreground mb-1">{point?.label || label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.dataKey === 'rentabilidade' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  };

  const PRESET_LABELS: Record<PeriodPreset, string> = {
    semana: 'Esta Semana',
    mes: 'Este Mês',
    trimestre: 'Trimestre',
    ano: 'Este Ano',
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <StickyPageHeader
        title="Dashboard"
        description={`Visão geral da operação — ${format(range.from, "dd MMM", { locale: pt })} a ${format(range.to, "dd MMM yyyy", { locale: pt })}`}
        icon={LayoutDashboard}
      >
        {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map(p => (
          <Button
            key={p}
            variant={preset === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePreset(p)}
            className="h-9 px-4"
          >
            {PRESET_LABELS[p]}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchData}
          disabled={loading}
          title="Atualizar"
          className="ml-1"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </StickyPageHeader>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ── Linha 1: Viaturas + Candidaturas ─────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Disponíveis */}
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-green-500"
              onClick={() => navigate('/viaturas?status=disponivel')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disponíveis</span>
                  <Car className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-green-500">{fleet.disponiveis}</div>
                <p className="text-xs text-muted-foreground mt-1">de {fleet.total} viaturas</p>
              </CardContent>
            </Card>

            {/* Ocupadas */}
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-blue-500"
              onClick={() => navigate('/viaturas?status=em_uso')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ocupadas</span>
                  <Car className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-blue-500">{fleet.ocupadas}</div>
                <p className="text-xs text-muted-foreground mt-1">em circulação</p>
              </CardContent>
            </Card>

            {/* Em Reparação */}
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-amber-500"
              onClick={() => navigate('/viaturas?status=manutencao')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Reparação</span>
                  <Wrench className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-bold text-amber-500">{fleet.manutencao}</div>
                <p className="text-xs text-muted-foreground mt-1">em manutenção</p>
              </CardContent>
            </Card>

            {/* Candidatos Pendentes */}
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-violet-500"
              onClick={() => navigate('/motoristas/candidaturas')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Candidatos</span>
                  <ClipboardCheck className="h-4 w-4 text-violet-500" />
                </div>
                <div className="text-3xl font-bold text-violet-500">{candidaturasPendentes}</div>
                <div className="flex items-center gap-1 mt-1">
                  {candidaturasPendentes > 0 ? (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">Pendentes</Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">sem pendentes</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Linha 2: Atividade & Rentabilidade + Pie da Frota ────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Atividade & Rentabilidade combinado */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Atividade & Rentabilidade</CardTitle>
                    <CardDescription>Renda activa + movimentos de frota no período</CardDescription>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{formatCurrency(totalRentabilidade)}</div>
                      <p className="text-xs text-muted-foreground">renda total</p>
                    </div>
                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <span>Alugadas <strong className="text-foreground">{totalAlugadas}</strong></span>
                      <span>Devolvidas <strong className="text-foreground">{totalDevolvidas}</strong></span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {atividadeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Euro className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">Sem dados no período</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={atividadeData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="euro" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltipAtividade />} />
                      <Legend wrapperStyle={{ fontSize: 12 }}
                        formatter={v => v === 'rentabilidade' ? 'Renda (€)' : v === 'alugadas' ? 'Alugadas' : 'Devolvidas'}
                      />
                      <Bar yAxisId="euro" dataKey="rentabilidade" fill={COLORS.rentabilidade} radius={[4, 4, 0, 0]} name="rentabilidade" opacity={0.85} />
                      <Line yAxisId="count" type="monotone" dataKey="alugadas" stroke={COLORS.alugadas} strokeWidth={2} dot={{ r: 3 }} name="alugadas" />
                      <Line yAxisId="count" type="monotone" dataKey="devolvidas" stroke={COLORS.devolvidas} strokeWidth={2} dot={{ r: 3 }} name="devolvidas" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pie Frota */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estado da Frota</CardTitle>
                <CardDescription>Distribuição atual de {fleet.total} viaturas</CardDescription>
              </CardHeader>
              <CardContent>
                {frotaPie.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Car className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">Sem viaturas registadas</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={frotaPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {frotaPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {frotaPie.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Linha 4: Upgrade/Downgrade + Trocas ──────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Upgrade / Downgrade */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Upgrades / Downgrades
                </CardTitle>
                <CardDescription>Mudanças de viatura no período selecionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contador */}
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-primary">{upgradeData.count}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">trocas de categoria</p>
                    <p className="text-xs text-muted-foreground">registadas no calendário</p>
                  </div>
                </div>

                {/* Comparação de renda */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Renda de Viaturas</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Período Anterior</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(upgradeData.rendaAnterior)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Período Atual</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(upgradeData.rendaAtual)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    {upgradeData.rendaAnterior > 0 ? (
                      <>
                        {rendaDiff.up ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm font-semibold ${rendaDiff.up ? 'text-green-500' : 'text-red-500'}`}>
                          {rendaDiff.up ? '+' : '-'}{rendaDiff.pct.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">vs período anterior</span>
                        <span className={`text-sm font-medium ml-auto ${rendaDiff.up ? 'text-green-500' : 'text-red-500'}`}>
                          {rendaDiff.up ? '+' : ''}{formatCurrency(upgradeData.rendaAtual - upgradeData.rendaAnterior)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem dados do período anterior</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trocas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-orange-500" />
                  Trocas de Viatura
                </CardTitle>
                <CardDescription>Substituições de viatura no período selecionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contador grande */}
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-orange-500">{trocasCount}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">substituições</p>
                    <p className="text-xs text-muted-foreground">registadas no calendário</p>
                  </div>
                </div>

                {/* Métricas complementares */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atividade da Frota</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Alugadas</p>
                      <p className="text-lg font-bold text-blue-500">{totalAlugadas}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Devolvidas</p>
                      <p className="text-lg font-bold text-green-500">{totalDevolvidas}</p>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Saldo líquido</span>
                      <span className={`font-semibold ${totalAlugadas - totalDevolvidas >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {totalAlugadas - totalDevolvidas >= 0 ? '+' : ''}{totalAlugadas - totalDevolvidas} viaturas
                      </span>
                    </div>
                  </div>
                </div>

                {trocasCount === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-2">
                    Sem trocas registadas neste período
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
