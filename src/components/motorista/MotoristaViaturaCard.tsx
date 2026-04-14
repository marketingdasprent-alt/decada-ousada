import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Car, Calendar, Fuel, Tag } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

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

interface MotoristaViaturaCardProps {
  motoristaId: string;
}

export function MotoristaViaturaCard({ motoristaId }: MotoristaViaturaCardProps) {
  const [viaturaAtual, setViaturaAtual] = useState<MotoristaViatura | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadViatura();
  }, [motoristaId]);

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
    <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden leading-relaxed">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-xl">
            <Car className="w-5 h-5 text-teal-600" />
          </div>
          Viatura Atual
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {viatura.marca} {viatura.modelo}
                </h3>
                {viatura.ano && (
                  <span className="text-slate-400 font-bold">({viatura.ano})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-slate-900 text-white rounded-lg font-mono font-black text-xs tracking-widest shadow-sm">
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
            
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
              {viatura.combustivel && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                  <Fuel className="w-3.5 h-3.5 text-teal-600" />
                  <span>{viatura.combustivel}</span>
                </div>
              )}
              
              {viatura.cor && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                  <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: viatura.cor.toLowerCase() === 'preto' ? 'black' : viatura.cor.toLowerCase() === 'branco' ? 'white' : viatura.cor }} />
                  <span>{viatura.cor}</span>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px]">Atribuída em {format(new Date(viaturaAtual.data_inicio), "dd MMM yyyy", { locale: pt })}</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200 opacity-60">
                <Car className="w-10 h-10 text-slate-300" />
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
