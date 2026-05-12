import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Eye, Calendar, Loader2, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Relatorio {
  id: string;
  descricao: string;
  periodo_referencia: string;
  valor_total: number;
  ficheiro_url: string;
  created_at: string;
}

interface MotoristaRelatoriosCardProps {
  motoristaId: string;
}

export function MotoristaRelatoriosCard({ motoristaId }: MotoristaRelatoriosCardProps) {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadRelatorios();
  }, [motoristaId]);

  async function loadRelatorios() {
    try {
      const { data, error } = await supabase
        .from("motorista_recibos")
        .select("*")
        .eq("motorista_id", motoristaId)
        .eq("tipo", "relatorio")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRelatorios(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(url: string, nome: string) {
    try {
      const { data, error } = await supabase.storage
        .from("motorista-recibos")
        .createSignedUrl(url, 3600);

      if (error) throw error;
      
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nome || "relatorio.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast.success("Download iniciado");
    } catch (error) {
      console.error("Erro ao descarregar relatório:", error);
      toast.error("Erro ao descarregar relatório");
    }
  }

  async function handleView(url: string) {
    try {
      const { data, error } = await supabase.storage
        .from("motorista-recibos")
        .createSignedUrl(url, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Erro ao visualizar relatório:", error);
      toast.error("Erro ao visualizar relatório");
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  }

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-[2rem]" />;
  }

  return (
    <>
      <Card 
        className="shadow-sm rounded-[2rem] overflow-hidden border-border bg-background hover:border-primary/40 transition-all cursor-pointer group"
        onClick={() => setModalOpen(true)}
      >
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Relatórios Semanais</p>
                <h3 className="text-2xl font-black text-foreground">
                  {relatorios.length} {relatorios.length === 1 ? 'disponível' : 'disponíveis'}
                </h3>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] border-border bg-background p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-0">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              Histórico de Relatórios
            </DialogTitle>
          </DialogHeader>

          <div className="p-8 pt-6">
            {relatorios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold text-foreground">Sem relatórios</p>
                <p className="text-xs">Os seus resumos semanais aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                {relatorios.map((relatorio) => (
                  <div 
                    key={relatorio.id} 
                    className="flex items-center justify-between p-5 bg-muted/30 hover:bg-muted/50 rounded-2xl border border-border transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{relatorio.descricao}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                          {format(new Date(relatorio.created_at), "dd MMM yyyy", { locale: pt })} • {formatCurrency(relatorio.valor_total)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl bg-background border border-border hover:border-primary/20 hover:text-primary transition-all"
                        onClick={() => handleView(relatorio.ficheiro_url)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl bg-background border border-border hover:border-primary/20 hover:text-primary transition-all"
                        onClick={() => handleDownload(relatorio.ficheiro_url, `Relatorio_${relatorio.periodo_referencia}.pdf`)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8">
              <Button 
                variant="outline" 
                className="w-full rounded-xl font-bold py-6 border-border"
                onClick={() => setModalOpen(false)}
              >
                Fechar Histórico
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
