import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
  Camera,
  Film,
  Loader2,
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
import type { Motorista } from '@/pages/Motoristas';

interface Contrato {
  id: string;
  empresa_id: string;
  motorista_nome: string;
  data_assinatura: string;
  data_inicio: string;
  cidade_assinatura: string;
  status: string;
  versao: number;
  documento_url: string | null;
  template_id: string | null;
  criado_em: string;
  numero_contrato: number | null;
  viatura_id: string | null;
  viaturas: { matricula: string; marca: string; modelo: string } | null;
}

interface ContratoMedia {
  id: string;
  tipo: 'checkout' | 'checkin';
  url: string;
  nome_ficheiro: string | null;
  tipo_ficheiro: string | null;
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
  const [mediaDialogContrato, setMediaDialogContrato] = useState<Contrato | null>(null);
  const [mediaItems, setMediaItems] = useState<ContratoMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaSignedUrls, setMediaSignedUrls] = useState<Record<string, string>>({});

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
        .order('numero_contrato', { ascending: false });

      if (error) throw error;
      setContratos((data || []) as Contrato[]);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async (contrato: Contrato) => {
    setMediaDialogContrato(contrato);
    setMediaItems([]);
    setMediaSignedUrls({});
    setLoadingMedia(true);
    try {
      const { data, error } = await supabase
        .from('contrato_media')
        .select('id, tipo, url, nome_ficheiro, tipo_ficheiro')
        .eq('contrato_id', contrato.id)
        .order('created_at');
      if (error) throw error;
      const items = (data || []) as ContratoMedia[];
      setMediaItems(items);

      // Generate signed URLs for all items
      const urls: Record<string, string> = {};
      await Promise.all(
        items.map(async (item) => {
          const { data: signed } = await supabase.storage
            .from('contrato-media')
            .createSignedUrl(item.url, 3600);
          if (signed?.signedUrl) urls[item.id] = signed.signedUrl;
        })
      );
      setMediaSignedUrls(urls);
    } catch {
      toast.error('Erro ao carregar fotos');
    } finally {
      setLoadingMedia(false);
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
              <TableHead>Data Assinatura</TableHead>
              <TableHead>Data Início</TableHead>
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
                  <TableCell>{format(new Date(contrato.data_assinatura), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{format(new Date(contrato.data_inicio), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => loadMedia(contrato)}
                        title="Ver fotos"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      {contrato.documento_url && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(contrato)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(contrato)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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

      {/* Media dialog */}
      <Dialog
        open={!!mediaDialogContrato}
        onOpenChange={(open) => {
          if (!open) setMediaDialogContrato(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Fotos do Contrato{' '}
              {mediaDialogContrato?.numero_contrato != null && (
                <Badge variant="outline" className="font-mono ml-2">
                  CT-{String(mediaDialogContrato.numero_contrato).padStart(4, '0')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingMedia ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma foto ou vídeo registado neste contrato.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(['checkout', 'checkin'] as const).map((tipo) => {
                const items = mediaItems.filter((m) => m.tipo === tipo);
                if (items.length === 0) return null;
                return (
                  <div key={tipo}>
                    <p className="text-sm font-medium text-muted-foreground capitalize mb-2">
                      {tipo}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {items.map((item) => {
                        const signedUrl = mediaSignedUrls[item.id];
                        const isVideo = item.tipo_ficheiro?.startsWith('video/');
                        return (
                          <a
                            key={item.id}
                            href={signedUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="relative rounded-lg overflow-hidden border border-border aspect-square bg-muted block"
                          >
                            {signedUrl && !isVideo ? (
                              <img
                                src={signedUrl}
                                alt={item.nome_ficheiro || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full gap-1 p-2">
                                <Film className="h-6 w-6 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
                                  {item.nome_ficheiro}
                                </span>
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
