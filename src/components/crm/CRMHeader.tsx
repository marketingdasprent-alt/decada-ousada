
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { ImportLeadsDialog } from './ImportLeadsDialog';
import { ExportLeadsButton } from './ExportLeadsButton';
import { useIsMobile } from '@/hooks/use-mobile';

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  zona?: string;
  data_aluguer?: string;
  status: string;
  campaign_tags?: string[];
  created_at: string;
  observacoes?: string;
  tipo_viatura?: string;
}

interface CRMHeaderProps {
  leads?: Lead[];
  onImportComplete?: () => void;
}

export const CRMHeader: React.FC<CRMHeaderProps> = ({ leads = [], onImportComplete }) => {
  const isMobile = useIsMobile();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const formattedStartDate = startOfMonth.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
  const today = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
  
  if (isMobile) {
    return (
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-4">
          {/* Header Content - Stacked */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-primary/20 to-primary/30 border border-primary/30 flex-shrink-0">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary/90 to-primary bg-clip-text text-transparent">
                Centro de Gestão
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Users className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="truncate">Pipeline de vendas</span>
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                📅 {formattedStartDate} - {today}
              </p>
            </div>
          </div>
          
          {/* Buttons - Stacked */}
          <div className="flex flex-col gap-2">
            <ImportLeadsDialog onImportComplete={onImportComplete || (() => {})} />
            <ExportLeadsButton leads={leads} />
          </div>
        </div>
      </motion.div>
    );
  }

  // Desktop version
  return (
    <motion.div 
      className="mb-12"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Content */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-primary/20 to-primary/30 border border-primary/30">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary/90 to-primary bg-clip-text text-transparent">
              Centro de Gestão
            </h1>
            <p className="text-muted-foreground leading-relaxed flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Controle total sobre seu pipeline de vendas
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              📅 A mostrar leads de <span className="text-primary font-medium">{formattedStartDate}</span> até <span className="text-primary font-medium">{today}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <ImportLeadsDialog onImportComplete={onImportComplete || (() => {})} />
          <ExportLeadsButton leads={leads} />
        </div>
      </div>
    </motion.div>
  );
};
