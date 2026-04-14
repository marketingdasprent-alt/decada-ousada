import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, isThisWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, Search, Calendar, Users, TrendingUp, Car, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MotoristaResumoDialog } from "./MotoristaResumoDialog";
import { ReparaCartoes } from "./ReparaCartoes";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Mail, Send, FileDown } from "lucide-react";
import { generateFinanceiroPDF } from "@/utils/generateFinanceiroPDF";
import { useThemedLogo } from "@/hooks/useThemedLogo";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn, normalizeString } from "@/lib/utils";

interface MotoristaResumo {
  driver_name: string;
  driver_uuid: string;
  motorista_id?: string;
  total_faturado: number;
  faturado_bolt: number;
  faturado_uber: number;
  total_viagens: number;
  viagens_bolt: number;
  viagens_uber: number;
  recibo_verde: boolean;
  liquido: number;
  combustivel: number;
  portagens: number;
  reparacoes: number;
  outros_custos: number;
  aluguer: number;
}

interface Integracao {
  id: string;
  nome: string;
  company_name: string | null;
  plataforma: string;
  robot_target_platform: string | null;
}

// Semana: Segunda (1) a Domingo (0)
const WEEK_STARTS_ON = 1;

// Atalhos rápidos para seleção de semanas
const getWeekShortcuts = () => [
  { label: "Esta semana", date: new Date() },
  { label: "Semana passada", date: subWeeks(new Date(), 1) },
  { label: "Há 2 semanas", date: subWeeks(new Date(), 2) },
  { label: "Há 3 semanas", date: subWeeks(new Date(), 3) },
];

