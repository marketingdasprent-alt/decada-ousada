import { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  FileSignature,
  Download,
  Printer,
  Eye,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Files,
  Briefcase,
  Pencil,
  Save,
  X,
  Loader2,
  RotateCcw,
  History,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionCard } from '@/components/ui/section-card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmpresas } from '@/hooks/useEmpresas';
import { usePermissions } from '@/hooks/usePermissions';
import { generateDocumentFromTemplate } from '@/utils/generateDocumentFromTemplate';
import { GenerateDocumentsDialog } from '../GenerateDocumentsDialog';
import { EditContractDialog } from '@/components/contratos/EditContractDialog';
import type { Motorista } from '@/pages/Motoristas';

interface Contrato {
  id: string;
  empresa_id: string;
  motorista_nome: string;
  data_assinatura: string;
  data_inicio: string;
  cidade_assinatura: string;
  duracao_meses: number;
  status: string;
  versao: number;
  documento_url: string | null;
  template_id: string | null;
  criado_em: string;
  numero_contrato: number | null;
  viatura_id: string | null;
  viaturas: { matricula: string; marca: string; modelo: string } | null;
}

interface MotoristaTabContratosProps {
  motorista: Motorista;
  onMotoristaUpdated?: () => void;
}

export function MotoristaTabContratos({
  motorista,
  onMotoristaUpdated,
}: MotoristaTabContratosProps) {
  const { hasPermission } = usePermissions();
  const { getById: getEmpresaById } = useEmpresas();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [editingContratual, setEditingContratual] = useState(false);
  const [dataContratacao, setDataContratacao] = useState(motorista.data_contratacao || '');
  const [renovarContrato, setRenovarContrato] = useState<Contrato | null>(null);
  const [renovando, setRenovando] = useState(false);
  const [editContrato, setEditContrato] = useState<Contrato | null>(null);

  useEffect(() => {
    loadContratos();
  }, [motorista.id]);

  // Sincronizar estado local quando os dados do motorista mudarem (ex: após um save)
  useEffect(() => {
    setDataContratacao(sanitizeDate(motorista.data_contratacao));
  }, [motorista.data_contratacao]);

  const loadContratos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contratos')
        .select('*, viaturas:viatura_id(matricula, marca, modelo)')
        .eq('motorista_id', motorista.id)
        .order('versao', { ascending: false });

      if (error) throw error;
      setContratos((data || []) as Contrato[]);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  const getEmpresaNome = (empresaId: string) => {
    return getEmpresaById(empresaId)?.nome || empresaId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default">Ativo</Badge>;
      case 'substituido':
        return <Badge variant="secondary">Substituído</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'encerrado':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Encerrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownload = async (contrato: Contrato) => {
    if (!contrato.documento_url) {
      toast.error('Documento não encontrado');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .download(contrato.documento_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato_${motorista.nome}_${contrato.empresa_id}_v${contrato.versao}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao fazer download do contrato');
    }
  };

  const handleReimprimir = async (contrato: Contrato) => {
    if (!contrato.template_id) {
      toast.error('Template não encontrado para reimprimir');
      return;
    }

    setGenerating(contrato.id);

    try {
      await generateDocumentFromTemplate({
        templateId: contrato.template_id,
        motoristaData: {
          nome: motorista.nome,
          nif: motorista.nif,
          email: motorista.email,
          telefone: motorista.telefone,
          morada: motorista.morada,
          documento_tipo: motorista.documento_tipo,
          documento_numero: motorista.documento_numero,
        },
        documentData: {
          data_assinatura: contrato.data_assinatura,
          data_inicio: contrato.data_inicio,
          cidade_assinatura: contrato.cidade_assinatura,
        },
        action: 'print',
      });
    } catch (error) {
      console.error('Erro ao reimprimir:', error);
      toast.error('Erro ao reimprimir contrato');
    } finally {
      setGenerating(null);
    }
  };

  const handleView = async (contrato: Contrato) => {
    if (!contrato.documento_url) {
      toast.error('Documento não encontrado');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(contrato.documento_url, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar contrato:', error);
      toast.error('Erro ao abrir contrato');
    }
  };

  const handleContractGenerated = () => {
    setGenerateDialogOpen(false);
    loadContratos();
  };

  const handleRenovar = async () => {
    if (!renovarContrato) return;
    setRenovando(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const today = new Date().toISOString().split('T')[0];

      const { data: result, error } = await supabase.rpc('gerar_contrato_atomico', {
        p_motorista_id: motorista.id,
        p_empresa_id: renovarContrato.empresa_id,
        p_motorista_nome: motorista.nome,
        p_motorista_nif: motorista.nif || null,
        p_motorista_email: motorista.email || null,
        p_motorista_telefone: motorista.telefone || null,
        p_motorista_morada: motorista.morada || null,
        p_motorista_documento_tipo: motorista.documento_tipo || null,
        p_motorista_documento_numero: motorista.documento_numero || null,
        p_cidade_assinatura: renovarContrato.cidade_assinatura || 'Leiria',
        p_data_assinatura: today,
        p_data_inicio: today,
        p_duracao_meses: renovarContrato.duracao_meses || 12,
        p_criado_por: user?.id || null,
        p_force_new_version: true,
      });

      if (error) throw error;

      // Se o contrato antigo tinha viatura, associar ao novo + atualizar motorista_viaturas
      const novoContrato = Array.isArray(result) ? result[0] : result;
      if (novoContrato?.id && renovarContrato.viatura_id) {
        await supabase
          .from('contratos')
          .update({ viatura_id: renovarContrato.viatura_id })
          .eq('id', novoContrato.id);

        // Sincronizar contrato_prestacao_assinatura na associação ativa
        await supabase
          .from('motorista_viaturas')
          .update({ contrato_prestacao_assinatura: today })
          .eq('motorista_id', motorista.id)
          .eq('status', 'ativo');
      }

      toast.success('Contrato renovado com sucesso');
      setRenovarContrato(null);
      loadContratos();
    } catch (err: any) {
      console.error('Erro ao renovar contrato:', err);
      toast.error(err.message || 'Erro ao renovar contrato');
    } finally {
      setRenovando(false);
    }
  };

  // Função para garantir que a data está no formato YYYY-MM-DD para o input
  const sanitizeDate = (dateString: string | null) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  const handleSaveContratual = async () => {
    try {
      const formattedDate = sanitizeDate(dataContratacao);

      const { error } = await supabase
        .from('motoristas_ativos')
        .update({
          data_contratacao: formattedDate || null,
          cidade_assinatura: null,
        })
        .eq('id', motorista.id);

      if (error) throw error;
      toast.success('Informação contratual atualizada');
      setEditingContratual(false);
      onMotoristaUpdated?.();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar informação contratual');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  // Stats
  const totalContratos = contratos.length;
  const ativos = contratos.filter((c) => c.status === 'ativo').length;
  const inativos = contratos.filter((c) => c.status !== 'ativo').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">A carregar contratos...</div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total',
      value: totalContratos,
      icon: Files,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Ativos',
      value: ativos,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Inativos',
      value: inativos,
      icon: XCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Info Contratual */}
      <SectionCard
        icon={<Briefcase className="h-4 w-4" />}
        title="Info Contratual"
        headerClassName="bg-teal-50 dark:bg-teal-950/30"
      >
        {editingContratual ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de Contratação</Label>
                <Input
                  type="date"
                  value={dataContratacao}
                  onChange={(e) => setDataContratacao(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingContratual(false);
                  setDataContratacao(motorista.data_contratacao || '');
                }}
              >
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveContratual}>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Data de Contratação</span>
                <p className="font-medium">{formatDate(motorista.data_contratacao)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditingContratual(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {statsCards.map((card) => (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de Contratos in SectionCard */}
      <SectionCard
        icon={<FileSignature className="h-4 w-4" />}
        title="Contratos"
        headerClassName="bg-emerald-50 dark:bg-emerald-950/30"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Lista de contratos gerados para este motorista.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadContratos}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            {hasPermission('contratos_criar') && (
              <Button size="sm" onClick={() => setGenerateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Gerar Documentos
              </Button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Nº</TableHead>
              <TableHead>Empresa / Viatura</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <FileSignature className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Nenhum contrato gerado.</p>
                </TableCell>
              </TableRow>
            ) : (
              contratos.map((contrato) => (
                <TableRow
                  key={contrato.id}
                  className={
                    contrato.status === 'substituido' || contrato.status === 'encerrado'
                      ? 'opacity-60'
                      : ''
                  }
                >
                  <TableCell>
                    {contrato.numero_contrato != null ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        CT-{String(contrato.numero_contrato).padStart(4, '0')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{getEmpresaNome(contrato.empresa_id)}</div>
                    {contrato.viaturas && (
                      <div className="text-xs text-muted-foreground">
                        {contrato.viaturas.matricula
                          .replace(/[-\s]/g, '')
                          .replace(/.{2}/g, '$& ')
                          .trim()}{' '}
                        — {contrato.viaturas.marca} {contrato.viaturas.modelo}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(contrato.data_inicio), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Assin. {format(new Date(contrato.data_assinatura), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const dataFim = addMonths(
                        new Date(contrato.data_inicio),
                        contrato.duracao_meses || 12
                      );
                      const isExpired = dataFim < new Date();
                      const diffDays = Math.ceil(
                        (dataFim.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const isNearExpiry = diffDays >= 0 && diffDays <= 60;
                      return (
                        <div>
                          <div
                            className={`text-sm ${contrato.status === 'ativo' && isExpired ? 'text-destructive font-medium' : contrato.status === 'ativo' && isNearExpiry ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}
                          >
                            {format(dataFim, 'dd/MM/yyyy')}
                          </div>
                          {contrato.status === 'ativo' && (
                            <div
                              className={`text-[10px] ${isExpired ? 'text-destructive' : isNearExpiry ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}
                            >
                              {isExpired ? 'Expirado' : `${diffDays}d restantes`}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {contrato.status === 'ativo' && hasPermission('contratos_criar') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRenovarContrato(contrato)}
                          title="Renovar contrato"
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {contrato.status === 'ativo' && hasPermission('contratos_criar') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditContrato(contrato)}
                          title="Editar contrato"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(contrato)}
                        disabled={!contrato.documento_url}
                        title={contrato.documento_url ? 'Visualizar PDF' : 'PDF não disponível'}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(contrato)}
                        disabled={!contrato.documento_url}
                        title={contrato.documento_url ? 'Download PDF' : 'PDF não disponível'}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {contrato.template_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReimprimir(contrato)}
                          disabled={generating === contrato.id}
                          title="Reimprimir"
                        >
                          <Printer
                            className={`h-4 w-4 ${generating === contrato.id ? 'animate-pulse' : ''}`}
                          />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Dialog de renovação */}
      <Dialog
        open={!!renovarContrato}
        onOpenChange={(open) => {
          if (!open) setRenovarContrato(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-500" />
              Renovar Contrato
            </DialogTitle>
          </DialogHeader>
          {renovarContrato && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-sm space-y-1">
                <p className="font-medium text-blue-700 dark:text-blue-300">
                  {renovarContrato.numero_contrato != null &&
                    `CT-${String(renovarContrato.numero_contrato).padStart(4, '0')} · `}
                  Versão {renovarContrato.versao}
                </p>
                <p className="text-blue-600/80 dark:text-blue-400/80 text-xs">
                  Início: {format(new Date(renovarContrato.data_inicio), 'dd/MM/yyyy')} · Fim:{' '}
                  {format(
                    addMonths(
                      new Date(renovarContrato.data_inicio),
                      renovarContrato.duracao_meses || 12
                    ),
                    'dd/MM/yyyy'
                  )}
                </p>
                {renovarContrato.viaturas && (
                  <p className="text-blue-600/80 dark:text-blue-400/80 text-xs">
                    Viatura: {renovarContrato.viaturas.matricula} — {renovarContrato.viaturas.marca}{' '}
                    {renovarContrato.viaturas.modelo}
                  </p>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Ao renovar:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  <li>
                    O contrato atual passa a <strong>Substituído</strong>
                  </li>
                  <li>
                    Um novo contrato (versão {renovarContrato.versao + 1}) é criado com data de hoje
                  </li>
                  <li>
                    Mesma empresa, viatura e duração de {renovarContrato.duracao_meses || 12} meses
                  </li>
                  <li>O histórico do contrato anterior fica preservado</li>
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRenovarContrato(null)}
                  disabled={renovando}
                >
                  Cancelar
                </Button>
                <Button onClick={handleRenovar} disabled={renovando}>
                  {renovando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A renovar...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Renovar Contrato
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edição */}
      {editContrato && (
        <EditContractDialog
          contrato={editContrato}
          open={!!editContrato}
          onOpenChange={(open) => {
            if (!open) setEditContrato(null);
          }}
          onSuccess={() => {
            setEditContrato(null);
            loadContratos();
          }}
        />
      )}

      {/* Dialog para gerar documentos */}
      <GenerateDocumentsDialog
        open={generateDialogOpen}
        onOpenChange={(open) => {
          setGenerateDialogOpen(open);
          if (!open) loadContratos();
        }}
        motorista={motorista}
      />
    </div>
  );
}
