import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  CalendarCheck,
  Plus,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEstacoes } from '@/hooks/useEstacoes';
import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type EstadoReserva =
  | 'pendente'
  | 'confirmada'
  | 'em_curso'
  | 'concluida'
  | 'cancelada'
  | 'expirada';

interface Reserva {
  id: string;
  codigo: number;
  matricula: string | null;
  grupo: string | null;
  estacao_entrega_id: string | null;
  estacao_recolha_id: string | null;
  data_inicio: string;
  data_fim: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  condutor_id: string | null;
  condutor_nome: string | null;
  estado: EstadoReserva;
  valor_total: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

type SortColumn =
  | 'codigo'
  | 'matricula'
  | 'grupo'
  | 'estacao_entrega_id'
  | 'data_inicio'
  | 'data_fim'
  | 'cliente_nome'
  | 'condutor_nome'
  | 'estado';
type SortDir = 'asc' | 'desc';

/** Normaliza matrícula: lowercase + ignora hífens e espaços */
const normalizeMatricula = (m: string) => m.toLowerCase().replace(/[-\s]/g, '');

const ESTADO_LABELS: Record<EstadoReserva, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  em_curso: 'Em Curso',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

const EstadoBadge = ({ estado }: { estado: EstadoReserva }) => {
  const styles: Record<EstadoReserva, string> = {
    pendente: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    confirmada: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    em_curso: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    concluida: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    cancelada: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
    expirada: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={cn('font-medium', styles[estado])}>
      {ESTADO_LABELS[estado]}
    </Badge>
  );
};

const formatDateTime = (iso: string) => {
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return iso;
  }
};

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const RentingReservas = () => {
  const { toast } = useToast();
  const { data: estacoes = [] } = useEstacoes({ apenasAtivas: false });

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Pesquisa por matrícula (separada, no topo)
  const [matriculaSearch, setMatriculaSearch] = useState('');

  // Filtros (barra acima do cabeçalho da tabela)
  const [codigoSearch, setCodigoSearch] = useState('');
  const [estacaoFilter, setEstacaoFilter] = useState<string>('todas');
  const [dataInicioFilter, setDataInicioFilter] = useState<string>('');
  const [dataFimFilter, setDataFimFilter] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<'todos' | EstadoReserva>('todos');

  // Ordenação (apenas uma coluna ativa de cada vez)
  const [sortColumn, setSortColumn] = useState<SortColumn>('codigo');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialog criar
  const [createOpen, setCreateOpen] = useState(false);

  // Map id → nome para mostrar/exportar estações
  const estacaoNomeById = useMemo(() => {
    const m = new Map<string, string>();
    estacoes.forEach((e) => m.set(e.id, e.nome));
    return m;
  }, [estacoes]);

  const getEstacaoNome = (id: string | null | undefined) =>
    id ? (estacaoNomeById.get(id) ?? '—') : '—';

  useEffect(() => {
    void loadReservas();
  }, []);

  const loadReservas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('codigo', { ascending: false });

      if (error) throw error;
      setReservas((data as Reserva[]) || []);
    } catch (error: any) {
      console.error('Erro ao carregar reservas:', error);
      toast({
        title: 'Erro ao carregar reservas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const matriculaNorm = normalizeMatricula(matriculaSearch.trim());
    const codigoNorm = codigoSearch.trim();
    // Datas vêm como YYYY-MM-DD do <input type="date">. Comparamos com r.data_*
    // a iniciar/terminar no dia indicado.
    const dataInicioMin = dataInicioFilter
      ? new Date(`${dataInicioFilter}T00:00:00`).getTime()
      : null;
    const dataFimMax = dataFimFilter ? new Date(`${dataFimFilter}T23:59:59.999`).getTime() : null;

    let result = reservas.filter((r) => {
      // Matrícula (case-insensitive, ignora "-" e espaços)
      if (matriculaNorm) {
        const matric = normalizeMatricula(r.matricula ?? '');
        if (!matric.includes(matriculaNorm)) return false;
      }

      // Código (texto numérico parcial)
      if (codigoNorm && !String(r.codigo).includes(codigoNorm)) {
        return false;
      }

      // Estação (entrega ou recolha)
      if (estacaoFilter !== 'todas') {
        if (r.estacao_entrega_id !== estacaoFilter && r.estacao_recolha_id !== estacaoFilter) {
          return false;
        }
      }

      // Data início >= dataInicioFilter (a reserva começa nesse dia ou depois)
      if (dataInicioMin !== null) {
        const t = new Date(r.data_inicio).getTime();
        if (Number.isNaN(t) || t < dataInicioMin) return false;
      }

      // Data fim <= dataFimFilter (a reserva acaba nesse dia ou antes)
      if (dataFimMax !== null) {
        const t = new Date(r.data_fim).getTime();
        if (Number.isNaN(t) || t > dataFimMax) return false;
      }

      // Estado
      if (estadoFilter !== 'todos' && r.estado !== estadoFilter) return false;

      return true;
    });

    result.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortColumn === 'estacao_entrega_id') {
        av = getEstacaoNome(a.estacao_entrega_id);
        bv = getEstacaoNome(b.estacao_entrega_id);
      } else {
        av = (a[sortColumn] ?? '') as string | number;
        bv = (b[sortColumn] ?? '') as string | number;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const comp = String(av).localeCompare(String(bv), 'pt');
      return sortDir === 'asc' ? comp : -comp;
    });

    return result;
  }, [
    reservas,
    matriculaSearch,
    codigoSearch,
    estacaoFilter,
    dataInicioFilter,
    dataFimFilter,
    estadoFilter,
    sortColumn,
    sortDir,
    getEstacaoNome,
  ]);

  const hasActiveFilters =
    !!codigoSearch ||
    estacaoFilter !== 'todas' ||
    !!dataInicioFilter ||
    !!dataFimFilter ||
    estadoFilter !== 'todos';

  const clearFilters = () => {
    setCodigoSearch('');
    setEstacaoFilter('todas');
    setDataInicioFilter('');
    setDataFimFilter('');
    setEstadoFilter('todos');
  };

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({
        title: 'Nada para exportar',
        description: 'A lista está vazia com os filtros atuais.',
      });
      return;
    }
    const headers = [
      'Código',
      'Matrícula',
      'Grupo',
      'Estação Entrega',
      'Estação Recolha',
      'Data Início',
      'Data Fim',
      'Cliente',
      'Condutor',
      'Estado',
      'Valor Total',
    ];
    const rows = filtered.map((r) => [
      r.codigo,
      r.matricula,
      r.grupo,
      getEstacaoNome(r.estacao_entrega_id),
      getEstacaoNome(r.estacao_recolha_id),
      formatDateTime(r.data_inicio),
      formatDateTime(r.data_fim),
      r.cliente_nome,
      r.condutor_nome,
      ESTADO_LABELS[r.estado],
      r.valor_total,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const SortableHead = ({
    column,
    label,
    className,
  }: {
    column: SortColumn;
    label: string;
    className?: string;
  }) => (
    <TableHead
      className={cn(
        'h-10 cursor-pointer select-none whitespace-nowrap hover:bg-muted/40 transition-colors text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className
      )}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column ? (
          sortDir === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="w-full">
      <StickyPageHeader
        title="Reservas"
        description="Lista de reservas de renting"
        icon={CalendarCheck}
      />

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {/* Barra de ações — canto sup. esq. (Criar/Exportar) + canto sup. dir. (pesquisa matrícula) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-b border-border/50">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Reserva
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={matriculaSearch}
                onChange={(e) => setMatriculaSearch(e.target.value)}
                placeholder="Pesquisar matrícula..."
                className="pl-9 bg-background"
              />
            </div>
          </div>

          {/* Barra de filtros — encostada por baixo das ações, por cima do cabeçalho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-3 border-b border-border/50 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Código
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={codigoSearch}
                  onChange={(e) => setCodigoSearch(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className="pl-8 h-9 bg-background"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Estação
              </label>
              <Select value={estacaoFilter} onValueChange={setEstacaoFilter}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Todas as estações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as estações</SelectItem>
                  {estacoes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Data Início
              </label>
              <Input
                type="date"
                value={dataInicioFilter}
                onChange={(e) => setDataInicioFilter(e.target.value)}
                className="h-9 bg-background"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Data Fim
              </label>
              <Input
                type="date"
                value={dataFimFilter}
                onChange={(e) => setDataFimFilter(e.target.value)}
                className="h-9 bg-background"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Estado
              </label>
              <div className="flex gap-2">
                <Select
                  value={estadoFilter}
                  onValueChange={(v) => setEstadoFilter(v as 'todos' | EstadoReserva)}
                >
                  <SelectTrigger className="h-9 bg-background flex-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={clearFilters}
                    title="Limpar filtros"
                    className="h-9 w-9 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tabela — cabeçalho sempre visível, body adapta-se ao estado */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <SortableHead column="codigo" label="Código" />
                  <SortableHead column="matricula" label="Matrícula" />
                  <SortableHead column="grupo" label="Grupo" />
                  <SortableHead column="estacao_entrega_id" label="Estação Entrega" />
                  <SortableHead column="data_inicio" label="Data Início" />
                  <SortableHead column="data_fim" label="Data Fim" />
                  <SortableHead column="cliente_nome" label="Cliente" />
                  <SortableHead column="condutor_nome" label="Condutor" />
                  <SortableHead column="estado" label="Estado" className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={9} className="py-16">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={9} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <CalendarCheck className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {reservas.length === 0
                            ? 'Ainda não há reservas. Cria a primeira!'
                            : 'Nenhuma reserva corresponde à pesquisa.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id} className="border-border hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">{r.codigo}</TableCell>
                      <TableCell className="text-foreground">{r.matricula ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.grupo ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {getEstacaoNome(r.estacao_entrega_id)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.data_inicio)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.data_fim)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.cliente_nome ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.condutor_nome ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <EstadoBadge estado={r.estado} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer com contagem */}
          <div className="px-4 py-3 border-t border-border/50 text-xs text-muted-foreground">
            {filtered.length} reserva{filtered.length === 1 ? '' : 's'} (de {reservas.length} no
            total)
          </div>
        </CardContent>
      </Card>

      {/* Dialog criar (placeholder vazio) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Criar Reserva</DialogTitle>
            <DialogDescription>Formulário em desenvolvimento — campos a definir.</DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-sm text-muted-foreground">Em construção</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentingReservas;
