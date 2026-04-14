import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Receipt,
  AlertCircle,
  TrendingUp,
  FileWarning,
  Wallet,
  AlertTriangle
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { MotoristaViaturaCard } from "./MotoristaViaturaCard";
import { MotoristaDocumentosCard } from "./MotoristaDocumentosCard";
import { MotoristaMovimentosCard } from "./MotoristaMovimentosCard";
import { MotoristaRecibosCard } from "./MotoristaRecibosCard";
import { MotoristaDanosCard } from "./MotoristaDanosCard";
import { MotoristaCombustivelCard } from "./MotoristaCombustivelCard";
import { useThemedLogo } from "@/hooks/useThemedLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MotoristaAtivo {
  id: string;
  codigo: number;
  nome: string;
  email: string;
  telefone: string;
  nif: string;
  morada: string;
  cidade: string;
  status_ativo: boolean;
  data_contratacao: string;
  documento_tipo: string;
  documento_numero: string;
  documento_validade: string;
  carta_conducao: string;
  carta_categorias: string[];
  carta_validade: string;
  licenca_tvde_numero: string;
  licenca_tvde_validade: string;
  foto_url?: string;
}

interface DashboardStats {
  saldoPendente: number;
  recibosPendentesAceitacao: number;
  recibosEmFalta: number;
  documentosAExpirar: number;
}

export function MotoristaDashboard() {
  const { user, signOut } = useAuth();
  const [motorista, setMotorista] = useState<MotoristaAtivo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    saldoPendente: 0,
    recibosPendentesAceitacao: 0,
    recibosEmFalta: 0,
    documentosAExpirar: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadMotoristaData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!motorista?.id) return;

    const recibosChannel = supabase
      .channel(`dashboard-recibos-${motorista.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motorista_recibos', filter: `motorista_id=eq.${motorista.id}` },
        () => loadStats(motorista.id, motorista)
      ).subscribe();

    const financeiroChannel = supabase
      .channel(`dashboard-financeiro-${motorista.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motorista_financeiro', filter: `motorista_id=eq.${motorista.id}` },
        () => loadStats(motorista.id, motorista)
      ).subscribe();

    return () => {
      supabase.removeChannel(recibosChannel);
      supabase.removeChannel(financeiroChannel);
    };
  }, [motorista?.id]);

  async function loadMotoristaData() {
    try {
      setLoading(true);
      const { data: motoristaData, error: motoristaError } = await supabase
        .from("motoristas_ativos")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (motoristaError) throw motoristaError;
      setMotorista(motoristaData);
      await loadStats(motoristaData.id, motoristaData);
    } catch (error) {
      console.error("Erro ao carregar dados do motorista:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats(motoristaId: string, motoristaData: MotoristaAtivo) {
    try {
      const { data: movimentos } = await supabase
        .from("motorista_financeiro")
        .select("tipo, valor, status")
        .eq("motorista_id", motoristaId)
        .eq("status", "pendente");

      let saldoPendente = 0;
      if (movimentos) {
        movimentos.forEach(m => {
          if (m.tipo === "credito") saldoPendente += Number(m.valor);
          else saldoPendente -= Number(m.valor);
        });
      }

      const { count: recibosPendentesAceitacao } = await supabase
        .from("motorista_recibos")
        .select("*", { count: "exact", head: true })
        .eq("motorista_id", motoristaId)
        .eq("status", "submetido");

      let recibosEmFalta = 0;
      if (motoristaData.data_contratacao) {
        const dataContratacao = new Date(motoristaData.data_contratacao);
        const hoje = new Date();
        const { data: recibos } = await supabase.from("motorista_recibos").select("semana_referencia_inicio").eq("motorista_id", motoristaId);
        const semanasComRecibo = new Set(recibos?.map(r => r.semana_referencia_inicio).filter(Boolean) || []);
        let semanaActual = startOfWeek(dataContratacao, { weekStartsOn: 1 });
        const limite = startOfWeek(hoje, { weekStartsOn: 1 });
        while (isBefore(semanaActual, limite)) {
          const dataStr = format(semanaActual, "yyyy-MM-dd");
          if (!semanasComRecibo.has(dataStr)) recibosEmFalta++;
          semanaActual = addWeeks(semanaActual, 1);
        }
      }

      let documentosAExpirar = 0;
      const proximoLimite = addDays(new Date(), 30);
      const docs = [motoristaData.carta_validade, motoristaData.documento_validade, motoristaData.licenca_tvde_validade].filter(Boolean);
      docs.forEach(data => { if (new Date(data) <= proximoLimite) documentosAExpirar++; });

      setStats({
        saldoPendente,
        recibosPendentesAceitacao: recibosPendentesAceitacao || 0,
        recibosEmFalta,
        documentosAExpirar
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-[2rem]" />)}
        </div>
        <Skeleton className="h-48 rounded-[2rem]" />
      </div>
    );
  }

  if (!motorista) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md bg-white border-slate-200">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-bold text-slate-900">Dados não encontrados</h2>
            <p className="mb-6 text-slate-500">Não foi possível encontrar os seus dados de motorista.</p>
            <Button onClick={() => signOut()} className="bg-slate-900 text-white">Sair</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm font-medium">Bem-vindo de volta, {motorista.nome.split(' ')[0]}!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase">Saldo Atual</span>
              <div className="p-2 bg-teal-50 rounded-lg">
                <Wallet className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mb-2">{formatCurrency(stats.saldoPendente)}</p>
            <div className="flex items-center text-teal-600 text-[10px] font-bold">
              <TrendingUp className="w-3 h-3 mr-1" />
              Disponível para levantamento
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase">Recibos Pendentes</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Receipt className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mb-2">{stats.recibosPendentesAceitacao}</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Em validação</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all duration-300",
          stats.recibosEmFalta > 0 && "border-red-100 bg-red-50/30"
        )}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase">Recibos em falta</span>
              <div className={cn("p-2 rounded-lg", stats.recibosEmFalta > 0 ? "bg-red-100" : "bg-slate-50")}>
                <AlertCircle className={cn("w-4 h-4", stats.recibosEmFalta > 0 ? "text-red-600" : "text-slate-300")} />
              </div>
            </div>
            <p className={cn("text-3xl font-black mb-2", stats.recibosEmFalta > 0 ? "text-red-600" : "text-slate-900")}>
              {stats.recibosEmFalta}
            </p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Semanas em atraso</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all duration-300",
          stats.documentosAExpirar > 0 && "border-orange-100 bg-orange-50/30"
        )}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase">DOCs a Expirar</span>
              <div className={cn("p-2 rounded-lg", stats.documentosAExpirar > 0 ? "bg-orange-100" : "bg-slate-50")}>
                <FileWarning className={cn("w-4 h-4", stats.documentosAExpirar > 0 ? "text-orange-600" : "text-slate-300")} />
              </div>
            </div>
            <p className={cn("text-3xl font-black mb-2", stats.documentosAExpirar > 0 ? "text-orange-600" : "text-slate-900")}>
              {stats.documentosAExpirar}
            </p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Próximos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MotoristaCombustivelCard motoristaId={motorista.id} />
        <MotoristaMovimentosCard motoristaId={motorista.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <MotoristaViaturaCard motoristaId={motorista.id} />
        <MotoristaDanosCard motoristaId={motorista.id} />
      </div>

      <div className="space-y-8">
        <MotoristaDocumentosCard motorista={motorista} />
        <MotoristaRecibosCard
          motoristaId={motorista.id}
          userId={user?.id || ''}
          dataContratacao={motorista.data_contratacao}
        />
      </div>
    </div>
  );
}
