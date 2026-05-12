import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, FileText, RefreshCw, TrendingDown, Zap, Fuel, Activity, Building2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export interface ReceitasData {
  contratos: number;
  portagens: number;
  combustivel: number;
  danos: number;
  outros: number;
  reembolsos: number;
  loading: boolean;
}

interface ViaturaFinanceiraMovimentosProps {
  receitas: ReceitasData;
  loadReceitas: () => void;
}

function AmountCard({
  label,
  value,
  icon,
  note,
  colorClass,
  gradientClass,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  note: string;
  colorClass: string;
  gradientClass: string;
  loading: boolean;
}) {
  return (
    <Card className={cn('border-border shadow-sm', gradientClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <p className={cn('text-2xl font-bold', colorClass)}>{formatCurrency(value)}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{note}</p>
      </CardContent>
    </Card>
  );
}

export function ViaturaFinanceiraReceitas({ receitas, loadReceitas }: ViaturaFinanceiraMovimentosProps) {
  const balanco = (receitas.contratos || 0) + (receitas.outros || 0) - (receitas.portagens || 0) - (receitas.combustivel || 0) - (receitas.danos || 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AmountCard
          label="Contratos"
          value={receitas.contratos}
          icon={<Coins className="h-4 w-4 text-green-500" />}
          note="Total de rendas recebidas"
          colorClass="text-green-600 dark:text-green-400"
          gradientClass="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20"
          loading={receitas.loading}
        />
        <AmountCard
          label="Outros Ganhos"
          value={receitas.outros}
          icon={<FileText className="h-4 w-4 text-purple-500" />}
          note="Ajustes e extras"
          colorClass="text-purple-600 dark:text-purple-400"
          gradientClass="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20"
          loading={receitas.loading}
        />

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 flex flex-col justify-center">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">Balanço Operacional</p>
              <p className={cn('text-3xl font-black', balanco >= 0 ? 'text-primary' : 'text-red-500')}>
                {formatCurrency(balanco)}
              </p>
              <Button variant="ghost" size="sm" onClick={loadReceitas} className="w-fit h-7 px-2 text-[10px] uppercase tracking-wider font-bold">
                <RefreshCw className="h-3 w-3 mr-1" /> Atualizar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-dashed text-center">
        <p className="text-sm text-muted-foreground">
          Os dados acima são calculados automaticamente com base nas associações temporais dos motoristas a esta viatura e nos registos financeiros correspondentes.
        </p>
      </div>
    </>
  );
}

export function ViaturaFinanceiraDespesas({ receitas }: { receitas: ReceitasData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <AmountCard
        label="Total de Despesas"
        value={receitas.combustivel + receitas.portagens + receitas.danos}
        icon={<TrendingDown className="h-4 w-4 text-red-500" />}
        note="Soma de todos os custos"
        colorClass="text-red-600 dark:text-red-400"
        gradientClass="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20"
        loading={receitas.loading}
      />
      <AmountCard
        label="Reembolsos"
        value={receitas.reembolsos}
        icon={<RefreshCw className="h-4 w-4 text-orange-500" />}
        note="Total de créditos/devoluções"
        colorClass="text-orange-600 dark:text-orange-400"
        gradientClass="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20"
        loading={receitas.loading}
      />
      <AmountCard
        label="Portagens"
        value={receitas.portagens}
        icon={<Zap className="h-4 w-4 text-blue-500" />}
        note="Custos de via verde/passagens"
        colorClass="text-blue-600 dark:text-blue-400"
        gradientClass="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20"
        loading={receitas.loading}
      />
      <AmountCard
        label="Portagens Operacionais"
        value={0}
        icon={<Building2 className="h-4 w-4 text-slate-500" />}
        note="Custos operacionais de estrutura"
        colorClass="text-slate-600 dark:text-slate-400"
        gradientClass="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20"
        loading={receitas.loading}
      />
      <AmountCard
        label="Combustível"
        value={receitas.combustivel}
        icon={<Fuel className="h-4 w-4 text-orange-500" />}
        note="Gasto total em abastecimentos"
        colorClass="text-orange-600 dark:text-orange-400"
        gradientClass="bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20"
        loading={receitas.loading}
      />
      <AmountCard
        label="Danos"
        value={receitas.danos}
        icon={<Activity className="h-4 w-4 text-red-500" />}
        note="Gasto total em reparações"
        colorClass="text-red-600 dark:text-red-400"
        gradientClass="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20"
        loading={receitas.loading}
      />
    </div>
  );
}
