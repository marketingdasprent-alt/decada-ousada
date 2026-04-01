import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="w-5 h-5" />
          Viatura Atual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold">
                {viatura.marca} {viatura.modelo}
              </h3>
              {viatura.ano && (
                <span className="text-muted-foreground">({viatura.ano})</span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                <span className="font-mono font-semibold text-foreground">
                  {viatura.matricula}
                </span>
              </div>
              
              {viatura.categoria && (
                <Badge className={getCategoriaColor(viatura.categoria)}>
                  {viatura.categoria}
                </Badge>
              )}
              
              {viatura.combustivel && (
                <div className="flex items-center gap-1">
                  <Fuel className="w-4 h-4" />
                  <span>{viatura.combustivel}</span>
                </div>
              )}
              
              {viatura.cor && (
                <span>Cor: {viatura.cor}</span>
              )}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                Atribuída desde {format(new Date(viaturaAtual.data_inicio), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
