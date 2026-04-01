import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { CandidaturaFormulario } from '@/components/motorista/CandidaturaFormulario';
import { CandidaturaEmAnalise } from '@/components/motorista/CandidaturaEmAnalise';
import { CandidaturaRejeitada } from '@/components/motorista/CandidaturaRejeitada';
import { MotoristaDashboard } from '@/components/motorista/MotoristaDashboard';

export type CandidaturaStatus = 'rascunho' | 'submetido' | 'em_analise' | 'aprovado' | 'rejeitado';

export interface Candidatura {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  nif: string | null;
  morada: string | null;
  codigo_postal: string | null;
  cidade: string | null;
  documento_tipo: string | null;
  documento_numero: string | null;
  documento_validade: string | null;
  documento_ficheiro_url: string | null;
  documento_frente_url?: string | null;
  documento_identificacao_verso_url: string | null;
  carta_conducao: string | null;
  carta_categorias: string[] | null;
  carta_validade: string | null;
  carta_ficheiro_url: string | null;
  carta_frente_url?: string | null;
  carta_conducao_verso_url: string | null;
  licenca_tvde_numero: string | null;
  licenca_tvde_validade: string | null;
  licenca_tvde_ficheiro_url: string | null;
  registo_criminal_url: string | null;
  comprovativo_morada_url: string | null;
  comprovativo_iban_url: string | null;
  outros_documentos: any[];
  status: CandidaturaStatus;
  data_submissao: string | null;
  data_decisao: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  updated_at: string;
}

interface MotoristaAtivo {
  id: string;
  user_id: string;
  status_ativo: boolean;
}

const PainelMotorista: React.FC = () => {
  const { user } = useAuth();
  const [candidatura, setCandidatura] = useState<Candidatura | null>(null);
  const [motoristaAtivo, setMotoristaAtivo] = useState<MotoristaAtivo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: motoristaData } = await supabase
        .from('motoristas_ativos')
        .select('id, user_id, status_ativo')
        .eq('user_id', user.id)
        .maybeSingle();

      if (motoristaData) {
        setMotoristaAtivo(motoristaData);
        setLoading(false);
        return;
      }

      const { data: candidaturaData, error: candidaturaError } = await supabase
        .from('motorista_candidaturas')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (candidaturaError && candidaturaError.code !== 'PGRST116') {
        console.error('Erro ao carregar candidatura:', candidaturaError);
      }

      setCandidatura(candidaturaData as Candidatura | null);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content-safe flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-base text-foreground">A carregar a área do motorista...</p>
        </div>
      </div>
    );
  }

  if (motoristaAtivo) {
    return <MotoristaDashboard />;
  }

  if (!candidatura || candidatura.status === 'rascunho') {
    return <CandidaturaFormulario candidatura={candidatura} onUpdate={loadUserData} />;
  }

  if (candidatura.status === 'submetido' || candidatura.status === 'em_analise') {
    return <CandidaturaEmAnalise candidatura={candidatura} />;
  }

  if (candidatura.status === 'aprovado') {
    return <MotoristaDashboard />;
  }

  if (candidatura.status === 'rejeitado') {
    return <CandidaturaRejeitada candidatura={candidatura} onResubmit={loadUserData} />;
  }

  return null;
};

export default PainelMotorista;
