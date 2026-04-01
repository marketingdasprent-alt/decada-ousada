import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LogOut, 
  User, 
  Car, 
  FileText, 
  Wallet, 
  AlertTriangle,
  Receipt,
  AlertCircle
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { MotoristaViaturaCard } from "./MotoristaViaturaCard";
import { MotoristaDocumentosCard } from "./MotoristaDocumentosCard";
import { MotoristaMovimentosCard } from "./MotoristaMovimentosCard";
import { MotoristaRecibosCard } from "./MotoristaRecibosCard";
import { MotoristaDanosCard } from "./MotoristaDanosCard";
import { useThemedLogo } from "@/hooks/useThemedLogo";

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
}

interface DashboardStats {
  saldoPendente: number;
  recibosPendentesAceitacao: number;
  recibosEmFalta: number;
  documentosAExpirar: number;
}

export function MotoristaDashboard() {
  const { user, signOut } = useAuth();
  const logoSrc = useThemedLogo();
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

  // Subscripção Realtime para actualizar cards automaticamente
  useEffect(() => {
    if (!motorista?.id) return;

    // Escutar mudanças em recibos
    const recibosChannel = supabase
      .channel(`dashboard-recibos-${motorista.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motorista_recibos',
          filter: `motorista_id=eq.${motorista.id}`
        },
        () => {
          loadStats(motorista.id, motorista);
        }
      )
      .subscribe();

    // Escutar mudanças em movimentos financeiros
    const financeiroChannel = supabase
      .channel(`dashboard-financeiro-${motorista.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motorista_financeiro',
          filter: `motorista_id=eq.${motorista.id}`
        },
        () => {
          loadStats(motorista.id, motorista);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recibosChannel);
      supabase.removeChannel(financeiroChannel);
    };
  }, [motorista?.id]);

  async function loadMotoristaData() {
    try {
      setLoading(true);
      
      // Buscar motorista ativo pelo user_id
      const { data: motoristaData, error: motoristaError } = await supabase
        .from("motoristas_ativos")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (motoristaError) throw motoristaError;
      setMotorista(motoristaData);

      // Buscar estatísticas - passa os dados do motorista directamente
      await loadStats(motoristaData.id, motoristaData);
    } catch (error) {
      console.error("Erro ao carregar dados do motorista:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats(motoristaId: string, motoristaData: MotoristaAtivo) {
    try {
      // Saldo pendente
      const { data: movimentos } = await supabase
        .from("motorista_financeiro")
        .select("tipo, valor, status")
        .eq("motorista_id", motoristaId)
        .eq("status", "pendente");

      let saldoPendente = 0;
      if (movimentos) {
        movimentos.forEach(m => {
          if (m.tipo === "credito") {
            saldoPendente += Number(m.valor);
          } else {
            saldoPendente -= Number(m.valor);
          }
        });
      }

      // Recibos pendentes de aceitação (status "submetido")
      const { count: recibosPendentesAceitacao } = await supabase
        .from("motorista_recibos")
        .select("*", { count: "exact", head: true })
        .eq("motorista_id", motoristaId)
        .eq("status", "submetido");

      // Recibos em falta - verificar semana a semana usando semana_referencia_inicio
      let recibosEmFalta = 0;
      if (motoristaData.data_contratacao) {
        const dataContratacao = new Date(motoristaData.data_contratacao);
        const hoje = new Date();
        
        // Buscar todas as semanas que têm recibo
        const { data: recibos } = await supabase
          .from("motorista_recibos")
          .select("semana_referencia_inicio")
          .eq("motorista_id", motoristaId);

        const semanasComRecibo = new Set(
          recibos?.map(r => r.semana_referencia_inicio).filter(Boolean) || []
        );
        
        // Verificar cada semana desde contratação até a semana passada
        let semanaActual = startOfWeek(dataContratacao, { weekStartsOn: 1 });
        const limite = startOfWeek(hoje, { weekStartsOn: 1 }); // Não incluir a semana actual
        
        while (isBefore(semanaActual, limite)) {
          const dataStr = format(semanaActual, "yyyy-MM-dd");
          if (!semanasComRecibo.has(dataStr)) {
            recibosEmFalta++;
          }
          semanaActual = addWeeks(semanaActual, 1);
        }
      }

      // Documentos a expirar (próximos 30 dias) - usa motoristaData directamente
      let documentosAExpirar = 0;
      const proximoLimite = addDays(new Date(), 30);
      const docs = [
        motoristaData.carta_validade,
        motoristaData.documento_validade,
        motoristaData.licenca_tvde_validade
      ].filter(Boolean);
      
      docs.forEach(data => {
        const dataValidade = new Date(data);
        if (dataValidade <= proximoLimite) {
          documentosAExpirar++;
        }
      });

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
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  }

  if (loading) {
    return (
      <div className="main-content-safe min-h-screen bg-background py-4 md:py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!motorista) {
    return (
      <div className="main-content-safe flex min-h-screen items-center justify-center bg-background py-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">Dados não encontrados</h2>
            <p className="mb-4 text-muted-foreground">
              Não foi possível encontrar os seus dados de motorista.
            </p>
            <Button onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Terminar sessão
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur sticky-header-safe">
        <div className="main-content-safe mx-auto flex max-w-6xl items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoSrc} alt="Década Ousada" className="h-8 shrink-0" />
            <span className="hidden text-muted-foreground sm:inline">|</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">Área do Motorista</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{motorista.nome}</p>
              <p className="text-xs text-muted-foreground">#{motorista.codigo}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="main-content-safe mx-auto max-w-6xl space-y-6 py-6">
        <div>
          <h1 className="text-2xl font-bold">Olá, {motorista.nome.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">
            Membro desde {format(new Date(motorista.data_contratacao), "MMMM 'de' yyyy", { locale: pt })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Saldo pendente</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(stats.saldoPendente)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span className="text-xs">Recibos pendentes</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.recibosPendentesAceitacao}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Recibos em falta</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {stats.recibosEmFalta > 0 ? stats.recibosEmFalta : 'Em dia'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-xs">Docs a expirar</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.documentosAExpirar}</p>
            </CardContent>
          </Card>
        </div>

        <MotoristaViaturaCard motoristaId={motorista.id} />
        <MotoristaDanosCard motoristaId={motorista.id} />
        <MotoristaDocumentosCard motorista={motorista} />
        <MotoristaMovimentosCard motoristaId={motorista.id} />
        <MotoristaRecibosCard
          motoristaId={motorista.id}
          userId={user?.id || ''}
          dataContratacao={motorista.data_contratacao}
        />
      </main>
    </div>
  );
}
