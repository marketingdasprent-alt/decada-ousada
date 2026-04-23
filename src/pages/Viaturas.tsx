import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Car,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ViaturaStatsCards } from '@/components/viaturas/ViaturaStatsCards';
import { DeleteViaturaDialog } from '@/components/viaturas/DeleteViaturaDialog';
import { ImportViaturasDialog } from '@/components/viaturas/ImportViaturasDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCategoriaBadgeClass, getStatusBadgeClass, getStatusLabel } from '@/lib/viaturas';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';

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
  data_venda?: string | null;
  proprietario_id?: string | null;
  is_vendida?: boolean | null;
}

type SortColumn = 'matricula' | 'marca' | 'ano' | 'km_atual' | 'status';
type SortDirection = 'asc' | 'desc';

export default function Viaturas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('status') || 'all');
  const [mostrarVendidas, setMostrarVendidas] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [combustivelFilter, setCombustivelFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('matricula');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Dialog states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    loadViaturas();
  }, []);

  const loadViaturas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viaturas')
        .select('*')
        .order('matricula');

      if (error) throw error;
      setViaturas(data || []);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      toast.error('Erro ao carregar viaturas');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: viaturas.length,
      disponiveis: viaturas.filter((v) => v.status === 'disponivel' && !v.is_vendida).length,
      emUso: viaturas.filter((v) => v.status === 'em_uso' && !v.is_vendida).length,
      manutencao: viaturas.filter((v) => v.status === 'manutencao' && !v.is_vendida).length,
      vendidas: viaturas.filter((v) => v.is_vendida).length,
    };
  }, [viaturas]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  const filteredViaturas = useMemo(() => {
    let result = [...viaturas];

    // Ocultar vendidas por defeito
    if (!mostrarVendidas) {
      result = result.filter(v => !v.is_vendida);
    }

    // Filtro de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        v =>
          v.matricula.toLowerCase().includes(term) ||
          v.marca.toLowerCase().includes(term) ||
          v.modelo.toLowerCase().includes(term)
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      result = result.filter(v => v.status === statusFilter);
    }

    // Filtro de categoria
    if (categoriaFilter !== 'all') {
      result = result.filter(v => v.categoria === categoriaFilter);
    }

    // Filtro de combustível
    if (combustivelFilter !== 'all') {
      result = result.filter(v => v.combustivel === combustivelFilter);
    }

    // Ordenação
    result.sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [viaturas, searchTerm, statusFilter, categoriaFilter, combustivelFilter, sortColumn, sortDirection, mostrarVendidas]);

  const getCategoriaColor = (categoria: string | null | undefined) => getCategoriaBadgeClass(categoria);

  const getStatusColor = (status: string | null | undefined) => getStatusBadgeClass(status);

  const getStatusText = (status: string | null | undefined) => getStatusLabel(status);

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

  const handleDeleteClick = (viatura: Viatura) => {
    setSelectedViatura(viatura);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedViatura) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('viaturas')
        .delete()
        .eq('id', selectedViatura.id);

      if (error) throw error;
      toast.success('Viatura eliminada com sucesso!');
      setDeleteOpen(false);
      loadViaturas();
    } catch (error: any) {
      console.error('Erro ao eliminar viatura:', error);
      toast.error('Erro ao eliminar viatura');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleNewViatura = () => {
    navigate('/viaturas/nova');
  };

  const handleViewPage = (viatura: Viatura) => {
    navigate(`/viaturas/${viatura.id}`);
  };

  return (
    <div className="space-y-6">
      <StickyPageHeader
        title="Frota de Viaturas"
        description="Gestão completa da frota de veículos"
        icon={Car}
      >
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ImportViaturasDialog onImportComplete={loadViaturas} />
          <Button onClick={handleNewViatura} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Viatura
          </Button>
        </div>
      </StickyPageHeader>

      {/* Stats Cards */}
      <ViaturaStatsCards
        stats={stats}
        activeFilter={statusFilter}
        onFilter={(filter) => {
          if (filter === 'vendida') {
            setMostrarVendidas(true);
            setStatusFilter('all');
          } else {
            setStatusFilter(filter);
            setMostrarVendidas(false);
          }
        }}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por matrícula, marca ou modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="em_uso">Em Uso</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="green">Green</SelectItem>
            <SelectItem value="comfort">Comfort</SelectItem>
            <SelectItem value="black">Black</SelectItem>
            <SelectItem value="x-saver">X-Saver</SelectItem>
          </SelectContent>
        </Select>
        <Select value={combustivelFilter} onValueChange={setCombustivelFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Combustível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="eletrico">Elétrico</SelectItem>
            <SelectItem value="hibrido">Híbrido</SelectItem>
            <SelectItem value="gasolina">Gasolina</SelectItem>
            <SelectItem value="diesel">Diesel</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-1 shrink-0">
          <Switch
            id="mostrar-vendidas"
            checked={mostrarVendidas}
            onCheckedChange={setMostrarVendidas}
          />
          <Label htmlFor="mostrar-vendidas" className="text-sm cursor-pointer whitespace-nowrap text-muted-foreground">
            Mostrar vendidas {mostrarVendidas && `(${stats.vendidas})`}
          </Label>
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">A carregar viaturas...</p>
        </div>
      ) : filteredViaturas.length === 0 ? (
        <div className="text-center py-12">
          <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || categoriaFilter !== 'all'
              ? 'Nenhuma viatura encontrada com os filtros aplicados.'
              : 'Ainda não existem viaturas registadas.'}
          </p>
        </div>
      ) : isMobile ? (
        // Mobile: Cards
        <div className="space-y-3">
          {filteredViaturas.map((viatura) => (
            <Card key={viatura.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold text-lg">{viatura.matricula}</p>
                    <p className="text-sm text-muted-foreground">
                      {viatura.marca} {viatura.modelo} {viatura.ano && `(${viatura.ano})`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getCategoriaColor(viatura.categoria)}>
                      {viatura.categoria || 'N/D'}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(viatura.status)}>
                       {getStatusText(viatura.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{viatura.km_atual?.toLocaleString('pt-PT') || '0'} km</span>
                    <span className="capitalize">{viatura.combustivel || 'N/D'}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleViewPage(viatura)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleViewPage(viatura)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(viatura)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {(isExpired(viatura.inspecao_validade) || isExpired(viatura.seguro_validade)) && (
                  <div className="mt-2 flex items-center gap-1 text-destructive text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Documentação expirada</span>
                  </div>
                )}
                {(isExpiringSoon(viatura.inspecao_validade) || isExpiringSoon(viatura.seguro_validade)) && 
                  !isExpired(viatura.inspecao_validade) && !isExpired(viatura.seguro_validade) && (
                  <div className="mt-2 flex items-center gap-1 text-yellow-500 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Documentação a expirar</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop: Table
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="h-10">
                <TableHead 
                  className="h-10 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('matricula')}
                >
                  <div className="flex items-center gap-2 text-xs">
                    Matrícula
                    {getSortIcon('matricula')}
                  </div>
                </TableHead>
                <TableHead 
                  className="h-10 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('marca')}
                >
                  <div className="flex items-center gap-2 text-xs">
                    Marca/Modelo
                    {getSortIcon('marca')}
                  </div>
                </TableHead>
                <TableHead 
                  className="h-10 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('ano')}
                >
                  <div className="flex items-center gap-2 text-xs">
                    Ano
                    {getSortIcon('ano')}
                  </div>
                </TableHead>
                <TableHead className="h-10 text-xs">Categoria</TableHead>
                <TableHead className="h-10 text-xs">Combustível</TableHead>
                <TableHead 
                  className="h-10 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2 text-xs">
                    Status
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead 
                  className="h-10 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('km_atual')}
                >
                  <div className="flex items-center gap-2 text-xs">
                    Km
                    {getSortIcon('km_atual')}
                  </div>
                </TableHead>
                <TableHead className="h-10 text-xs">Inspeção</TableHead>
                <TableHead className="h-10 text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredViaturas.map((viatura) => (
                <TableRow 
                  key={viatura.id} 
                  className="cursor-pointer hover:bg-muted/50 h-10"
                  onClick={() => handleViewPage(viatura)}
                >
                  <TableCell className="py-2 text-sm font-mono font-bold">
                    {viatura.matricula}
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    {viatura.marca} {viatura.modelo}
                  </TableCell>
                  <TableCell className="py-2 text-sm">{viatura.ano || 'N/D'}</TableCell>
                  <TableCell className="py-2">
                    <Badge className={`text-xs ${getCategoriaColor(viatura.categoria)}`}>
                      {viatura.categoria || 'N/D'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-sm capitalize">
                    {viatura.combustivel || 'N/D'}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={`text-xs ${getStatusColor(viatura.status)}`}>
                       {getStatusText(viatura.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    {viatura.km_atual?.toLocaleString('pt-PT') || '0'}
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    <div className="flex items-center gap-1">
                      {isExpired(viatura.inspecao_validade) && (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                      {isExpiringSoon(viatura.inspecao_validade) && !isExpired(viatura.inspecao_validade) && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                      {viatura.inspecao_validade 
                        ? format(new Date(viatura.inspecao_validade), 'dd/MM/yyyy', { locale: pt })
                        : 'N/D'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleViewPage(viatura)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleViewPage(viatura)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteClick(viatura)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}

      <DeleteViaturaDialog
        viatura={selectedViatura}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
