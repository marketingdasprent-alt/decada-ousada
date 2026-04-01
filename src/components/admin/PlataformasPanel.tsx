import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Loader2,
  Plus,
  Settings,
  Zap,
  Car,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { IntegracaoDialog } from './IntegracaoDialog';
import { IntegracaoDetailModal } from './IntegracaoDetailModal';
import type { IntegracaoConfig, PlataformaOperacional } from './integracoes/types';

export const PlataformasPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [integracoes, setIntegracoes] = useState<IntegracaoConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIntegracao, setSelectedIntegracao] = useState<IntegracaoConfig | null>(null);

  useEffect(() => {
    fetchIntegracoes();
  }, []);

  const fetchIntegracoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plataformas_configuracao')
        .select('*')
        .in('plataforma', ['bolt', 'uber'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegracoes((data || []) as IntegracaoConfig[]);
    } catch (error: any) {
      console.error('Erro ao carregar integrações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as plataformas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIntegracaoUpdated = (updatedIntegracao?: IntegracaoConfig) => {
    if (!updatedIntegracao) {
      fetchIntegracoes();
      return;
    }

    setIntegracoes((prev) =>
      prev.map((integracao) =>
        integracao.id === updatedIntegracao.id ? updatedIntegracao : integracao,
      ),
    );
    setSelectedIntegracao(updatedIntegracao);
  };

  const handleOpenDetail = (integracao: IntegracaoConfig) => {
    setSelectedIntegracao(integracao);
    setDetailModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedIntegracao(null);
    setDialogOpen(true);
  };

  const getPlataformaBadge = (plataforma: string) => {
    switch (plataforma) {
      case 'bolt':
        return (
          <Badge variant="secondary" className="gap-1">
            <Zap className="h-3 w-3" /> Bolt
          </Badge>
        );
      case 'uber':
        return (
          <Badge variant="secondary" className="gap-1">
            <Car className="h-3 w-3" /> Uber
          </Badge>
        );
      default:
        return <Badge variant="secondary">{plataforma}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Plataformas
              </CardTitle>
              <CardDescription>
                Configure integrações com plataformas TVDE como Bolt e Uber.
              </CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Integração
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {integracoes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Zap className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Nenhuma plataforma configurada.</p>
              <p className="text-sm">Clique em &quot;Nova Integração&quot; para adicionar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Última actividade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integracoes.map((integracao) => {
                  const lastActivity = integracao.plataforma === 'uber'
                    ? integracao.last_webhook_at ?? integracao.ultimo_sync
                    : integracao.ultimo_sync;

                  return (
                    <TableRow key={integracao.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{integracao.nome}</p>
                          {integracao.company_name && (
                            <p className="text-sm text-muted-foreground">{integracao.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPlataformaBadge(integracao.plataforma as PlataformaOperacional)}</TableCell>
                      <TableCell className="text-center">
                        {integracao.ativo ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" /> Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lastActivity ? (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(lastActivity), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDetail(integracao)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IntegracaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchIntegracoes}
      />

      {selectedIntegracao && (
        <IntegracaoDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          integracao={selectedIntegracao}
          onUpdate={handleIntegracaoUpdated}
        />
      )}
    </>
  );
};