export function ContasResumoTab() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [resumos, setResumos] = useState<MotoristaResumo[]>([]);
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIntegracao, setSelectedIntegracao] = useState<string>("all");
  // Estado: data dentro da semana selecionada
  const [selectedWeek, setSelectedWeek] = useState<Date>(subWeeks(new Date(), 1));
  const [selectedMotorista, setSelectedMotorista] = useState<MotoristaResumo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);
  const logoSrc = useThemedLogo();

  const handleBulkPrint = async () => {
    if (selectedIds.size === 0) return;
    
    setLoading(true);
    toast.info(`Preparando ${selectedIds.size} relatórios para impressão...`);

    try {
      const selectedResumos = resumos.filter(r => 
        selectedIds.has(r.driver_uuid || r.driver_name)
      );

      let combinedPdf = null;

      for (let i = 0; i < selectedResumos.length; i++) {
        const motorista = selectedResumos[i];
        
        // Fetch extra data for this driver (same as MotoristaResumoDialog)
        let matricula = null;
        let cartaoFrota = null;
        let extraCosts = { caucao: 0, seguros: 0, outros: 0 };
        
        let resolvedMotoristaId = motorista.motorista_id || null;
        if (resolvedMotoristaId) {
          const [vData, mData, aData] = await Promise.all([
            supabase.from("motorista_viaturas").select("viaturas(matricula)").eq("motorista_id", resolvedMotoristaId).eq("status", "ativo").maybeSingle(),
            supabase.from("motoristas_ativos").select("cartao_frota, cartao_bp, cartao_repsol, cartao_edp").eq("id", resolvedMotoristaId).maybeSingle(),
            supabase.from("motorista_custos_adicionais").select("tipo, valor").eq("motorista_id", resolvedMotoristaId).gte("semana_referencia", format(weekStart, "yyyy-MM-dd")).lte("semana_referencia", format(weekEnd, "yyyy-MM-dd"))
          ]);

          if (vData.data?.viaturas) matricula = (vData.data.viaturas as any).matricula;
          if (mData.data) {
            cartaoFrota = [mData.data.cartao_bp, mData.data.cartao_repsol, mData.data.cartao_edp, mData.data.cartao_frota].filter(c => !!c).join(' / ') || "N/A";
          }
          if (aData.data) {
            extraCosts = aData.data.reduce((acc, curr) => {
              const val = Number(curr.valor) || 0;
              if (curr.tipo === "Caução") acc.caucao += val;
              else if (curr.tipo === "Seguros") acc.seguros += val;
              else acc.outros += val;
              return acc;
            }, { caucao: 0, seguros: 0, outros: 0 });
          }
        }

        const receitaAjustada = motorista.recibo_verde ? motorista.total_faturado : motorista.total_faturado / 1.06;
        const totalDespesas = motorista.aluguer + motorista.combustivel + motorista.portagens + motorista.reparacoes + extraCosts.outros + extraCosts.caucao + extraCosts.seguros;
        
        const pdfData = {
          driver_name: motorista.driver_name,
          matricula,
          cartaoFrota,
          dateRange: { from: weekStart, to: weekEnd },
          recibo_verde: motorista.recibo_verde,
          receitas: { 
            bolt: motorista.faturado_bolt, 
            uber: motorista.faturado_uber, 
            outras_receitas: 0, 
            total: motorista.total_faturado 
          },
          despesas: { 
            aluguer: motorista.aluguer, 
            combustivel: motorista.combustivel, 
            portagens: motorista.portagens, 
            reparacoes: motorista.reparacoes, 
            outros: extraCosts.outros + extraCosts.caucao + extraCosts.seguros,
            total: totalDespesas 
          },
          resumo: { 
            totalAReceber: receitaAjustada - (motorista.recibo_verde ? 0 : 0), // Base logic from dialog
            ajuste: motorista.recibo_verde ? undefined : (motorista.total_faturado - receitaAjustada),
            liquido: motorista.liquido 
          },
          logoSrc
        };

        combinedPdf = await generateFinanceiroPDF(pdfData, combinedPdf || undefined);
      }

      if (combinedPdf) {
        const fileName = `resumos_financeiros_${format(weekStart, 'yyyyMMdd')}.pdf`;
        combinedPdf.save(fileName);
        toast.success("Relatórios gerados com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao imprimir em massa:", error);
      toast.error("Erro ao gerar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEmail = async () => {
    toast.info("Funcionalidade de envio em massa por email em desenvolvimento.");
  };

  // Calcular início e fim da semana (Segunda a Domingo)
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: WEEK_STARTS_ON });

  const weekShortcuts = getWeekShortcuts();

  // Navegação de semanas
  const goToPreviousWeek = () => setSelectedWeek(subWeeks(selectedWeek, 1));
  const goToNextWeek = () => setSelectedWeek(addWeeks(selectedWeek, 1));

  // Verificar se é a semana actual
  const isCurrentWeek = isThisWeek(selectedWeek, { weekStartsOn: WEEK_STARTS_ON });

  const handleRowClick = (resumo: MotoristaResumo) => {
    setSelectedMotorista(resumo);
    setDialogOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResumos.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = filteredResumos.map(r => r.driver_uuid || r.driver_name);
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDayClick = (day: Date | undefined) => {
    if (day) {
      setSelectedWeek(day);
    }
  };

  const getWeekLabel = () => {
    const label = `${format(weekStart, "dd/MM", { locale: pt })} - ${format(weekEnd, "dd/MM/yyyy", { locale: pt })}`;
    if (isCurrentWeek) {
      return `${label} (Semana Actual)`;
    }
    return label;
  };

  useEffect(() => {
    loadIntegracoes();
  }, []);

  useEffect(() => {
    loadResumos();
  }, [selectedWeek, selectedIntegracao]);

  async function loadIntegracoes() {
    const { data, error } = await supabase
      .from("plataformas_configuracao")
      .select("id, nome, company_name, plataforma, robot_target_platform")
      .in("plataforma", ["bolt", "uber", "robot"])
      .eq("ativo", true);

    if (error) {
      console.error("Erro ao carregar integrações:", error);
      return;
    }
    setIntegracoes((data || []) as Integracao[]);
  }

  // Normalizar nome para matching (lowercase, sem acentos, sem espaços extra)
  function normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Extrair primeiro+último nome normalizado para dedup
  function normalizeFirstLast(name: string): string {
    const parts = normalizeName(name).split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return parts[0] || "";
  }

  // Função para verificar se um nome da plataforma corresponde a um motorista cadastrado
  function isNameMatch(platformName: string, officialName: string): boolean {
    const pNorm = normalizeName(platformName);
    const oNorm = normalizeName(officialName);
    
    // 1. Match exato (normalizado)
    if (pNorm === oNorm) return true;
    
    // 2. Primeiro + Último correponde? (Ex: Alysson Caldeira vs Alysson Caldeira)
    const pFL = normalizeFirstLast(platformName);
    const oFL = normalizeFirstLast(officialName);
    if (pFL === oFL && pFL.includes(" ")) return true;
    
    // 3. O nome da plataforma está contido no nome oficial? (Ex: Alysson Caldeira contido em Alysson Geraldo Gomes Caldeira)
    if (oNorm.includes(pNorm) && pNorm.length > 5) return true;
    
    // 4. O nome oficial está contido no nome da plataforma? (Inverso)
    if (pNorm.includes(oNorm) && oNorm.length > 5) return true;

    // 5. Match individual de nomes (pelo menos 2 nomes em comum, ignorando preposições)
    const noise = ["da", "de", "do", "das", "dos", "e"];
    const pParts = pNorm.split(" ").filter(p => p.length > 2 && !noise.includes(p));
    const oParts = oNorm.split(" ").filter(p => p.length > 2 && !noise.includes(p));
    
    const commonParts = pParts.filter(p => oParts.includes(p));
    if (commonParts.length >= 2) return true;

    // 6. Caso especial: Um só nome mas é muito longo e único? (Opcional, manter seguro)
    if (pParts.length === 1 && oParts.includes(pParts[0]) && pParts[0].length > 7) return true;

    return false;
  }

  async function loadResumos() {
    setLoading(true);
    try {
      // 1. Buscar bolt_drivers → motorista_id + recibo_verde + nome
      const { data: driversData } = await supabase
        .from("bolt_drivers")
        .select("driver_uuid, motorista_id, name, motoristas_ativos(id, nome, recibo_verde)");

      // Mapa: bolt driver_uuid → motorista_id
      const boltToMotoristaMap: Record<string, string> = {};
      // Mapa: motorista_id → recibo_verde
      const reciboVerdeMap: Record<string, boolean> = {};
      // Mapa: motorista_id → nome display (do bolt ou do motoristas_ativos)
      const motoristaNameMap: Record<string, string> = {};

      (driversData || []).forEach((d) => {
        const motData = d.motoristas_ativos as { id: string; nome: string; recibo_verde: boolean | null } | null;
        if (d.driver_uuid && d.motorista_id) {
          boltToMotoristaMap[d.driver_uuid] = d.motorista_id;
          reciboVerdeMap[d.motorista_id] = motData?.recibo_verde ?? true;
          motoristaNameMap[d.motorista_id] = d.name || motData?.nome || "Desconhecido";
        }
      });

      // 2. Buscar todos motoristas_ativos para matching (Nomes e IDs de plataforma)
      const { data: todosMotoristas } = await supabase
        .from("motoristas_ativos")
        .select("id, nome, recibo_verde, uber_uuid, bolt_id");

      // Mapa: uber_uuid -> motorista_id
      const uberIdMap: Record<string, string> = {};
      // Mapa: bolt_id -> motorista_id
      const boltIdMap: Record<string, string> = {};

      // Mapa: nome normalizado → motorista_id
      const nomeToMotoristaMap: Record<string, { id: string; nome: string; recibo_verde: boolean }> = {};
      (todosMotoristas || []).forEach((m) => {
        const norm = normalizeName(m.nome);
        nomeToMotoristaMap[norm] = { id: m.id, nome: m.nome, recibo_verde: m.recibo_verde ?? true };
        
        // Mapear IDs de plataforma se existirem
        if (m.uber_uuid) uberIdMap[m.uber_uuid] = m.id;
        if (m.bolt_id) boltIdMap[m.bolt_id] = m.id;

        // Também guardar recibo_verde para qualquer motorista
        if (!(m.id in reciboVerdeMap)) {
          reciboVerdeMap[m.id] = m.recibo_verde ?? true;
        }
      });

      // 3. Buscar viagens Bolt
      let boltQuery = supabase
        .from("bolt_viagens")
        .select("driver_name, driver_uuid, driver_earnings, order_status, integracao_id")
        .gt("driver_earnings", 0)
        .gte("payment_confirmed_timestamp", weekStart.toISOString())
        .lte("payment_confirmed_timestamp", weekEnd.toISOString());

      // Determine effective platform type for the selected integration
      const selectedIntegracaoObj = integracoes.find(i => i.id === selectedIntegracao);
      const getEffectivePlatform = (intObj: Integracao | undefined): string | null => {
        if (!intObj) return null;
        if (intObj.plataforma === 'robot' && intObj.robot_target_platform) return intObj.robot_target_platform;
        return intObj.plataforma;
      };
      const effectivePlatform = getEffectivePlatform(selectedIntegracaoObj);

      if (selectedIntegracao !== "all" && effectivePlatform === "bolt") {
        boltQuery = boltQuery.eq("integracao_id", selectedIntegracao);
      } else if (selectedIntegracao !== "all" && effectivePlatform !== "bolt") {
        // Se outra plataforma (Uber/BP etc) for seleccionada: ignorar Bolt
        boltQuery = boltQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
      }

      // 4. Buscar transações Uber no mesmo período
      let uberQuery = supabase
        .from("uber_transactions")
        .select("uber_driver_id, gross_amount, raw_transaction")
        .gte("occurred_at", weekStart.toISOString())
        .lte("occurred_at", weekEnd.toISOString());

      // Filtro de integração Uber
      if (selectedIntegracao !== "all" && effectivePlatform === "uber") {
        uberQuery = uberQuery.eq("integracao_id", selectedIntegracao);
      } else if (selectedIntegracao !== "all" && effectivePlatform !== "uber") {
        uberQuery = uberQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
      }

      // 4b. Buscar atividade Uber (viagens_concluidas reais) para o período
      // Gerar período normalizado: Segunda → Domingo (YYYYMMDD-YYYYMMDD)
      const fmtD = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const periodoStr = `${fmtD(weekStart)}-${fmtD(weekEnd)}`;
      let atividadeQuery = supabase
        .from("uber_atividade_motoristas")
        .select("uber_driver_id, viagens_concluidas")
        .eq("periodo", periodoStr);

      if (selectedIntegracao !== "all" && effectivePlatform === "uber") {
        atividadeQuery = atividadeQuery.eq("integracao_id", selectedIntegracao);
      } else if (selectedIntegracao !== "all" && effectivePlatform !== "uber") {
        atividadeQuery = atividadeQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
      }

      // 4c. Buscar uber_drivers para mapeamento uber_driver_id → motorista_id
      const uberDriversQuery = supabase
        .from("uber_drivers")
        .select("uber_driver_id, motorista_id, full_name");

      // 4d. Buscar transações de combustível no período
      let combustivelQuery = (supabase as any)
        .from("bp_transacoes")
        .select("motorista_id, amount")
        .gte("transaction_date", weekStart.toISOString())
        .lte("transaction_date", weekEnd.toISOString())
        .not("motorista_id", "is", null);

      let repsolQuery = supabase
        .from("repsol_transacoes")
        .select("motorista_id, amount")
        .gte("transaction_date", weekStart.toISOString())
        .lte("transaction_date", weekEnd.toISOString())
        .not("motorista_id", "is", null);

      let edpQuery = supabase
        .from("edp_transacoes")
        .select("motorista_id, amount")
        .gte("transaction_date", weekStart.toISOString())
        .lte("transaction_date", weekEnd.toISOString())
        .not("motorista_id", "is", null);

      // 4d-bis. Buscar valor de aluguer de viatura (bulk) para todos os motoristas activos
      const viaturasQuery = supabase
        .from("motorista_viaturas")
        .select("motorista_id, viaturas(valor_aluguer)")
        .eq("status", "ativo");

      if (selectedIntegracao !== "all" && effectivePlatform === "bp") {
        combustivelQuery = combustivelQuery.eq("integracao_id", selectedIntegracao);
        repsolQuery = repsolQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
        edpQuery = edpQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
      } else if (selectedIntegracao !== "all" && effectivePlatform === "repsol") {
        repsolQuery = repsolQuery.eq("integracao_id", selectedIntegracao);
        combustivelQuery = combustivelQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
        edpQuery = edpQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
      } else if (selectedIntegracao !== "all" && effectivePlatform === "edp") {
        edpQuery = edpQuery.eq("integracao_id", selectedIntegracao);
        combustivelQuery = combustivelQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
        repsolQuery = repsolQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
      } else if (selectedIntegracao !== "all" && !["bp", "repsol", "edp"].includes(effectivePlatform as string)) {
        // Se seleccionou uma integracao que NAO é de combustivel, pode querer ver as faturas?
        // Geralmente "Contas" devem abater os combustiveis de todas as fontes sempre, mesmo filtrando a Uber!
        // Caso contrario, lucros líquidos ficariam inflacionados se não subtrair o gasóleo enquanto estuda a Uber.
        // O utilizador pediu "filtros das contas que filtrar BP, REPSOL, EDP nao ta funcionando".
        // Isto significa que eles querem que seleccionar BP filtre!
      }

      // 4e. Buscar resumos semanais Bolt (dados CSV) cujo intervalo intersecte a semana seleccionada
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      // 4f. Buscar parcelas de reparações pendentes para a semana
      const parcelasQuery = supabase
        .from("reparacao_parcelas")
        .select("motorista_id, valor, status")
        .eq("semana_referencia", weekStartStr)
        .eq("status", "pendente");

      let boltResumosQuery = supabase
        .from("bolt_resumos_semanais")
        .select("motorista_id, motorista_nome, ganhos_liquidos, viagens_terminadas, integracao_id, identificador_motorista")
        .lte("periodo_inicio", weekEndStr)
        .gte("periodo_fim", weekStartStr);

      if (selectedIntegracao !== "all" && effectivePlatform === "bolt") {
        boltResumosQuery = boltResumosQuery.eq("integracao_id", selectedIntegracao);
      } else if (selectedIntegracao !== "all" && effectivePlatform !== "bolt") {
        boltResumosQuery = boltResumosQuery.eq("integracao_id", "00000000-0000-0000-0000-000000000000");
      }

      const adhocCostsQuery = supabase
        .from("motorista_custos_adicionais")
        .select("motorista_id, valor")
        .gte("semana_referencia", weekStartStr)
        .lte("semana_referencia", weekEndStr);

      const [boltResult, uberResult, atividadeResult, uberDriversResult, combustivelResult, repsolResult, edpResult, boltResumosResult, parcelasResult, adhocCostsResult, viaturasResult] = await Promise.all([
        boltQuery,
        uberQuery,
        atividadeQuery,
        uberDriversQuery,
        combustivelQuery,
        repsolQuery,
        edpQuery,
        boltResumosQuery,
        parcelasQuery,
        adhocCostsQuery,
        viaturasQuery
      ]);

      if (boltResult.error) throw boltResult.error;
      if (uberResult.error) throw uberResult.error;

      // Mapa: motorista_id → total combustível gasto no período
      const combustivelByMotorista: Record<string, number> = {};
      
      const somarCombustivel = (resultado: any) => {
        (resultado.data || []).forEach((t: any) => {
          if (t.motorista_id) {
            combustivelByMotorista[t.motorista_id] = (combustivelByMotorista[t.motorista_id] || 0) + (Number(t.amount) || 0);
          }
        });
      };

      somarCombustivel(combustivelResult);
      somarCombustivel(repsolResult);
      somarCombustivel(edpResult);

      // Mapa: motorista_id → valor semanal de aluguer de viatura
      const aluguerByMotorista: Record<string, number> = {};
      (viaturasResult.data || []).forEach((mv: any) => {
        if (mv.motorista_id && mv.viaturas?.valor_aluguer) {
          aluguerByMotorista[mv.motorista_id] = Number(mv.viaturas.valor_aluguer) || 0;
        }
      });

      // Mapa: motorista_id → total reparações (parcelas) da semana
      const reparacoesByMotorista: Record<string, number> = {};
      (parcelasResult.data || []).forEach((p: any) => {
        if (p.motorista_id) {
          reparacoesByMotorista[p.motorista_id] = (reparacoesByMotorista[p.motorista_id] || 0) + (Number(p.valor) || 0);
        }
      });

      // Mapa: motorista_id → total custos adicionais (caução, seguros, etc)
      const adhocByMotorista: Record<string, number> = {};
      (adhocCostsResult.data || []).forEach((c: any) => {
        if (c.motorista_id) {
          adhocByMotorista[c.motorista_id] = (adhocByMotorista[c.motorista_id] || 0) + (Number(c.valor) || 0);
        }
      });

      // Mapa de viagens reais da atividade Uber (por uber_driver_id)
      const uberViagensByDriver: Record<string, number> = {};
      (atividadeResult.data || []).forEach((a) => {
        if (a.uber_driver_id) {
          uberViagensByDriver[a.uber_driver_id] = (uberViagensByDriver[a.uber_driver_id] || 0) + (a.viagens_concluidas || 0);
        }
      });

      // Mapa uber_driver_id → motorista_id (via uber_drivers table)
      const uberDriverToMotoristaMap: Record<string, string> = {};
      const uberDriverNameMap: Record<string, string> = {};
      (uberDriversResult.data || []).forEach((d) => {
        if (d.uber_driver_id) {
          if (d.motorista_id) uberDriverToMotoristaMap[d.uber_driver_id] = d.motorista_id;
          if (d.full_name) uberDriverNameMap[d.uber_driver_id] = d.full_name;
        }
      });

      // 5. Agrupar por motorista_id (chave unificadora)
      interface AgrupadoEntry {
        motorista_id: string | null;
        driver_name: string;
        driver_uuid: string;
        faturado_bolt: number;
        faturado_uber: number;
        viagens_bolt: number;
        viagens_uber: number;
        identificador_bolt?: string;
      }
      const agrupado: Record<string, AgrupadoEntry> = {};

      // 5a. Processar Bolt
      (boltResult.data || []).forEach((v) => {
        const driverUuid = v.driver_uuid || "unknown";
        const identificadorBolt = (v.raw_data as any)?.["Identificador do motorista"] || "";

        // ORDEM DE MATCHING BOLT:
        // 1. Pelo bolt_id gravado na ficha do motorista (CRM)
        // 2. Pelo mapeamento histórico da tabela bolt_drivers
        // 3. Pelo match inteligente de nomes
        let motoristaId = (identificadorBolt && boltIdMap[identificadorBolt]) 
          ? boltIdMap[identificadorBolt] 
          : (boltToMotoristaMap[driverUuid] || null);

        let displayName = v.driver_name || "Desconhecido";

        // Se não tem mapeamento directo, tentar match inteligente
        if (!motoristaId && displayName !== "Desconhecido") {
          for (const [normName, mData] of Object.entries(nomeToMotoristaMap)) {
            if (isNameMatch(displayName, mData.nome)) {
              motoristaId = mData.id;
              displayName = mData.nome;
              reciboVerdeMap[mData.id] = mData.recibo_verde;
              break;
            }
          }
        } else if (motoristaId) {
          displayName = motoristaNameMap[motoristaId] || displayName;
        }

        const key = motoristaId || `bolt_${driverUuid}`;

        if (!agrupado[key]) {
          agrupado[key] = {
            motorista_id: motoristaId,
            driver_name: displayName,
            driver_uuid: driverUuid,
            faturado_bolt: 0,
            faturado_uber: 0,
            viagens_bolt: 0,
            viagens_uber: 0,
          };
        }
        agrupado[key].faturado_bolt += Number(v.driver_earnings) || 0;
        agrupado[key].viagens_bolt += 1;
        if (identificadorBolt) agrupado[key].identificador_bolt = identificadorBolt;
      });

      // 5a-bis. Processar resumos semanais Bolt (CSV) — complementar dados da API
      const boltResumosTracked = new Set<string>();
      Object.entries(agrupado).forEach(([key, entry]) => {
        if (entry.faturado_bolt > 0) boltResumosTracked.add(key);
      });

      (boltResumosResult.data || []).forEach((r: any) => {
        let motoristaId: string | null = r.motorista_id || null;
        const identificadorBolt = r.identificador_motorista || "";

        // Tentar match por ID se não veio no registo
        if (!motoristaId && identificadorBolt && boltIdMap[identificadorBolt]) {
          motoristaId = boltIdMap[identificadorBolt];
        }

        let displayName = r.motorista_nome || "Desconhecido";

        if (!motoristaId && displayName !== "Desconhecido") {
          for (const [normName, mData] of Object.entries(nomeToMotoristaMap)) {
            if (isNameMatch(displayName, mData.nome)) {
              motoristaId = mData.id;
              displayName = mData.nome;
              reciboVerdeMap[mData.id] = mData.recibo_verde;
              break;
            }
          }
        }

        const key = motoristaId || `bolt_csv_${r.identificador_motorista || displayName}`;

        // Se já temos dados da API (bolt_viagens) para este motorista, ignorar CSV
        if (boltResumosTracked.has(key)) return;

        if (!agrupado[key]) {
          agrupado[key] = {
            motorista_id: motoristaId,
            driver_name: displayName,
            driver_uuid: "",
            faturado_bolt: 0,
            faturado_uber: 0,
            viagens_bolt: 0,
            viagens_uber: 0,
          };
        }
        agrupado[key].faturado_bolt += Number(r.ganhos_liquidos) || 0;
        agrupado[key].viagens_bolt += Number(r.viagens_terminadas) || 0;
        if (identificadorBolt && !agrupado[key].identificador_bolt) {
          agrupado[key].identificador_bolt = identificadorBolt;
        }
      });

      // 5b. Processar Uber — aggregate by uber_driver_id
      const uberByDriver: Record<string, { firstName: string; lastName: string; total: number; count: number }> = {};
      (uberResult.data || []).forEach((t) => {
        const driverId = t.uber_driver_id || "unknown";
        if (!uberByDriver[driverId]) {
          const csvRow = (t.raw_transaction as any)?.csv_row || {};
          uberByDriver[driverId] = {
            firstName: csvRow["Nome próprio do motorista"] || "",
            lastName: csvRow["Apelido do motorista"] || "",
            total: 0,
            count: 0,
          };
        }
        uberByDriver[driverId].total += Number(t.gross_amount) || 0;
        uberByDriver[driverId].count = uberViagensByDriver[driverId] || 0;
      });

      // Also inject drivers that only have atividade but no payment transactions
      for (const [driverId, viagens] of Object.entries(uberViagensByDriver)) {
        if (!uberByDriver[driverId]) {
          uberByDriver[driverId] = {
            firstName: uberDriverNameMap[driverId]?.split(" ")[0] || "",
            lastName: uberDriverNameMap[driverId]?.split(" ").slice(1).join(" ") || "",
            total: 0,
            count: viagens,
          };
        }
      }

      // Match each Uber driver with motorista_id
      Object.entries(uberByDriver).forEach(([uberDriverId, uberData]) => {
        const uberFullName = `${uberData.firstName} ${uberData.lastName}`.trim();

        // ORDEM DE MATCHING UBER:
        // 1. Pelo uber_uuid gravado na ficha do motorista (CRM)
        // 2. Pelo mapeamento histórico da tabela uber_drivers.motorista_id
        // 3. Pelo match inteligente de nomes
        let matchedMotoristaId: string | null = uberIdMap[uberDriverId] || uberDriverToMotoristaMap[uberDriverId] || null;
        let matchedName = uberFullName || uberDriverNameMap[uberDriverId] || uberDriverId;

        if (matchedMotoristaId) {
          // Use name from motoristas_ativos if available
          const motData = Object.values(nomeToMotoristaMap).find(m => m.id === matchedMotoristaId);
          if (motData) {
            matchedName = motData.nome;
            reciboVerdeMap[motData.id] = motData.recibo_verde;
          }
        } else {
          // Priority 3: smart match
          for (const [normName, mData] of Object.entries(nomeToMotoristaMap)) {
            if (isNameMatch(matchedName, mData.nome)) {
              matchedMotoristaId = mData.id;
              matchedName = mData.nome;
              reciboVerdeMap[mData.id] = mData.recibo_verde;
              break;
            }
          }
        }

        const key = matchedMotoristaId || `uber_${uberDriverId}`;

        if (agrupado[key]) {
          // Já existe (provavelmente do Bolt) — adicionar Uber
          agrupado[key].faturado_uber += uberData.total;
          agrupado[key].viagens_uber += uberData.count;
        } else {
          agrupado[key] = {
            motorista_id: matchedMotoristaId,
            driver_name: matchedName,
            driver_uuid: "",
            faturado_bolt: 0,
            faturado_uber: uberData.total,
            viagens_bolt: 0,
            viagens_uber: uberData.count,
          };
        }
      });

      // 5b-bis. Ensure drivers with ONLY fuel/reparacoes are added to agrupado
      for (const [motoristaId, totalFuel] of Object.entries(combustivelByMotorista)) {
        if (!agrupado[motoristaId] && totalFuel > 0) {
          const motData = Object.values(nomeToMotoristaMap).find(m => m.id === motoristaId);
          agrupado[motoristaId] = {
            motorista_id: motoristaId,
            driver_name: motData?.nome || "Desconhecido",
            driver_uuid: "",
            faturado_bolt: 0,
            faturado_uber: 0,
            viagens_bolt: 0,
            viagens_uber: 0,
          };
        }
      }

      for (const [motoristaId, totalRep] of Object.entries(reparacoesByMotorista)) {
        if (!agrupado[motoristaId] && totalRep > 0) {
          const motData = Object.values(nomeToMotoristaMap).find(m => m.id === motoristaId);
          agrupado[motoristaId] = {
            motorista_id: motoristaId,
            driver_name: motData?.nome || "Desconhecido",
            driver_uuid: "",
            faturado_bolt: 0,
            faturado_uber: 0,
            viagens_bolt: 0,
            viagens_uber: 0,
          };
        }
      }

      for (const [motoristaId, totalAdhoc] of Object.entries(adhocByMotorista)) {
        if (!agrupado[motoristaId] && totalAdhoc > 0) {
          const motData = Object.values(nomeToMotoristaMap).find(m => m.id === motoristaId);
          agrupado[motoristaId] = {
            motorista_id: motoristaId,
            driver_name: motData?.nome || "Desconhecido",
            driver_uuid: "",
            faturado_bolt: 0,
            faturado_uber: 0,
            viagens_bolt: 0,
            viagens_uber: 0,
          };
        }
      }

      // 5c. Dedup final
      // Primero: agrupar por motorista_id (se disponível)
      const idDedupMap: Record<string, string[]> = {}; // motorista_id -> [keys]
      const nameDedupMap: Record<string, string[]> = {}; // normalizedFirstLast -> [keys]

      for (const [key, entry] of Object.entries(agrupado)) {
        if (entry.motorista_id) {
          if (!idDedupMap[entry.motorista_id]) idDedupMap[entry.motorista_id] = [];
          idDedupMap[entry.motorista_id].push(key);
        } else {
          // Apenas para os que não têm ID, tentamos por nome
          const fl = normalizeFirstLast(entry.driver_name);
          if (fl && fl.includes(" ")) {
            if (!nameDedupMap[fl]) nameDedupMap[fl] = [];
            nameDedupMap[fl].push(key);
          }
        }
      }

      // Fusão por ID
      for (const [mid, keys] of Object.entries(idDedupMap)) {
        if (keys.length <= 1) continue;
        const primaryKey = keys.find(k => !k.startsWith("bolt_") && !k.startsWith("uber_")) || keys[0];
        for (const dupKey of keys) {
          if (dupKey === primaryKey) continue;
          const dup = agrupado[dupKey];
          agrupado[primaryKey].faturado_bolt += dup.faturado_bolt;
          agrupado[primaryKey].faturado_uber += dup.faturado_uber;
          agrupado[primaryKey].viagens_bolt += dup.viagens_bolt;
          agrupado[primaryKey].viagens_uber += dup.viagens_uber;
          delete agrupado[dupKey];
        }
      }

      // Fusão por Nome (para os que restam sem ID)
      for (const [, keys] of Object.entries(nameDedupMap)) {
        const activeKeys = keys.filter(k => !!agrupado[k]);
        if (activeKeys.length <= 1) continue;
        
        const primaryKey = activeKeys[0];
        for (let i = 1; i < activeKeys.length; i++) {
          const dupKey = activeKeys[i];
          const dup = agrupado[dupKey];
          agrupado[primaryKey].faturado_bolt += dup.faturado_bolt;
          agrupado[primaryKey].faturado_uber += dup.faturado_uber;
          agrupado[primaryKey].viagens_bolt += dup.viagens_bolt;
          agrupado[primaryKey].viagens_uber += dup.viagens_uber;
          delete agrupado[dupKey];
        }
      }

      const resumosCalculados: MotoristaResumo[] = Object.values(agrupado).map((m) => {
        const totalFaturado = m.faturado_bolt + m.faturado_uber;
        const totalViagens = m.viagens_bolt + m.viagens_uber;
        const passaReciboVerde = m.motorista_id ? (reciboVerdeMap[m.motorista_id] ?? true) : true;
        
        const receita = passaReciboVerde ? totalFaturado : totalFaturado / 1.06;
        const combustivelValor = m.motorista_id ? (combustivelByMotorista[m.motorista_id] || 0) : 0;
        const aluguerValor = m.motorista_id ? (aluguerByMotorista[m.motorista_id] || 0) : 0;
        const reparacoesValor = m.motorista_id ? (reparacoesByMotorista[m.motorista_id] || 0) : 0;
        const adhocValor = m.motorista_id ? (adhocByMotorista[m.motorista_id] || 0) : 0;
        const liquido = receita - combustivelValor - aluguerValor - reparacoesValor - adhocValor;

        return {
          driver_name: m.driver_name,
          driver_uuid: m.driver_uuid,
          motorista_id: m.motorista_id || undefined,
          total_faturado: totalFaturado,
          faturado_bolt: m.faturado_bolt,
          faturado_uber: m.faturado_uber,
          total_viagens: totalViagens,
          viagens_bolt: m.viagens_bolt,
          viagens_uber: m.viagens_uber,
          recibo_verde: passaReciboVerde,
          liquido,
          combustivel: combustivelValor,
          portagens: 0,
          reparacoes: reparacoesValor,
          outros_custos: adhocValor,
          aluguer: aluguerValor,
          identificador_bolt: m.identificador_bolt,
        };
      });

      resumosCalculados.sort((a, b) => b.total_faturado - a.total_faturado);
      setResumos(resumosCalculados);
    } catch (error) {
      console.error("Erro ao carregar resumos:", error);
      toast.error("Erro ao carregar dados de contas");
    } finally {
      setLoading(false);
    }
  }

  // Filtrar por pesquisa
  const filteredResumos = useMemo(() => {
    if (!searchTerm) return resumos;
    const term = normalizeString(searchTerm);
    return resumos.filter((r) =>
      normalizeString(r.driver_name).includes(term)
    );
  }, [resumos, searchTerm]);

  // Totais gerais
  const totais = useMemo(() => {
    return filteredResumos.reduce(
      (acc, r) => ({
        faturado: acc.faturado + r.total_faturado,
        liquido: acc.liquido + r.liquido,
        viagens: acc.viagens + r.total_viagens,
      }),
      { faturado: 0, liquido: 0, viagens: 0 }
    );
  }, [filteredResumos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (loading && resumos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3">
        {/* Seletor de Semana */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Navegação de Semana */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-center text-center font-normal min-w-[260px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  {getWeekLabel()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                {/* Atalhos de Semanas */}
                <div className="p-3 border-b">
                  <div className="flex flex-wrap gap-1.5">
                    {weekShortcuts.map((shortcut) => (
                      <Button
                        key={shortcut.label}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setSelectedWeek(shortcut.date)}
                      >
                        {shortcut.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Calendário - seleciona semana inteira */}
                <CalendarComponent
                  initialFocus
                  mode="single"
                  defaultMonth={selectedWeek}
                  selected={selectedWeek}
                  onSelect={handleDayClick}
                  numberOfMonths={isMobile ? 1 : 2}
                  locale={pt}
                  weekStartsOn={WEEK_STARTS_ON}
                  className="pointer-events-auto"
                  modifiers={{
                    selected: { from: weekStart, to: weekEnd },
                  }}
                  modifiersStyles={{
                    selected: { 
                      backgroundColor: 'hsl(var(--primary))', 
                      color: 'hsl(var(--primary-foreground))',
                      borderRadius: 0,
                    },
                  }}
                />
                <div className="p-2 text-center text-xs text-muted-foreground border-t bg-muted/50">
                  Clique num dia para selecionar a semana inteira (Seg-Dom)
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextWeek}
              disabled={isCurrentWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Integração Filter */}
          <Select value={selectedIntegracao} onValueChange={setSelectedIntegracao}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas integrações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas integrações</SelectItem>
              {integracoes.map((i) => {
                const icon = i.plataforma === "bolt" ? "⚡ " : 
                  (i.plataforma === "robot" && i.robot_target_platform === "bolt") ? "⚡🤖 " :
                  (i.plataforma === "uber" || i.plataforma === "robot") ? "🚗 " : "";
                return (
                  <SelectItem key={i.id} value={i.id}>
                    {icon}{i.company_name || i.nome}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <ReparaCartoes />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Motoristas</div>
            <div className="text-xl font-bold flex items-center gap-1">
              <Users className="h-4 w-4 text-primary" />
              {filteredResumos.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Viagens</div>
            <div className="text-xl font-bold flex items-center gap-1">
              <Car className="h-4 w-4 text-primary" />
              {totais.viagens}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Total Faturado</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totais.faturado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Líquido</div>
            <div className="text-xl font-bold flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              {formatCurrency(totais.liquido)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="text-green-600 font-bold">●</span> Passa recibo verde (valor integral)
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-600 font-bold">●</span> Não passa recibo verde (valor ÷ 1.06)
        </div>
      </div>

      {/* Contador */}
      <div className="text-sm text-muted-foreground">
        {filteredResumos.length} motorista{filteredResumos.length !== 1 && "s"} • {totais.viagens} viagens no período
      </div>

      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedIds.size === filteredResumos.length && filteredResumos.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Viagens</TableHead>
              <TableHead className="text-right">Faturado</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
              <TableHead className="text-right">Aluguer</TableHead>
              <TableHead className="text-right">Combustível</TableHead>
              <TableHead className="text-right">Outros Custos</TableHead>
              <TableHead className="text-right">Reparações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResumos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado para o período selecionado
                </TableCell>
              </TableRow>
            ) : (
              filteredResumos.map((resumo) => {
                const rowId = resumo.driver_uuid || resumo.driver_name;
                return (
                  <TableRow 
                    key={rowId}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.has(rowId)}
                        onCheckedChange={() => toggleSelectOne(rowId)}
                      />
                    </TableCell>
                    <TableCell 
                      className={cn(
                        "font-bold",
                        resumo.recibo_verde ? "text-green-600" : "text-red-600"
                      )}
                      onClick={() => handleRowClick(resumo)}
                    >
                      {resumo.driver_name}
                    </TableCell>
                    <TableCell className="text-center" onClick={() => handleRowClick(resumo)}>
                      <span>{resumo.total_viagens}</span>
                      {(resumo.viagens_bolt > 0 && resumo.viagens_uber > 0) && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (B:{resumo.viagens_bolt} U:{resumo.viagens_uber})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => handleRowClick(resumo)}>
                      <span className="text-green-600 font-medium">{formatCurrency(resumo.total_faturado)}</span>
                      {(resumo.faturado_bolt > 0 && resumo.faturado_uber > 0) && (
                        <div className="text-xs text-muted-foreground">
                          B: {formatCurrency(resumo.faturado_bolt)} | U: {formatCurrency(resumo.faturado_uber)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold" onClick={() => handleRowClick(resumo)}>
                      {formatCurrency(resumo.liquido)}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => handleRowClick(resumo)}>
                      {resumo.aluguer > 0 ? (
                        <span className="font-medium text-purple-600">{formatCurrency(resumo.aluguer)}</span>
                      ) : (
                        <span className="text-muted-foreground">€0,00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => handleRowClick(resumo)}>
                      {resumo.combustivel > 0 ? (
                        <span className="font-medium text-orange-600">{formatCurrency(resumo.combustivel)}</span>
                      ) : (
                        <span className="text-muted-foreground">€0,00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => handleRowClick(resumo)}>
                      {resumo.outros_custos > 0 ? (
                        <span className="font-medium text-destructive">{formatCurrency(resumo.outros_custos)}</span>
                      ) : (
                        <span className="text-muted-foreground">€0,00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => handleRowClick(resumo)}>
                      {resumo.reparacoes > 0 ? (
                        <span className="font-medium text-red-600">{formatCurrency(resumo.reparacoes)}</span>
                      ) : (
                        <span className="text-muted-foreground">€0,00</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredResumos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum dado encontrado para o período selecionado
            </CardContent>
          </Card>
        ) : (
          filteredResumos.map((resumo) => {
            const rowId = resumo.driver_uuid || resumo.driver_name;
            return (
              <Card 
                key={rowId}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <CardContent className="pt-4 pb-3 space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.has(rowId)}
                          onCheckedChange={() => toggleSelectOne(rowId)}
                        />
                      </div>
                      <div onClick={() => handleRowClick(resumo)}>
                        <div className={cn(
                          "font-bold",
                          resumo.recibo_verde ? "text-green-600" : "text-red-600"
                        )}>
                          {resumo.driver_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {resumo.total_viagens} viagens
                          {(resumo.viagens_bolt > 0 && resumo.viagens_uber > 0) && (
                            <span className="ml-1">(B:{resumo.viagens_bolt} U:{resumo.viagens_uber})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financeiro */}
                  <div className="space-y-1.5 text-sm border-t pt-3" onClick={() => handleRowClick(resumo)}>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Faturado</span>
                      <span className="font-medium text-green-600">{formatCurrency(resumo.total_faturado)}</span>
                    </div>
                    {(resumo.faturado_bolt > 0 && resumo.faturado_uber > 0) && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Bolt: {formatCurrency(resumo.faturado_bolt)}</span>
                        <span>Uber: {formatCurrency(resumo.faturado_uber)}</span>
                      </div>
                    )}
                  </div>

                  {/* Líquido */}
                  <div className="flex justify-between border-t pt-3" onClick={() => handleRowClick(resumo)}>
                    <span className="font-semibold">Líquido</span>
                    <span className="font-bold text-primary">{formatCurrency(resumo.liquido)}</span>
                  </div>

                  {/* Despesas */}
                  <div className="space-y-1.5 text-sm border-t pt-3" onClick={() => handleRowClick(resumo)}>
                    {resumo.aluguer > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aluguer</span>
                        <span className="text-purple-600">-{formatCurrency(resumo.aluguer)}</span>
                      </div>
                    )}
                    {resumo.combustivel > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Combustível</span>
                        <span className="text-orange-600">-{formatCurrency(resumo.combustivel)}</span>
                      </div>
                    )}
                    {resumo.outros_custos > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outros Custos</span>
                        <span className="text-destructive">-{formatCurrency(resumo.outros_custos)}</span>
                      </div>
                    )}
                    {resumo.reparacoes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reparações</span>
                        <span className="text-red-600">-{formatCurrency(resumo.reparacoes)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-sm font-medium">
            {selectedIds.size} selecionado{selectedIds.size !== 1 && 's'}
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-9 gap-2 rounded-full"
              onClick={() => handleBulkPrint()}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button 
              size="sm" 
              className="h-9 gap-2 rounded-full"
              disabled={isBulkSending}
              onClick={() => handleBulkEmail()}
            >
              {isBulkSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar por Email
            </Button>
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-9 px-3 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setSelectedIds(new Set())}
          >
            Limpar
          </Button>
        </div>
      )}

      {/* Dialog de Resumo Detalhado */}
      <MotoristaResumoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        motorista={selectedMotorista}
        dateRange={{ from: weekStart, to: weekEnd }}
      />
    </div>
  );
}
