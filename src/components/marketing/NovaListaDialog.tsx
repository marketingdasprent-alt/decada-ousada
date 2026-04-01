import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lista?: any;
}

const NovaListaDialog = ({ open, onOpenChange, lista }: Props) => {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (lista) {
      setNome(lista.nome || '');
      setDescricao(lista.descricao || '');
    } else {
      setNome('');
      setDescricao('');
    }
  }, [lista, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (lista?.id) {
        const { error } = await supabase.from('marketing_listas').update({ nome, descricao }).eq('id', lista.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('marketing_listas').insert({ nome, descricao, criado_por: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-listas'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-listas-with-count'] });
      toast.success(lista ? 'Lista atualizada' : 'Lista criada');
      onOpenChange(false);
    },
    onError: () => toast.error('Erro ao guardar lista'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lista ? 'Editar Lista' : 'Nova Lista'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Clientes TVDE" />
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição da lista" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!nome || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {lista ? 'Guardar' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NovaListaDialog;
