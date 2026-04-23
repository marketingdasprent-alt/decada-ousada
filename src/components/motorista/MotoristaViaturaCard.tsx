import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Car, 
  Calendar, 
  Fuel, 
  FileText, 
  Eye, 
  Download, 
  AlertCircle,
  X,
  ShieldCheck,
  ClipboardCheck,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  categoria: string;
  combustivel: string;
}

interface MotoristaViatura {
  id: string;
  data_inicio: string;
  viatura: Viatura;
}

interface ViaturaDocumento {
  id: string;
  tipo_documento: string;
  nome_ficheiro: string | null;
  ficheiro_url: string;
  data_validade: string | null;
}

interface MotoristaViaturaCardProps {
  motoristaId: string;
}

export function MotoristaViaturaCard({ motoristaId }: MotoristaViaturaCardProps) {
  const [viaturaAtual, setViaturaAtual] = useState<MotoristaViatura | null>(null);
  const [documentos, setDocumentos] = useState<ViaturaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    loadViatura();
  }, [motoristaId]);

  useEffect(() => {
    if (viaturaAtual?.viatura.id) {
      loadDocumentos();
    }
  }, [viaturaAtual]);

  async function loadDocumentos() {
    if (!viaturaAtual?.viatura.id) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from("viatura_documentos")
        .select("*")
        .eq("viatura_id", viaturaAtual.viatura.id)
        .in("tipo_documento", ["dua", "ipo", "carta_verde"]);

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar documentos da viatura:", error);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleViewDocument(url: string) {
    try {
      const { data, error } = await supabase.storage
        .from("viatura-documentos")
        .createSignedUrl(url, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Erro ao abrir documento:", error);
      toast.error("Erro ao abrir documento");
    }
  }

  async function loadViatura() {
    try {
      const { data, error } = await supabase
        .from("motorista_viaturas")
        .select(`
          id,
          data_inicio,
          viatura:viaturas (
            id,
            matricula,
            marca,
            modelo,
            ano,
            cor,
            categoria,
            combustivel
          )
        `)
        .eq("motorista_id", motoristaId)
        .eq("status", "ativo")
        .is("data_fim", null)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data && data.viatura) {
        setViaturaAtual({
          id: data.id,
          data_inicio: data.data_inicio,
          viatura: data.viatura as unknown as Viatura
        });
      }
    } catch (error) {
      console.error("Erro ao carregar viatura:", error);
    } finally {
      setLoading(false);
    }
  }

  function getCategoriaColor(categoria: string) {
    switch (categoria?.toLowerCase()) {
      case "green":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "comfort":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "black":
        return "bg-gray-900 text-white dark:bg-gray-700";
      case "x-saver":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="w-5 h-5" />
            Viatura Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!viaturaAtual) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="w-5 h-5" />
            Viatura Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma viatura atribuída</p>
            <p className="text-sm">Uma viatura será atribuída após o contrato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { viatura } = viaturaAtual;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Card className="shadow-sm rounded-[2rem] overflow-hidden leading-relaxed border-border hover:border-primary/40 transition-all cursor-pointer group active:scale-[0.98]">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-lg font-black flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Car className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                </div>
                Viatura Atual
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black opacity-0 group-hover:opacity-100 transition-opacity">Ver Documentos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black tracking-tight">
                      {viatura.marca} {viatura.modelo}
                    </h3>
                    {viatura.ano && (
                      <span className="text-muted-foreground font-bold">({viatura.ano})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-foreground text-background rounded-lg font-mono font-black text-xs tracking-widest shadow-sm">
                      {viatura.matricula}
                    </div>
                    {viatura.categoria && (
                      <div className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                        getCategoriaColor(viatura.categoria).split(' ').filter(c => !c.startsWith('dark:')).join(' ')
                      )}>
                        {viatura.categoria}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground">
                  {viatura.combustivel && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl">
                      <Fuel className="w-3.5 h-3.5 text-primary" />
                      <span>{viatura.combustivel}</span>
                    </div>
                  )}
                  
                  {viatura.cor && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl">
                      <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: viatura.cor.toLowerCase() === 'preto' ? 'black' : viatura.cor.toLowerCase() === 'branco' ? 'white' : viatura.cor }} />
                      <span>{viatura.cor}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px]">Atribuída em {format(new Date(viaturaAtual.data_inicio), "dd MMM yyyy", { locale: pt })}</span>
                  </div>
                </div>
              </div>
              
              <div className="hidden lg:block">
                 <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-border opacity-60 group-hover:opacity-100 group-hover:border-primary/40 transition-all">
                    <Car className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                 </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-border bg-background p-0">
        <div className="p-12">
          <div className="flex items-start justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{viatura.marca} {viatura.modelo}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono font-black uppercase tracking-widest bg-foreground text-background px-3 py-1 rounded-lg">{viatura.matricula}</span>
                    <span className="text-sm text-muted-foreground font-bold">Documentação da Viatura</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DUA */}
            {(() => {
              const doc = documentos.find(d => d.tipo_documento === 'dua');
              return (
                <Card className={cn(
                  "border-2 transition-all overflow-hidden rounded-[2rem]",
                  doc ? "border-blue-100 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/10" : "border-dashed border-border bg-muted/20"
                )}>
                  <div className="p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={cn("p-3 rounded-2xl", doc ? "bg-blue-500/20 text-blue-600" : "bg-muted text-muted-foreground")}>
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Documento</p>
                        <h4 className="font-bold text-lg">DUA</h4>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-8 flex-1">
                      Documento Único Automóvel oficial da viatura.
                    </p>

                    {doc ? (
                      <Button 
                        onClick={() => handleViewDocument(doc.ficheiro_url)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold py-6"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar DUA
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold bg-muted/50 p-4 rounded-xl">
                        <AlertCircle className="h-4 w-4" />
                        Não disponível
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* IPO */}
            {(() => {
              const doc = documentos.find(d => d.tipo_documento === 'ipo');
              return (
                <Card className={cn(
                  "border-2 transition-all overflow-hidden rounded-[2rem]",
                  doc ? "border-teal-100 dark:border-teal-900/20 bg-teal-50/30 dark:bg-teal-900/10" : "border-dashed border-border bg-muted/20"
                )}>
                  <div className="p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={cn("p-3 rounded-2xl", doc ? "bg-teal-500/20 text-teal-600" : "bg-muted text-muted-foreground")}>
                        <ClipboardCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Inspeção</p>
                        <h4 className="font-bold text-lg">IPO</h4>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-8 flex-1">
                      {doc?.data_validade ? `Válido até ${format(new Date(doc.data_validade), "dd/MM/yyyy")}` : "Inspeção Periódica Obrigatória."}
                    </p>

                    {doc ? (
                      <Button 
                        onClick={() => handleViewDocument(doc.ficheiro_url)}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold py-6"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar IPO
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold bg-muted/50 p-4 rounded-xl">
                        <AlertCircle className="h-4 w-4" />
                        Não disponível
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* Seguro */}
            {(() => {
              const doc = documentos.find(d => d.tipo_documento === 'carta_verde');
              return (
                <Card className={cn(
                  "border-2 transition-all overflow-hidden rounded-[2rem]",
                  doc ? "border-indigo-100 dark:border-indigo-900/20 bg-indigo-50/30 dark:bg-indigo-900/10" : "border-dashed border-border bg-muted/20"
                )}>
                  <div className="p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={cn("p-3 rounded-2xl", doc ? "bg-indigo-500/20 text-indigo-600" : "bg-muted text-muted-foreground")}>
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seguro</p>
                        <h4 className="font-bold text-lg">Carta Verde</h4>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-8 flex-1">
                      {doc?.data_validade ? `Válido até ${format(new Date(doc.data_validade), "dd/MM/yyyy")}` : "Certificado Internacional de Seguro."}
                    </p>

                    {doc ? (
                      <Button 
                        onClick={() => handleViewDocument(doc.ficheiro_url)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold py-6"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar Seguro
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold bg-muted/50 p-4 rounded-xl">
                        <AlertCircle className="h-4 w-4" />
                        Não disponível
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
