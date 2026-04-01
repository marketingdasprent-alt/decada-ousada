import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  observacoes_gestores?: string;
  tipo_viatura?: string;
  formulario_id?: string;
  tem_formacao_tvde?: boolean;
}

interface ExportLeadsButtonProps {
  leads: Lead[];
}

export const ExportLeadsButton: React.FC<ExportLeadsButtonProps> = ({ leads }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const convertToCSV = (data: Lead[]) => {
    const headers = [
      'nome',
      'email',
      'telefone',
      'zona',
      'data_aluguer',
      'status',
      'campaign_tags',
      'observacoes',
      'observacoes_gestores',
      'tipo_viatura',
      'formulario_id',
      'tem_formacao_tvde',
      'created_at'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(lead => [
        `"${lead.nome || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.telefone || ''}"`,
        `"${lead.zona || ''}"`,
        `"${lead.data_aluguer || ''}"`,
        `"${lead.status || ''}"`,
        `"${lead.campaign_tags?.join(';') || ''}"`,
        `"${lead.observacoes || ''}"`,
        `"${lead.observacoes_gestores || ''}"`,
        `"${lead.tipo_viatura || ''}"`,
        `"${lead.formulario_id || ''}"`,
        `"${lead.tem_formacao_tvde !== null ? (lead.tem_formacao_tvde ? 'Sim' : 'Não') : ''}"`,
        `"${lead.created_at || ''}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  };

  const handleExport = async () => {
    setIsLoading(true);

    try {
      // Fetch all leads from database to ensure we have the most recent data
      const { data: allLeads, error } = await supabase
        .from('leads_dasprent')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csvContent = convertToCSV(allLeads || []);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_dasprent_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Sucesso",
        description: `${allLeads?.length || 0} leads exportados com sucesso`
      });
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar leads",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading}
      variant="outline"
      className="bg-blue-600/20 border-blue-500/50 text-blue-100 hover:bg-blue-600/30"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Exportar Leads
        </>
      )}
    </Button>
  );
};