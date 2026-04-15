// Calendario module
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { CalendarioGrid } from '@/components/calendario/CalendarioGrid';
import { EventoDialog } from '@/components/calendario/EventoDialog';
import { EventoHistoricoDialog } from '@/components/calendario/EventoHistoricoDialog';
import { CalendarioConfig } from '@/components/calendario/CalendarioConfig';
import { RelatorioDialog } from '@/components/calendario/RelatorioDialog';
import { NovoEventoPage } from '@/components/calendario/NovoEventoPage';
import { Button } from '@/components/ui/button';
import { Plus, Settings, CalendarDays, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';

export interface CalendarioEvento {
  id: string;
  titulo: string;
  descricao: string | null;
  cidade: string | null;
  tipo: string;
  data_inicio: string;
  data_fim: string | null;
  dia_todo: boolean;
  matricula_devolver: string | null;
  criado_por: string;
  created_at: string;
  updated_at: string;
  profiles: { nome: string } | null;
}

const Calendario: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [novoEventoOpen, setNovoEventoOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<CalendarioEvento | null>(null);
  const [detailsEvento, setDetailsEvento] = useState<CalendarioEvento | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Realtime subscription - actualiza automaticamente quando qualquer gestor cria/edita/elimina eventos
  useEffect(() => {
    const channel = supabase
      .channel('calendario-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendario_eventos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['calendario-eventos'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['calendario-eventos', currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
      
      // Extend range to cover visible days from adjacent months
      startOfMonth.setDate(startOfMonth.getDate() - 7);
      endOfMonth.setDate(endOfMonth.getDate() + 7);

      const { data, error } = await supabase
        .from('calendario_eventos')
        .select('*')
        .gte('data_inicio', startOfMonth.toISOString())
        .lte('data_inicio', endOfMonth.toISOString())
        .order('data_inicio', { ascending: true });

      if (error) throw error;

      // Buscar nomes dos criadores em separado
      const criadorIds = [...new Set((data || []).map(e => e.criado_por))];
      let profilesMap: Record<string, string> = {};
      if (criadorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', criadorIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id, p.nome || '']));
        }
      }

      return (data || []).map(e => ({
        ...e,
        profiles: profilesMap[e.criado_por] ? { nome: profilesMap[e.criado_por] } : null,
      })) as CalendarioEvento[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendario_eventos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario-eventos'] });
      toast.success('Evento eliminado');
    },
    onError: () => toast.error('Erro ao eliminar evento'),
  });

  const handleEdit = (evento: CalendarioEvento) => {
    setEditingEvento(evento);
  };

  const handleNew = () => {
    setNovoEventoOpen(true);
  };

  const handleDetails = (evento: CalendarioEvento) => {
    setDetailsEvento(evento);
    setHistoricoOpen(true);
  };

  return (
    <>
    {novoEventoOpen && (
      <NovoEventoPage
        userId={user?.id || ''}
        defaultDate={selectedDay || undefined}
        onClose={() => setNovoEventoOpen(false)}
      />
    )}
    {editingEvento && (
      <EventoDialog
        evento={editingEvento}
        userId={user?.id || ''}
        onClose={() => setEditingEvento(null)}
      />
    )}
    <div className="space-y-6">
      <StickyPageHeader
        title="Calendário"
        description="Agendamento de entregas, devoluções e manutenções"
        icon={CalendarDays}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setRelatorioOpen(true)}>
            <FileDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          {hasPermission('calendario_criar') && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Evento</span>
            </Button>
          )}
        </div>
      </StickyPageHeader>

      <CalendarioGrid
        eventos={eventos}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onEventClick={(hasPermission('calendario_editar') || hasPermission('calendario_gerir_todos')) ? handleEdit : undefined}
        onDeleteEvent={(hasPermission('calendario_eliminar') || hasPermission('calendario_gerir_todos')) ? (id) => deleteMutation.mutate(id) : undefined}
        onEventDetails={handleDetails}
        onDaySelect={setSelectedDay}
        isLoading={isLoading}
        currentUserId={user?.id}
        canEditAll={hasPermission('calendario_gerir_todos')}
      />

<EventoHistoricoDialog
        open={historicoOpen}
        onOpenChange={setHistoricoOpen}
        evento={detailsEvento}
      />

      <CalendarioConfig open={configOpen} onOpenChange={setConfigOpen} userId={user?.id || ''} />

      <RelatorioDialog open={relatorioOpen} onOpenChange={setRelatorioOpen} currentMonth={currentMonth} />
    </div>
    </>
  );
};

export default Calendario;
