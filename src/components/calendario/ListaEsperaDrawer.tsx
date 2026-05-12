import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Car, User, CalendarDays, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ListaEsperaDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canManage: boolean; // admin or supervisor
}

interface ListaEsperaEvento {
  id: string;
  titulo: string;        // marca + modelo
  motorista_id: string | null;
  criado_por: string;
  created_at: string;
  motoristaNome: string | null;
  gestorNome: string | null;
}

export const ListaEsperaDrawer: React.FC<ListaEsperaDrawerProps> = ({
  open, onOpenChange, canManage,
}) => {
  const queryClient = useQueryClient();

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ['lista-espera'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendario_eventos')
        .select('id, titulo, motorista_id, criado_por, created_at')
        .eq('tipo', 'lista_espera')
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch motorista names
      const motoristaIds = [...new Set(data.map(e => e.motorista_id).filter(Boolean))] as string[];
      const gestorIds = [...new Set(data.map(e => e.criado_por))];

      const [motoristasRes, gestoresRes] = await Promise.all([
        motoristaIds.length > 0
          ? supabase.from('motoristas_ativos').select('id, nome').in('id', motoristaIds)
          : Promise.resolve({ data: [] }),
        supabase.from('profiles').select('id, nome').in('id', gestorIds),
      ]);

      const motoristasMap = Object.fromEntries(
        (motoristasRes.data || []).map(m => [m.id, m.nome])
      );
      const gestoresMap = Object.fromEntries(
        (gestoresRes.data || []).map(p => [p.id, p.nome])
      );

      return data.map(e => ({
        ...e,
        motoristaNome: e.motorista_id ? (motoristasMap[e.motorista_id] || null) : null,
        gestorNome: gestoresMap[e.criado_por] || null,
      })) as ListaEsperaEvento[];
    },
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendario_eventos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-espera'] });
      queryClient.invalidateQueries({ queryKey: ['calendario-eventos'] });
      toast.success('Entrada removida da lista de espera');
    },
    onError: () => toast.error('Erro ao remover entrada'),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-pink-500" />
            Lista de Espera
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">A carregar...</p>
          )}
          {!isLoading && lista.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem entradas na lista de espera.
            </p>
          )}
          {lista.map(entry => (
            <div
              key={entry.id}
              className="border border-l-4 border-l-pink-500 rounded-lg p-3 bg-card space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-pink-500 shrink-0" />
                    <span className="font-semibold text-sm">{entry.titulo}</span>
                  </div>
                  {entry.motoristaNome && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{entry.motoristaNome}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span>Gestor: {entry.gestorNome || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    <span>{format(new Date(entry.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })}</span>
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate(entry.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
