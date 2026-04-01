import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const CalendarioConfig: React.FC<Props> = ({ open, onOpenChange, userId }) => {
  const queryClient = useQueryClient();
  const [emailCc, setEmailCc] = useState('');

  const { data: config } = useQuery({
    queryKey: ['calendario-config', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendario_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && open,
  });

  useEffect(() => {
    if (config) {
      setEmailCc(config.email_cc || '');
    } else {
      setEmailCc('');
    }
  }, [config]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (config) {
        const { error } = await supabase
          .from('calendario_config')
          .update({ email_cc: emailCc || null })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calendario_config')
          .insert({ user_id: userId, email_cc: emailCc || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario-config'] });
      toast.success('Configuração guardada');
      onOpenChange(false);
    },
    onError: () => toast.error('Erro ao guardar configuração'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configuração do Calendário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email-cc">Email CC para lembretes</Label>
            <Input
              id="email-cc"
              type="email"
              value={emailCc}
              onChange={e => setEmailCc(e.target.value)}
              placeholder="email@exemplo.pt"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este email receberá cópia dos lembretes de eventos.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
