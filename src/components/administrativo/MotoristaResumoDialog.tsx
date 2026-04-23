import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { 
  Printer, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Loader2,
  Send,
  Mail,
  MessageSquare,
  UserCheck
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateFinanceiroPDF } from "@/utils/generateFinanceiroPDF";

import { Separator } from "@/components/ui/separator";
import { useThemedLogo } from "@/hooks/useThemedLogo";

interface MotoristaResumoProps {
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
  identificador_bolt?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: MotoristaResumoProps | null;
  dateRange: { from: Date; to: Date };
}

export function MotoristaResumoDialog({ open, onOpenChange, motorista, dateRange }: Props) {
  const logoSrc = useThemedLogo();
  const [loading, setLoading] = useState(false);
  const [matricula, setMatricula] = useState<string | null>(null);
  const [cartaoFrota, setCartaoFrota] = useState<string | null>(null);
  // aluguer comes pre-calculated from ContasResumoTab (bulk query, reliable)
  const [isSending, setIsSending] = useState(false);
  const [motoristaEmail, setMotoristaEmail] = useState<string | null>(null);
  const [motoristaTelefone, setMotoristaTelefone] = useState<string | null>(null);
  const [motoristaIban, setMotoristaIban] = useState<string | null>(null);
  const [extraCosts, setExtraCosts] = useState<{caucao: number, seguros: number, outros: number}>({
    caucao: 0,
    seguros: 0,
    outros: 0
  });
  const [outrasReceitas, setOutrasReceitas] = useState(0);

  useEffect(() => {
    if (open && (motorista?.motorista_id || motorista?.driver_uuid)) {
      fetchDadosMotorista();
    }
  }, [open, motorista?.motorista_id, motorista?.driver_uuid]);

  async function fetchDadosMotorista() {
    if (!motorista?.motorista_id && !motorista?.driver_uuid) return;
    
    setLoading(true);
    setMatricula(null);
    setCartaoFrota(null);
    setMotoristaIban(null);
    setExtraCosts({ caucao: 0, seguros: 0, outros: 0 });
    
    try {
      // Usar motorista_id directamente se disponível
      let resolvedMotoristaId = motorista.motorista_id || null;
      
      // Fallback 1: Match por IDs de Plataforma (Uber/Bolt) na tabela motoristas_ativos
      if (!resolvedMotoristaId) {
        const query = supabase.from("motoristas_ativos").select("id");
        
        if (motorista.driver_uuid) {
          const { data } = await query.eq("uber_uuid", motorista.driver_uuid).maybeSingle();
          if (data) resolvedMotoristaId = data.id;
        }
        
        if (!resolvedMotoristaId && motorista.identificador_bolt) {
          const { data } = await query.eq("bolt_id", motorista.identificador_bolt).maybeSingle();
          if (data) resolvedMotoristaId = data.id;
        }
      }

      // Fallback 2: Mapeamento histórico Bolt
      if (!resolvedMotoristaId && motorista.driver_uuid) {
        const { data: mapeamento } = await supabase
          .from("bolt_mapeamento_motoristas")
          .select("motorista_id")
          .eq("driver_uuid", motorista.driver_uuid)
          .maybeSingle();
        resolvedMotoristaId = mapeamento?.motorista_id || null;
      }

      // Fallback 3: Busca por nome (último recurso)
      if (!resolvedMotoristaId && motorista.driver_name) {
        const { data: matched } = await supabase
          .from("motoristas_ativos")
          .select("id")
          .ilike("nome", `%${motorista.driver_name}%`)
          .limit(1)
          .maybeSingle();
        resolvedMotoristaId = matched?.id || null;
      }

      if (resolvedMotoristaId) {
        const results = await Promise.all([
          supabase
            .from("motorista_viaturas")
            .select("viatura_id, viaturas(matricula, valor_aluguer)")
            .eq("motorista_id", resolvedMotoristaId)
            // A viatura deve ter começado antes do fim do período
            .lte("data_inicio", format(dateRange.to, "yyyy-MM-dd"))
            // E deve ter terminado depois do início do período (ou não ter terminado)
            .or(`data_fim.is.null,data_fim.gte.${format(dateRange.from, "yyyy-MM-dd")}`)
            .order("data_inicio", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("motoristas_ativos")
            .select("cartao_frota, cartao_bp, cartao_repsol, cartao_edp, email, telefone, iban")
            .eq("id", resolvedMotoristaId)
            .maybeSingle(),
          supabase
            .from("motorista_financeiro")
            .select("categoria, valor, tipo")
            .eq("motorista_id", resolvedMotoristaId)
            .gte("data_movimento", format(dateRange.from, "yyyy-MM-dd"))
            .lte("data_movimento", format(dateRange.to, "yyyy-MM-dd"))
        ]);

        const viaturaData = results[0].data;
        const motoristaData = results[1].data;
        const financeiroData = results[2].data;

        if (viaturaData?.viaturas) {
          const viatura = viaturaData.viaturas as any;
          setMatricula(viatura.matricula);
          // Note: valor_aluguer is provided via prop from ContasResumoTab (bulk query)
          // We only use it here as a fallback if prop is 0
          if (!motorista.aluguer) {
            // No-op: prop takes precedence
          }
        }

        if (motoristaData) {
          const m = motoristaData;
          const cards = [m.cartao_bp, m.cartao_repsol, m.cartao_edp, m.cartao_frota]
            .filter(c => !!c)
            .join(' / ');
          setCartaoFrota(cards || "N/A");
          setMotoristaEmail(m.email);
          setMotoristaTelefone(m.telefone);
          setMotoristaIban(m.iban);
        }

        if (financeiroData) {
          let recExtras = 0;
          const totals = financeiroData.reduce((acc, curr) => {
            if (curr.categoria === "reparacao") return acc; 
            if (curr.categoria === "renda_viatura") return acc;

            const val = Number(curr.valor) || 0;
            
            if (curr.tipo === "credito") {
              recExtras += val;
              return acc;
            }

            if (curr.categoria === "caucao") acc.caucao += val;
            else if (curr.categoria === "seguros") acc.seguros += val;
            else acc.outros += val; 
            
            return acc;
          }, { caucao: 0, seguros: 0, outros: 0 });
          
          setExtraCosts(totals);
          setOutrasReceitas(recExtras);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados do motorista:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!motorista) return null;

  // Cálculos financeiros
  const receitas = {
    bolt: motorista.faturado_bolt,
    uber: motorista.faturado_uber,
    outras_receitas: outrasReceitas || 0,
  };
  const totalReceitas = receitas.bolt + receitas.uber + receitas.outras_receitas;

  const despesas = {
    aluguer: motorista.aluguer || 0,
    combustivel: motorista.combustivel || 0,
    portagens: motorista.portagens || 0,
    outros_custos: extraCosts.outros,
    caucao: extraCosts.caucao,
    seguros: extraCosts.seguros,
    reparacoes: motorista.reparacoes || 0,
  };
  const totalDespesas = Object.values(despesas).reduce((a, b) => a + b, 0);

  const valoresSemanaAnterior = 0;
  const receitaAjustada = motorista.recibo_verde ? totalReceitas : totalReceitas / 1.06;
  const totalAReceber = receitaAjustada - totalDespesas + valoresSemanaAnterior;
  const liquido = totalAReceber;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    const subject = `Resumo Financeiro - ${motorista.driver_name} - ${format(dateRange.from, 'dd/MM/yyyy')}`;
    const body = `Olá ${motorista.driver_name},\n\nSegue o resumo financeiro do período ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}:\n\n` +
      `Receitas: ${formatCurrency(totalReceitas)}\n` +
      `Despesas: ${formatCurrency(totalDespesas)}\n` +
      `Líquido a Receber: ${formatCurrency(liquido)}\n\n` +
      `Cumprimentos,\nEquipa Década Ousada`;
    
    const mailto = `mailto:${motoristaEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleSendWhatsApp = () => {
    const message = `*RESUMO FINANCEIRO - DÉCADA OUSADA*\n\n` +
      `Olá *${motorista.driver_name}*,\n` +
      `Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}\n\n` +
      `💰 *Receitas:* ${formatCurrency(totalReceitas)}\n` +
      `💸 *Despesas:* ${formatCurrency(totalDespesas)}\n` +
      `🏁 *Líquido Final:* ${formatCurrency(liquido)}\n\n` +
      `Se tiver alguma dúvida, por favor contacte-nos.`;
    
    const phone = motoristaTelefone?.replace(/\s/g, '') || '';
    const whatsappUrl = `https://wa.me/${phone.startsWith('+') ? phone : '+351' + phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendAccount = async () => {
    if (!motorista.motorista_id) {
      toast.error("ID do motorista não disponível para envio à conta.");
      return;
    }

    try {
      setIsSending(true);
      const pdf = await generateFinanceiroPDF({
        driver_name: motorista.driver_name,
        matricula,
        cartaoFrota,
        dateRange,
        recibo_verde: motorista.recibo_verde,
        receitas: { 
          bolt: receitas.bolt, 
          uber: receitas.uber, 
          outras_receitas: receitas.outras_receitas, 
          total: totalReceitas 
        },
        despesas: { 
          aluguer: despesas.aluguer, 
          combustivel: despesas.combustivel, 
          portagens: despesas.portagens, 
          reparacoes: despesas.reparacoes, 
          outros: despesas.outros_custos + despesas.caucao + despesas.seguros,
          total: totalDespesas 
        },
        resumo: { 
          totalAReceber: totalAReceber, 
          ajuste: motorista.recibo_verde ? undefined : (totalAReceber - liquido),
          liquido: liquido 
        },
        logoSrc: logoSrc
      });

      const fileName = `resumo_${motorista.motorista_id}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      const pdfBlob = pdf.output('blob');

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('motorista-recibos')
        .upload(`${motorista.motorista_id}/${fileName}`, pdfBlob);

      if (uploadError) throw uploadError;

      // Insert or Update record in motorista_recibos
      const { error: dbError } = await supabase
        .from('motorista_recibos')
        .upsert({
          motorista_id: motorista.motorista_id,
          descricao: `Resumo Financeiro ${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`,
          periodo_referencia: format(dateRange.from, 'MMMM yyyy', { locale: pt }),
          semana_referencia_inicio: format(dateRange.from, 'yyyy-MM-dd'),
          valor_total: liquido,
          ficheiro_url: uploadData.path,
          nome_ficheiro: fileName,
          status: 'validado',
          data_validacao: new Date().toISOString(),
          tipo: 'relatorio'
        }, {
          onConflict: 'motorista_id,semana_referencia_inicio'
        });

      if (dbError) throw dbError;

      toast.success("Resumo enviado para a conta do motorista com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar para conta:", error);
      toast.error("Erro ao enviar resumo: " + (error.message || String(error)));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span>Resumo Financeiro</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Conteúdo do Relatório - Otimizado para Impressão */}
        <div className="space-y-6 print:space-y-2 print-content" id="relatorio-motorista">
          {/* Cabeçalho com Logo */}
          <div className="text-center border-b pb-6 print:pb-2">
            <img 
              src={logoSrc} 
              alt="Logo" 
              className="h-32 mx-auto mb-4 print:h-24 print:mb-4"
            />
            <h1 className="text-2xl print:text-lg font-bold text-foreground print:text-black">
              RESUMO FINANCEIRO DO MOTORISTA
            </h1>
          </div>

          {/* Informações do Motorista */}
          <div className="bg-muted/30 rounded-lg p-4 print:p-2 print:bg-gray-50 print:border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2">
              <div>
                <span className="text-sm print:text-xs text-muted-foreground">Nome</span>
                <p className="font-semibold text-lg print:text-sm">{motorista.driver_name}</p>
              </div>
              <div>
                <span className="text-sm print:text-xs text-muted-foreground">Matrícula</span>
                <p className="font-semibold text-lg print:text-sm">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    matricula || "N/A"
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm print:text-xs text-muted-foreground">Cartão Frota</span>
                <p className="font-semibold text-lg print:text-sm">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    cartaoFrota || "N/A"
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm print:text-xs text-muted-foreground">Período</span>
                <p className="font-semibold text-lg print:text-sm">
                  {format(dateRange.from, "dd/MM/yyyy", { locale: pt })} a {format(dateRange.to, "dd/MM/yyyy", { locale: pt })}
                </p>
              </div>
              <div>
                <span className="text-sm print:text-xs text-muted-foreground">IBAN</span>
                <p className="font-semibold text-lg print:text-sm">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    motoristaIban || "N/A"
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm print:text-xs text-muted-foreground">Recibo Verde</span>
                <p className={`font-semibold text-lg print:text-sm ${motorista.recibo_verde ? "text-green-600" : "text-red-600"}`}>
                  {motorista.recibo_verde ? "Sim" : "Não"}
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Receitas e Despesas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-2 print:grid-cols-2">
            {/* Receitas */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-green-950/30 px-4 py-3 print:px-2 print:py-1 border-b print:bg-green-50">
                <h2 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400 print:text-green-700 print:text-sm">
                  <TrendingUp className="h-5 w-5 print:h-4 print:w-4" />
                  RECEITAS
                </h2>
              </div>
              <div className="p-4 print:p-2 space-y-3 print:space-y-1">
                <div className="flex justify-between items-center print:text-xs">
                  <span>Bolt</span>
                  <span className="font-medium text-green-600">{formatCurrency(receitas.bolt)}</span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Uber</span>
                  <span className={receitas.uber > 0 ? "font-medium text-green-600" : "text-muted-foreground"}>
                    {formatCurrency(receitas.uber)}
                  </span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Outras Receitas (Ajustes)</span>
                  <span className="font-medium text-green-600">{formatCurrency(receitas.outras_receitas)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-bold print:text-xs">
                  <span>TOTAL RECEITAS</span>
                  <span className="text-green-600 text-lg print:text-sm">{formatCurrency(totalReceitas)}</span>
                </div>
              </div>
            </div>

            {/* Despesas */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-red-50 dark:bg-red-950/30 px-4 py-3 print:px-2 print:py-1 border-b print:bg-red-50">
                <h2 className="font-semibold flex items-center gap-2 text-red-700 dark:text-red-400 print:text-red-700 print:text-sm">
                  <TrendingDown className="h-5 w-5 print:h-4 print:w-4" />
                  DESPESAS
                </h2>
              </div>
              <div className="p-4 print:p-2 space-y-3 print:space-y-1">
                <div className="flex justify-between items-center print:text-xs">
                  <span>Aluguer</span>
                  <span className="text-muted-foreground">{formatCurrency(despesas.aluguer)}</span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Combustível</span>
                  <span className="text-muted-foreground">{formatCurrency(despesas.combustivel)}</span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Portagens</span>
                  <span className="text-muted-foreground">{formatCurrency(despesas.portagens)}</span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Outros Custos</span>
                  <span className="text-muted-foreground">{formatCurrency(despesas.outros_custos)}</span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Caução</span>
                  <span className="text-muted-foreground">{formatCurrency(despesas.caucao)}</span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Seguros</span>
                  <span className="text-muted-foreground">{formatCurrency(despesas.seguros)}</span>
                </div>
                <div className="flex justify-between items-center print:text-xs">
                  <span>Reparações</span>
                  <span className="text-muted-foreground">{formatCurrency(despesas.reparacoes)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-bold print:text-xs">
                  <span>TOTAL DESPESAS</span>
                  <span className="text-red-600 text-lg print:text-sm">{formatCurrency(totalDespesas)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Final */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-3 print:px-2 print:py-1 border-b print:bg-blue-50">
              <h2 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400 print:text-blue-700 print:text-sm">
                <Calculator className="h-5 w-5 print:h-4 print:w-4" />
                RESUMO FINAL
              </h2>
            </div>
            <div className="p-4 print:p-2 space-y-3 print:space-y-1">
              <div className="flex justify-between items-center print:text-xs">
                <span>Valores a Transportar (Semana Anterior)</span>
                <span className="text-muted-foreground">{formatCurrency(valoresSemanaAnterior)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center print:text-xs">
                <span className="font-medium">Total a Receber</span>
                <span className={`font-medium ${totalAReceber >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalAReceber)}
                </span>
              </div>
              {!motorista.recibo_verde && (
                <div className="flex justify-between items-center print:text-xs">
                  <span>Ajuste (÷ 1.06)</span>
                  <span className="text-orange-600">-{formatCurrency(totalAReceber - liquido)}</span>
                </div>
              )}
              <Separator className="my-4 print:my-1" />
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/20 -mx-4 px-4 py-4 print:py-2 print:bg-blue-50">
                <span className="font-bold text-lg print:text-sm">VALOR LÍQUIDO A RECEBER</span>
                <span className={`font-bold text-2xl print:text-lg ${liquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(liquido)}
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé para Impressão */}
          <div className="hidden print:block text-center text-xs text-gray-500 pt-2 border-t mt-2">
            <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</p>
            <p className="mt-0.5">Década Ousada, Lda. • NIF: 515127850</p>
          </div>
        </div>

        {/* Botões de Ação - Hidden on Print */}
        <div className="flex justify-end gap-3 pt-4 border-t print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSendWhatsApp}>
                <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendEmail}>
                <Mail className="h-4 w-4 mr-2 text-blue-500" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendAccount}>
                <UserCheck className="h-4 w-4 mr-2 text-primary" />
                Enviar à Conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
