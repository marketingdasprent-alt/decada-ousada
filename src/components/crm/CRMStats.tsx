import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  zona?: string;
  data_aluguer?: string;
  status: string;
  created_at: string;
}

interface StatusColumn {
  id: string;
  title: string;
  color: string;
  icon: string;
}

interface CRMStatsProps {
  leads: Lead[];
  statusColumns: StatusColumn[];
}

export const CRMStats: React.FC<CRMStatsProps> = ({
  leads,
  statusColumns
}) => {
  const isMobile = useIsMobile();
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(lead => lead.status === 'convertido').length;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100).toFixed(1) : '0';
  const newLeadsToday = leads.filter(lead => {
    const today = new Date().toDateString();
    const leadDate = new Date(lead.created_at).toDateString();
    return today === leadDate;
  }).length;

  const stats = [{
    title: 'Total de Leads',
    value: totalLeads.toString(),
    icon: Target,
    change: `+${newLeadsToday} hoje`,
    changeType: 'positive' as 'positive' | 'negative' | 'neutral',
    color: 'from-blue-500 to-blue-600'
  }, {
    title: 'Taxa de Conversão',
    value: `${conversionRate}%`,
    icon: TrendingUp,
    change: 'Meta: 25%',
    changeType: (parseFloat(conversionRate) >= 25 ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral',
    color: 'from-green-500 to-green-600'
  }, {
    title: 'Convertidos',
    value: convertedLeads.toString(),
    icon: DollarSign,
    change: 'Este mês',
    changeType: 'positive' as 'positive' | 'negative' | 'neutral',
    color: 'from-purple-500 to-purple-600'
  }, {
    title: 'Pipeline Ativo',
    value: (totalLeads - convertedLeads - leads.filter(l => l.status === 'perdido').length).toString(),
    icon: TrendingUp,
    change: 'Em progresso',
    changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
    color: 'from-primary to-primary/80'
  }];

  return (
    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1 mb-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'}`}>
      {stats.map((stat, index) => (
        <motion.div 
          key={stat.title} 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card className="bg-gradient-to-br from-card/50 to-card backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
            <CardContent className={isMobile ? "p-4 bg-card rounded-sm" : "p-6 bg-card rounded-sm"}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-muted-foreground font-medium mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>{stat.title}</p>
                  <p className={`font-bold text-foreground mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{stat.value}</p>
                  <div className="flex items-center gap-1">
                    {stat.changeType === 'positive' ? <TrendingUp className="h-3 w-3 text-green-500" /> : stat.changeType === 'negative' ? <TrendingDown className="h-3 w-3 text-red-500" /> : null}
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${stat.changeType === 'positive' ? 'text-green-500' : stat.changeType === 'negative' ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`rounded-full bg-gradient-to-r ${stat.color} bg-opacity-20 ${isMobile ? 'p-2' : 'p-3'}`}>
                  <stat.icon className={isMobile ? "h-5 w-5 text-foreground" : "h-6 w-6 text-foreground"} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
