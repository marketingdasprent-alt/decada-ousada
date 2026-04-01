import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, Edit } from "lucide-react";

interface ContractHistoryDialogProps {
  contratoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Reimpressao {
  id: string;
  reimpresso_em: string;
  reimpresso_por: string | null;
  motivo: string | null;
  nomeUsuario?: string;
}

interface Edicao {
  id: string;
  editado_em: string;
  editado_por: string | null;
  campos_alterados: any;
  observacoes: string | null;
  nomeUsuario?: string;
}

export function ContractHistoryDialog({ contratoId, open, onOpenChange }: ContractHistoryDialogProps) {
  const [reimpressoes, setReimpressoes] = useState<Reimpressao[]>([]);
  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, contratoId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      // Buscar reimpressões
      const { data: reimpData, error: reimpError } = await supabase
        .from('contratos_reimpressoes')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('reimpresso_em', { ascending: false });

      if (reimpError) throw reimpError;

      // Buscar edições
      const { data: edicoesData, error: edicoesError } = await supabase
        .from('contratos_edicoes')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('editado_em', { ascending: false });

      if (edicoesError) throw edicoesError;

      // Buscar nomes dos usuários
      const userIds = [
        ...(reimpData?.map(r => r.reimpresso_por).filter(Boolean) || []),
        ...(edicoesData?.map(e => e.editado_por).filter(Boolean) || [])
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);

      // Adicionar nomes dos usuários
      const reimpressoesComNomes = reimpData?.map(r => ({
        ...r,
        nomeUsuario: r.reimpresso_por ? profileMap.get(r.reimpresso_por) : null
      })) || [];

      const edicoesComNomes = edicoesData?.map(e => ({
        ...e,
        nomeUsuario: e.editado_por ? profileMap.get(e.editado_por) : null
      })) || [];

      setReimpressoes(reimpressoesComNomes);
      setEdicoes(edicoesComNomes);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico do Contrato</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando histórico...</p>
          ) : (
            <div className="space-y-6">
              {/* Histórico de Reimpressões */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Reimpressões ({reimpressoes.length})
                </h3>
                {reimpressoes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma reimpressão registrada</p>
                ) : (
                  <div className="space-y-3">
                    {reimpressoes.map((reimp) => (
                      <div key={reimp.id} className="bg-muted/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {reimp.nomeUsuario || 'Usuário desconhecido'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(reimp.reimpresso_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {reimp.motivo && (
                          <p className="text-sm text-muted-foreground">{reimp.motivo}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Histórico de Edições */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edições ({edicoes.length})
                </h3>
                {edicoes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma edição registrada</p>
                ) : (
                  <div className="space-y-3">
                    {edicoes.map((edicao) => (
                      <div key={edicao.id} className="bg-muted/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {edicao.nomeUsuario || 'Usuário desconhecido'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(edicao.editado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="space-y-2 mt-3">
                          {edicao.campos_alterados && typeof edicao.campos_alterados === 'object' && 
                            Object.entries(edicao.campos_alterados as Record<string, { antes: string; depois: string }>).map(([campo, valores]) => (
                              <div key={campo} className="text-sm">
                                <span className="font-medium">{campo}:</span>
                                <div className="ml-4 text-muted-foreground">
                                  <span className="line-through">{valores.antes}</span>
                                  {' → '}
                                  <span className="text-foreground">{valores.depois}</span>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                        {edicao.observacoes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">{edicao.observacoes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
