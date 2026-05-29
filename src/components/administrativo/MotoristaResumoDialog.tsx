import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
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
  UserCheck,
  Settings,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { generateFinanceiroPDF } from '@/utils/generateFinanceiroPDF';
import { Separator } from '@/components/ui/separator';
import { useThemedLogo } from '@/hooks/useThemedLogo';

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
  tem_recibo_importado?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: MotoristaResumoProps | null;
  dateRange: { from: Date; to: Date };
}

interface PrintSettings {
  mostrarMatricula: boolean;
  mostrarGestor: boolean;
  mostrarCartaoFrota: boolean;
  mostrarIBAN: boolean;
  mostrarReciboVerde: boolean;
  orientacao: 'portrait' | 'landscape';
}

const DEFAULT_SETTINGS: PrintSettings = {
  mostrarMatricula: true,
  mostrarGestor: false,
  mostrarCartaoFrota: true,
  mostrarIBAN: true,
  mostrarReciboVerde: true,
  orientacao: 'portrait',
};

const SETTINGS_KEY = 'resumo_print_settings';

function loadSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: PrintSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function MotoristaResumoDialog({ open, onOpenChange, motorista, dateRange }: Props) {
  const logoSrc = useThemedLogo();
  const [loading, setLoading] = useState(false);
  const [matricula, setMatricula] = useState<string | null>(null);
  const [cartaoFrota, setCartaoFrota] = useState<string | null>(null);
  const [gestor, setGestor] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [motoristaEmail, setMotoristaEmail] = useState<string | null>(null);
  const [motoristaTelefone, setMotoristaTelefone] = useState<string | null>(null);
  const [motoristaIban, setMotoristaIban] = useState<string | null>(null);
  const [extraCosts, setExtraCosts] = useState<{ caucao: number; seguros: number; outros: number }>(
    { caucao: 0, seguros: 0, outros: 0 }
  );
  const [outrasReceitas, setOutrasReceitas] = useState(0);
  const [settings, setSettings] = useState<PrintSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (open && (motorista?.motorista_id || motorista?.driver_uuid)) {
      fetchDadosMotorista();
    }
  }, [open, motorista?.motorista_id, motorista?.driver_uuid]);

  const updateSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  async function fetchDadosMotorista() {
    if (!motorista?.motorista_id && !motorista?.driver_uuid) return;

    setLoading(true);
    setMatricula(null);
    setCartaoFrota(null);
    setGestor(null);
    setMotoristaIban(null);
    setExtraCosts({ caucao: 0, seguros: 0, outros: 0 });

    try {
      let resolvedMotoristaId = motorista.motorista_id || null;

      if (!resolvedMotoristaId) {
        const query = supabase.from('motoristas_ativos').select('id');
        if (motorista.driver_uuid) {
          const { data } = await query.eq('uber_uuid', motorista.driver_uuid).maybeSingle();
          if (data) resolvedMotoristaId = data.id;
        }
        if (!resolvedMotoristaId && motorista.identificador_bolt) {
          const { data } = await query.eq('bolt_id', motorista.identificador_bolt).maybeSingle();
          if (data) resolvedMotoristaId = data.id;
        }
      }

      if (!resolvedMotoristaId && motorista.driver_uuid) {
        const { data: mapeamento } = await supabase
          .from('bolt_mapeamento_motoristas')
          .select('motorista_id')
          .eq('driver_uuid', motorista.driver_uuid)
          .maybeSingle();
        resolvedMotoristaId = mapeamento?.motorista_id || null;
      }

      if (!resolvedMotoristaId && motorista.driver_name) {
        const { data: matched } = await supabase
          .from('motoristas_ativos')
          .select('id')
          .ilike('nome', `%${motorista.driver_name}%`)
          .limit(1)
          .maybeSingle();
        resolvedMotoristaId = matched?.id || null;
      }

      if (resolvedMotoristaId) {
        const results = await Promise.all([
          supabase
            .from('motorista_viaturas')
            .select('viatura_id, viaturas(matricula, valor_aluguer)')
            .eq('motorista_id', resolvedMotoristaId)
            .lte('data_inicio', format(dateRange.to, 'yyyy-MM-dd'))
            .or(`data_fim.is.null,data_fim.gte.${format(dateRange.from, 'yyyy-MM-dd')}`)
            .order('data_inicio', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('motoristas_ativos')
            .select(
              'cartao_frota, cartao_bp, cartao_repsol, cartao_edp, email, telefone, iban, gestor_responsavel'
            )
            .eq('id', resolvedMotoristaId)
            .maybeSingle(),
          supabase
            .from('motorista_financeiro')
            .select('categoria, valor, tipo')
            .eq('motorista_id', resolvedMotoristaId)
            .gte('data_movimento', format(dateRange.from, 'yyyy-MM-dd'))
            .lte('data_movimento', format(dateRange.to, 'yyyy-MM-dd')),
        ]);

        const viaturaData = results[0].data;
        const motoristaData = results[1].data;
        const financeiroData = results[2].data;

        if (viaturaData?.viaturas) {
          const viatura = viaturaData.viaturas as any;
          setMatricula(viatura.matricula);
        }

        if (motoristaData) {
          const m = motoristaData as any;
          const cards = [m.cartao_bp, m.cartao_repsol, m.cartao_edp, m.cartao_frota]
            .filter((c: any) => !!c)
            .join(' / ');
          setCartaoFrota(cards || 'N/A');
          setMotoristaEmail(m.email);
          setMotoristaTelefone(m.telefone);
          setMotoristaIban(m.iban);
          setGestor(m.gestor_responsavel || null);
        }

        if (financeiroData) {
          let recExtras = 0;
          const totals = financeiroData.reduce(
            (acc, curr) => {
              if (curr.categoria === 'reparacao') return acc;
              if (curr.categoria === 'renda_viatura') return acc;
              const val = Number(curr.valor) || 0;
              if (curr.tipo === 'credito') {
                if (curr.categoria === 'caucao') return acc;
                recExtras += val;
                return acc;
              }
              if (curr.categoria === 'caucao') acc.caucao += val;
              else if (curr.categoria === 'seguros') acc.seguros += val;
              else acc.outros += val;
              return acc;
            },
            { caucao: 0, seguros: 0, outros: 0 }
          );
          setExtraCosts(totals);
          setOutrasReceitas(recExtras);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados do motorista:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!motorista) return null;

  const isImportado = motorista.tem_recibo_importado === true;

  const receitas = {
    bolt: motorista.faturado_bolt,
    uber: motorista.faturado_uber,
    outras_receitas: isImportado ? 0 : outrasReceitas || 0,
  };
  const totalReceitas = receitas.bolt + receitas.uber + receitas.outras_receitas;

  const despesas = isImportado
    ? {
        aluguer: motorista.aluguer || 0,
        combustivel: motorista.combustivel || 0,
        portagens: motorista.portagens || 0,
        outros_custos: motorista.outros_custos || 0,
        caucao: 0,
        seguros: 0,
        reparacoes: motorista.reparacoes || 0,
      }
    : {
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
  const receitaAjustada = isImportado
    ? totalReceitas
    : motorista.recibo_verde
      ? totalReceitas
      : totalReceitas / 1.06;
  const totalAReceber = isImportado
    ? motorista.liquido
    : receitaAjustada - totalDespesas + valoresSemanaAnterior;
  const liquido = isImportado ? motorista.liquido : totalAReceber;

  const fmt = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    const subject = `Resumo Financeiro - ${motorista.driver_name} - ${format(dateRange.from, 'dd/MM/yyyy')}`;
    const body =
      `Olá ${motorista.driver_name},\n\nSegue o resumo financeiro do período ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}:\n\n` +
      `Receitas: ${fmt(totalReceitas)}\nDespesas: ${fmt(totalDespesas)}\nLíquido a Receber: ${fmt(liquido)}\n\nCumprimentos,\nEquipa WeGest`;
    window.location.href = `mailto:${motoristaEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSendWhatsApp = () => {
    const message =
      `*RESUMO FINANCEIRO - WeGest*\n\nOlá *${motorista.driver_name}*,\n` +
      `Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}\n\n` +
      `💰 *Receitas:* ${fmt(totalReceitas)}\n💸 *Despesas:* ${fmt(totalDespesas)}\n🏁 *Líquido Final:* ${fmt(liquido)}\n\nSe tiver alguma dúvida, por favor contacte-nos.`;
    const phone = motoristaTelefone?.replace(/\s/g, '') || '';
    window.open(
      `https://wa.me/${phone.startsWith('+') ? phone : '+351' + phone}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const handleSendAccount = async () => {
    if (!motorista.motorista_id) {
      toast.error('ID do motorista não disponível para envio à conta.');
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
          total: totalReceitas,
        },
        despesas: {
          aluguer: despesas.aluguer,
          combustivel: despesas.combustivel,
          portagens: despesas.portagens,
          reparacoes: despesas.reparacoes,
          outros: despesas.outros_custos + despesas.caucao + despesas.seguros,
          total: totalDespesas,
        },
        resumo: {
          totalAReceber,
          ajuste: motorista.recibo_verde ? undefined : totalAReceber - liquido,
          liquido,
        },
        logoSrc,
      });

      const fileName = `resumo_${motorista.motorista_id}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      const pdfBlob = pdf.output('blob');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('motorista-recibos')
        .upload(`${motorista.motorista_id}/${fileName}`, pdfBlob);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('motorista_recibos').upsert(
        {
          motorista_id: motorista.motorista_id,
          descricao: `Resumo Financeiro ${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`,
          periodo_referencia: format(dateRange.from, 'MMMM yyyy', { locale: pt }),
          semana_referencia_inicio: format(dateRange.from, 'yyyy-MM-dd'),
          valor_total: liquido,
          ficheiro_url: uploadData.path,
          nome_ficheiro: fileName,
          status: 'validado',
          data_validacao: new Date().toISOString(),
          tipo: 'relatorio',
        },
        { onConflict: 'motorista_id,semana_referencia_inicio' }
      );
      if (dbError) throw dbError;
      toast.success('Resumo enviado para a conta do motorista com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao enviar resumo: ' + (error.message || String(error)));
    } finally {
      setIsSending(false);
    }
  };

  const infoFields = [
    { key: 'nome', label: 'Nome', value: motorista.driver_name, always: true },
    {
      key: 'matricula',
      label: 'Matrícula',
      value: loading ? null : matricula || 'N/A',
      show: settings.mostrarMatricula,
    },
    {
      key: 'gestor',
      label: 'Gestor Responsável',
      value: loading ? null : gestor || 'N/A',
      show: settings.mostrarGestor,
    },
    {
      key: 'cartaoFrota',
      label: 'Cartão Frota',
      value: loading ? null : cartaoFrota || 'N/A',
      show: settings.mostrarCartaoFrota,
    },
    {
      key: 'periodo',
      label: 'Período',
      value: `${format(dateRange.from, 'dd/MM/yyyy', { locale: pt })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: pt })}`,
      always: true,
    },
    {
      key: 'iban',
      label: 'IBAN',
      value: loading ? null : motoristaIban || 'N/A',
      show: settings.mostrarIBAN,
    },
    {
      key: 'reciboVerde',
      label: 'Recibo Verde',
      value: motorista.recibo_verde ? 'Sim' : 'Não',
      colored: motorista.recibo_verde ? 'text-green-600' : 'text-red-600',
      show: settings.mostrarReciboVerde,
    },
  ].filter((f) => f.always || f.show);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Inject landscape CSS when needed */}
      {settings.orientacao === 'landscape' && (
        <style>{`@media print { @page { size: landscape; } }`}</style>
      )}

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle>Resumo Financeiro</DialogTitle>
        </DialogHeader>

        {/* Painel de configuração (oculto na impressão) */}
        <div className="print:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings className="h-4 w-4" />
            Configurar folha de impressão
          </Button>

          {showSettings && (
            <div className="mt-3 p-4 border rounded-lg bg-muted/30 space-y-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Campos a mostrar na impressão
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'mostrarMatricula', label: 'Matrícula' },
                  { key: 'mostrarGestor', label: 'Gestor Responsável' },
                  { key: 'mostrarCartaoFrota', label: 'Cartão Frota' },
                  { key: 'mostrarIBAN', label: 'IBAN' },
                  { key: 'mostrarReciboVerde', label: 'Recibo Verde' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      id={key}
                      checked={settings[key as keyof PrintSettings] as boolean}
                      onCheckedChange={(v) =>
                        updateSetting(key as keyof PrintSettings, v as any)
                      }
                    />
                    <Label htmlFor={key} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-muted-foreground">Orientação</p>
                <div className="flex gap-2">
                  {(['portrait', 'landscape'] as const).map((o) => (
                    <Button
                      key={o}
                      size="sm"
                      variant={settings.orientacao === o ? 'default' : 'outline'}
                      onClick={() => updateSetting('orientacao', o)}
                    >
                      {o === 'portrait' ? 'Vertical' : 'Horizontal'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo do Relatório */}
        <div className="space-y-4 print:space-y-3 print-content" id="relatorio-motorista">
          {/* Cabeçalho */}
          <div className="text-center border-b pb-4 print:pb-2">
            <img src={logoSrc} alt="Logo" className="h-24 mx-auto mb-3 print:h-16 print:mb-2" />
            <h1 className="text-2xl print:text-base font-bold">RESUMO FINANCEIRO DO MOTORISTA</h1>
          </div>

          {/* Cards de resumo coloridos */}
          <div className="grid grid-cols-3 gap-3 print:gap-2">
            <div className="rounded-xl bg-green-500 text-white p-4 print:p-3 print:rounded-lg text-center">
              <p className="text-xs font-medium uppercase tracking-wide opacity-80 print:text-[10px]">
                Total Receitas
              </p>
              <p className="text-2xl print:text-lg font-bold mt-1">{fmt(totalReceitas)}</p>
            </div>
            <div className="rounded-xl bg-red-500 text-white p-4 print:p-3 print:rounded-lg text-center">
              <p className="text-xs font-medium uppercase tracking-wide opacity-80 print:text-[10px]">
                Total Despesas
              </p>
              <p className="text-2xl print:text-lg font-bold mt-1">{fmt(totalDespesas)}</p>
            </div>
            <div
              className={`rounded-xl text-white p-4 print:p-3 print:rounded-lg text-center ${liquido >= 0 ? 'bg-blue-600' : 'bg-orange-500'}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-80 print:text-[10px]">
                Líquido a Receber
              </p>
              <p className="text-2xl print:text-lg font-bold mt-1">{fmt(liquido)}</p>
            </div>
          </div>

          {/* Informações do Motorista */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 print:p-3 print:bg-slate-50 border">
            <div
              className={`grid gap-3 print:gap-2 ${infoFields.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
            >
              {infoFields.map((f) => (
                <div key={f.key}>
                  <span className="text-xs text-muted-foreground print:text-[10px]">{f.label}</span>
                  {f.value === null ? (
                    <Loader2 className="h-4 w-4 animate-spin mt-1" />
                  ) : (
                    <p
                      className={`font-semibold print:text-xs ${(f as any).colored || 'text-foreground'}`}
                    >
                      {f.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Receitas e Despesas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-3 print:grid-cols-2">
            {/* Receitas */}
            <div className="rounded-lg overflow-hidden border border-green-200 print:border-green-300">
              <div className="bg-green-500 px-4 py-2 print:px-3 print:py-1.5">
                <h2 className="font-semibold flex items-center gap-2 text-white text-sm print:text-xs">
                  <TrendingUp className="h-4 w-4" />
                  RECEITAS
                </h2>
              </div>
              <div className="p-4 print:p-3 space-y-2 print:space-y-1 bg-green-50 print:bg-green-50">
                <Row label="Bolt" value={fmt(receitas.bolt)} colored="text-green-700" />
                <Row label="Uber" value={fmt(receitas.uber)} colored="text-green-700" />
                <Row
                  label="Outras Receitas"
                  value={fmt(receitas.outras_receitas)}
                  colored="text-green-700"
                />
                <Separator className="bg-green-200" />
                <Row label="TOTAL RECEITAS" value={fmt(totalReceitas)} bold colored="text-green-700" />
              </div>
            </div>

            {/* Despesas */}
            <div className="rounded-lg overflow-hidden border border-red-200 print:border-red-300">
              <div className="bg-red-500 px-4 py-2 print:px-3 print:py-1.5">
                <h2 className="font-semibold flex items-center gap-2 text-white text-sm print:text-xs">
                  <TrendingDown className="h-4 w-4" />
                  DESPESAS
                </h2>
              </div>
              <div className="p-4 print:p-3 space-y-2 print:space-y-1 bg-red-50 print:bg-red-50">
                <Row label="Aluguer" value={fmt(despesas.aluguer)} colored="text-red-700" />
                <Row label="Combustível" value={fmt(despesas.combustivel)} colored="text-red-700" />
                <Row label="Portagens" value={fmt(despesas.portagens)} colored="text-red-700" />
                <Row label="Outros Custos" value={fmt(despesas.outros_custos)} colored="text-red-700" />
                <Row label="Caução" value={fmt(despesas.caucao)} colored="text-red-700" />
                <Row label="Seguros" value={fmt(despesas.seguros)} colored="text-red-700" />
                <Row label="Reparações" value={fmt(despesas.reparacoes)} colored="text-red-700" />
                <Separator className="bg-red-200" />
                <Row label="TOTAL DESPESAS" value={fmt(totalDespesas)} bold colored="text-red-700" />
              </div>
            </div>
          </div>

          {/* Resumo Final */}
          <div className="rounded-lg overflow-hidden border border-blue-200 print:border-blue-300">
            <div className="bg-blue-600 px-4 py-2 print:px-3 print:py-1.5">
              <h2 className="font-semibold flex items-center gap-2 text-white text-sm print:text-xs">
                <Calculator className="h-4 w-4" />
                RESUMO FINAL
              </h2>
            </div>
            <div className="p-4 print:p-3 space-y-2 print:space-y-1 bg-blue-50 print:bg-blue-50">
              <Row
                label="Valores a Transportar (Semana Anterior)"
                value={fmt(valoresSemanaAnterior)}
                colored="text-blue-700"
              />
              <Separator className="bg-blue-200" />
              <Row
                label="Total a Receber"
                value={fmt(totalAReceber)}
                colored={totalAReceber >= 0 ? 'text-green-700' : 'text-red-700'}
              />
              {!motorista.recibo_verde && !isImportado && (
                <Row
                  label="Ajuste (÷ 1.06)"
                  value={`-${fmt(totalAReceber - liquido)}`}
                  colored="text-orange-600"
                />
              )}
              <Separator className="my-2 print:my-1 bg-blue-200" />
              <div className="flex justify-between items-center bg-blue-600 -mx-4 px-4 py-3 print:py-2 print:-mx-3 print:px-3">
                <span className="font-bold text-white text-sm print:text-xs">
                  VALOR LÍQUIDO A RECEBER
                </span>
                <span className={`font-bold text-xl print:text-base text-white`}>
                  {fmt(liquido)}
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé impressão */}
          <div className="hidden print:block text-center text-[10px] text-gray-500 pt-2 border-t mt-2">
            <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</p>
            <p className="mt-0.5">WeGest, Lda. • NIF: 515127850</p>
          </div>
        </div>

        {/* Botões de Ação */}
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

function Row({
  label,
  value,
  bold,
  colored,
}: {
  label: string;
  value: string;
  bold?: boolean;
  colored?: string;
}) {
  return (
    <div className={`flex justify-between items-center print:text-xs ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span className={colored}>{value}</span>
    </div>
  );
}
