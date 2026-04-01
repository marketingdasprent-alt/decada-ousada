import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
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
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

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
}

export const MotoristaRecibosSection: React.FC<MotoristaRecibosSectionProps> = ({
  motoristaId,
}) => {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  useEffect(() => {
    loadRecibos();
  }, [motoristaId]);

  const loadRecibos = async () => {
    setLoading(true);
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
      toast.error('Erro ao carregar recibos');
    } finally {
      setLoading(false);
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
      console.error('Erro ao visualizar recibo:', error);
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
      console.error('Erro ao descarregar recibo:', error);
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
      console.error('Erro ao validar recibo:', error);
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
      console.error('Erro ao rejeitar recibo:', error);
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

  const formatCodigo = (codigo: number | null) => {
    if (!codigo) return '-';
    return `#${String(codigo).padStart(4, '0')}`;
  };

  const recibosFiltrados = recibos.filter(recibo => {
    if (filtroStatus !== 'todos' && recibo.status !== filtroStatus) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-32">
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

      {/* Tabela */}
      {recibosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum recibo verde encontrado</p>
          <p className="text-sm mt-1">Os recibos verdes serão submetidos pelo motorista no painel dele.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recibosFiltrados.map((recibo) => (
                <TableRow key={recibo.id}>
                  <TableCell className="text-sm font-mono font-bold text-primary">
                    {formatCodigo(recibo.codigo)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(recibo.created_at), 'dd/MM/yyyy', { locale: pt })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{recibo.descricao}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {recibo.semana_referencia_inicio ? (
                      (() => {
                        const inicio = new Date(recibo.semana_referencia_inicio);
                        const fim = addDays(inicio, 6);
                        return `${format(inicio, "dd MMM", { locale: pt })} - ${format(fim, "dd MMM", { locale: pt })}`;
                      })()
                    ) : (
                      recibo.periodo_referencia || '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {recibo.valor_total ? `€${recibo.valor_total.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(recibo.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVisualizar(recibo.ficheiro_url)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(recibo.ficheiro_url, recibo.nome_ficheiro)}
                        title="Descarregar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {recibo.status === 'submetido' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => handleValidar(recibo.id)}
                            title="Validar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleRejeitar(recibo.id)}
                            title="Rejeitar"
                          >
                            <X className="h-4 w-4" />
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
  );
};
