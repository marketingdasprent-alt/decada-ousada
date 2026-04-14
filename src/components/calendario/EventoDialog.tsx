import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { CalendarioEvento } from '@/pages/Calendario';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: CalendarioEvento | null;
  userId: string;
  defaultDate?: Date;
}

const TIPOS = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'recolha', label: 'Recolha' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'troca', label: 'Troca' },
  { value: 'upgrade', label: 'Upgrade' },
];

export const EventoDialog: React.FC<Props> = ({ open, onOpenChange, evento, userId, defaultDate }) => {
  const queryClient = useQueryClient();
  const isEditing = !!evento;

  const [matricula, setMatricula] = useState('');
  const [matriculaDevolver, setMatriculaDevolver] = useState('');
  const [cidade, setCidade] = useState('');
  const [tipo, setTipo] = useState('entrega');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diaTodo, setDiaTodo] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (evento) {
      setMatricula(evento.titulo);
      setMatriculaDevolver(evento.matricula_devolver || '');
      setCidade(evento.cidade || '');
      setTipo(evento.tipo);
      setDataInicio(evento.data_inicio.slice(0, 16));
      setDataFim(evento.data_fim ? evento.data_fim.slice(0, 16) : '');
      setDiaTodo(evento.dia_todo);
      setObservacoes(evento.descricao || '');
    } else {
      const base = defaultDate || new Date();
      const yyyy = base.getFullYear();
      const mm = String(base.getMonth() + 1).padStart(2, '0');
      const dd = String(base.getDate()).padStart(2, '0');
      const local = `${yyyy}-${mm}-${dd}T00:00`;
      setMatricula('');
      setMatriculaDevolver('');
      setCidade('');
      setTipo('entrega');
      setDataInicio(local);
      setDataFim('');
      setDiaTodo(false);
      setObservacoes('');
    }
  }, [evento, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        titulo: matricula.toUpperCase().replace(/[-\s]/g, ''),
        cidade: cidade || null,
        tipo,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: dataFim ? new Date(dataFim).toISOString() : null,
        dia_todo: diaTodo,
        descricao: observacoes.trim() || null,
        matricula_devolver: tipo === 'troca' ? (matriculaDevolver.toUpperCase().replace(/[-\s]/g, '') || null) : null,
      };

      if (!isEditing) {
        payload.criado_por = userId;
      }

      if (isEditing) {
        // Compare and record changes
        const changes: { campo: string; valor_anterior: string | null; valor_novo: string | null }[] = [];
        const compare = (campo: string, oldVal: any, newVal: any) => {
          const o = oldVal == null ? null : String(oldVal);
          const n = newVal == null ? null : String(newVal);
          if (o !== n) changes.push({ campo, valor_anterior: o, valor_novo: n });
        };
        compare('titulo', evento.titulo, payload.titulo);
        compare('cidade', evento.cidade, payload.cidade);
        compare('tipo', evento.tipo, payload.tipo);
        compare('data_inicio', evento.data_inicio, payload.data_inicio);
        compare('data_fim', evento.data_fim, payload.data_fim);
        compare('dia_todo', evento.dia_todo, payload.dia_todo);
        compare('descricao', evento.descricao, payload.descricao);
        compare('matricula_devolver', evento.matricula_devolver, payload.matricula_devolver);

        const { error } = await supabase
          .from('calendario_eventos')
          .update(payload)
          .eq('id', evento.id);
        if (error) throw error;

        // Insert history records
        if (changes.length > 0) {
          const histRecords = changes.map(c => ({
            evento_id: evento.id,
            editado_por: userId,
            campo: c.campo,
            valor_anterior: c.valor_anterior,
            valor_novo: c.valor_novo,
          }));
          await supabase.from('calendario_eventos_historico').insert(histRecords);
        }
      } else {
        const { error } = await supabase
          .from('calendario_eventos')
          .insert(payload);
        if (error) throw error;

        // Notificar CC por email (apenas ao criar)
        try {
          await supabase.functions.invoke('send-calendar-notification', {
            body: {
              matricula: payload.titulo,
              cidade: payload.cidade,
              tipo: payload.tipo,
              data_inicio: payload.data_inicio,
              dia_todo: payload.dia_todo,
            },
          });
        } catch (e) {
          console.error('Erro ao enviar notificação CC:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario-eventos'] });
      toast.success(isEditing ? 'Evento actualizado' : 'Evento criado');
      onOpenChange(false);
    },
    onError: () => toast.error('Erro ao guardar evento'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="matricula">{tipo === 'troca' ? 'Matrícula a Entregar' : 'Matrícula'}</Label>
            <Input id="matricula" value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Ex: 26ZC03" />
          </div>

          {tipo === 'troca' && (
            <div>
              <Label htmlFor="matricula-devolver">Matrícula a Devolver</Label>
              <Input id="matricula-devolver" value={matriculaDevolver} onChange={e => setMatriculaDevolver(e.target.value)} placeholder="Ex: 11AA22" />
            </div>
          )}

          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Lisboa" />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={diaTodo} onCheckedChange={setDiaTodo} id="dia-todo" />
            <Label htmlFor="dia-todo">Dia inteiro</Label>
          </div>

          <div>
            <Label htmlFor="data-inicio">{diaTodo ? 'Data' : 'Data e hora de início'}</Label>
            <Input
              id="data-inicio"
              type={diaTodo ? 'date' : 'datetime-local'}
              value={diaTodo ? dataInicio.slice(0, 10) : dataInicio}
              onChange={e => setDataInicio(diaTodo ? e.target.value + 'T00:00' : e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Notas adicionais sobre o evento..."
              rows={3}
            />
          </div>

          {!diaTodo && (
            <div>
              <Label htmlFor="data-fim">Data e hora de fim (opcional)</Label>
              <Input
                id="data-fim"
                type="datetime-local"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!matricula || !dataInicio || mutation.isPending}>
            {mutation.isPending ? 'A guardar...' : isEditing ? 'Guardar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
