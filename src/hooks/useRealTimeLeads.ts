import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  zona?: string;
  data_aluguer?: string;
  tipo_viatura?: string;
  observacoes?: string;
  observacoes_gestores?: string;
  campaign_tags?: string[];
  status: string;
  created_at: string;
  formulario_id?: string;
  gestor_responsavel?: string;
  valor_negocio?: string;
}

export const useRealTimeLeads = (onRealtimeEvent?: (payload: any) => void) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  
  // Usar ref para estabilizar o callback e evitar reconexões
  const onRealtimeEventRef = useRef(onRealtimeEvent);
  
  // Atualizar a ref quando o callback mudar
  useEffect(() => {
    onRealtimeEventRef.current = onRealtimeEvent;
  }, [onRealtimeEvent]);

  const fetchLeads = useCallback(async () => {
    try {
      console.log('🔄 Buscando todos os leads...');
      
      const { data, error } = await supabase
        .from('leads_dasprent')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ ${data?.length || 0} leads carregados`);
      setLeads(data || []);
    } catch (error) {
      console.error('❌ Erro ao buscar leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carregar leads iniciais
    fetchLeads();

    // Configurar real-time updates
    console.log('🔴 Configurando escuta em tempo real para leads...');
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads_dasprent'
        },
        (payload) => {
          console.log('🔄 Mudança detectada em leads:', payload);
          setLastActivity(new Date());
          
          // Notificar callback externo usando a ref
          onRealtimeEventRef.current?.(payload);
          
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            console.log(`➕ Novo lead adicionado: ${newLead.nome}`);
            setLeads(current => {
              // Evitar duplicatas
              const exists = current.find(lead => lead.id === newLead.id);
              if (exists) return current;
              return [newLead, ...current];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            const oldLead = payload.old as { gestor_responsavel?: string };
            console.log(`📝 Lead atualizado: ${updatedLead.nome}`);
            
            // Verificar se o gestor foi atribuído (de vazio para preenchido)
            const gestorFoiAtribuido = 
              (!oldLead.gestor_responsavel || oldLead.gestor_responsavel === '') && 
              updatedLead.gestor_responsavel && 
              updatedLead.gestor_responsavel !== '';
            
            if (gestorFoiAtribuido) {
              // Verificar se o gestor atual é o novo responsável
              supabase.auth.getUser().then(async ({ data: { user } }) => {
                if (!user) return;
                
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('nome')
                  .eq('id', user.id)
                  .single();
                
                if (profile?.nome !== updatedLead.gestor_responsavel) {
                  // Remover o lead da lista (foi atribuído a outro gestor)
                  console.log(`🚫 Lead "${updatedLead.nome}" foi atribuído a ${updatedLead.gestor_responsavel}, removendo da lista`);
                  setLeads(current => current.filter(lead => lead.id !== updatedLead.id));
                } else {
                  // É o gestor atual, atualizar normalmente
                  setLeads(current => 
                    current.map(lead => lead.id === updatedLead.id ? updatedLead : lead)
                  );
                }
              });
            } else {
              // Atualização normal (sem mudança de gestor)
              setLeads(current => 
                current.map(lead => lead.id === updatedLead.id ? updatedLead : lead)
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedLead = payload.old as Lead;
            console.log(`🗑️ Lead removido: ${deletedLead.nome}`);
            setLeads(current => 
              current.filter(lead => lead.id !== deletedLead.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da conexão Realtime:', status);
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          setLastActivity(new Date());
        }
      });

    return () => {
      console.log('🔴 Removendo escuta em tempo real para leads...');
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]); // Removido onRealtimeEvent das dependências

  const updateLead = useCallback((updatedLead: Partial<Lead> & { id: string }) => {
    setLeads(current => 
      current.map(lead => 
        lead.id === updatedLead.id 
          ? { ...lead, ...updatedLead }
          : lead
      )
    );
  }, []);

  const deleteLead = useCallback((leadId: string) => {
    setLeads(current => current.filter(lead => lead.id !== leadId));
  }, []);

  return {
    leads,
    loading,
    isConnected,
    lastActivity,
    updateLead,
    deleteLead,
    refetchLeads: fetchLeads
  };
};