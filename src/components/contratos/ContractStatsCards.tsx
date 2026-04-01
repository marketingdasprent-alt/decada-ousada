import { Card } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Calendar } from "lucide-react";

interface Contrato {
  motorista_id: string;
  status: string;
  criado_em: string;
}

interface ContractStatsCardsProps {
  contratos: Contrato[];
}

export function ContractStatsCards({ contratos }: ContractStatsCardsProps) {
  // Motoristas únicos com qualquer contrato
  const totalMotoristas = new Set(contratos.map(c => c.motorista_id)).size;
  
  // Motoristas com pelo menos 1 contrato ativo
  const motoristasAtivos = new Set(
    contratos.filter(c => c.status === 'ativo').map(c => c.motorista_id)
  );
  const totalMotoristasAtivos = motoristasAtivos.size;
  
  // Motoristas com contratos expirados (que NÃO têm ativo)
  const motoristasExpirados = new Set(
    contratos.filter(c => c.status === 'expirado').map(c => c.motorista_id)
  );
  const totalMotoristasExpirados = [...motoristasExpirados].filter(
    id => !motoristasAtivos.has(id)
  ).length;
  
  // Motoristas com contratos criados este mês
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const motoristasDoMes = new Set(
    contratos.filter(c => new Date(c.criado_em) >= firstDayOfMonth).map(c => c.motorista_id)
  );
  const totalMotoristasDoMes = motoristasDoMes.size;

  const stats = [
    {
      label: "Total de Motoristas",
      value: totalMotoristas,
      icon: Users,
      color: "text-primary"
    },
    {
      label: "Motoristas Ativos",
      value: totalMotoristasAtivos,
      icon: CheckCircle,
      color: "text-green-500"
    },
    {
      label: "Sem Contrato Ativo",
      value: totalMotoristasExpirados,
      icon: XCircle,
      color: "text-muted-foreground"
    },
    {
      label: "Novos este Mês",
      value: totalMotoristasDoMes,
      icon: Calendar,
      color: "text-blue-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
