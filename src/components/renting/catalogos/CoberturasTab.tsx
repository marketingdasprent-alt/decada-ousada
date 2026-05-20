import { useState } from 'react';
import { Shield, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  useCoberturas,
  useCreateCobertura,
  useUpdateCobertura,
  useDeleteCobertura,
} from '@/hooks/useCoberturas';
import type { Cobertura } from '@/types/cobertura';

interface FormState {
  nome: string;
  descricao: string;
  valor_diario: string;
  ativo: boolean;
}

const EMPTY_FORM: FormState = { nome: '', descricao: '', valor_diario: '', ativo: true };

export const CoberturasTab: React.FC = () => {
  const { data: coberturas = [], isLoading } = useCoberturas();
  const createMutation = useCreateCobertura();
  const updateMutation = useUpdateCobertura();
  const deleteMutation = useDeleteCobertura();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cobertura | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cobertura | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: Cobertura) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      descricao: c.descricao ?? '',
      valor_diario: c.valor_diario != null ? String(c.valor_diario) : '',
      ativo: c.ativo,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const nome = form.nome.trim();
    if (!nome) return;
    const valorParsed = form.valor_diario.trim() === '' ? null : Number(form.valor_diario);
    const payload = {
      nome,
      descricao: form.descricao.trim() || null,
      valor_diario: valorParsed != null && Number.isFinite(valorParsed) ? valorParsed : null,
      ativo: form.ativo,
    };

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Coberturas</h3>
          <p className="text-sm text-muted-foreground">
            Coberturas/seguros disponíveis para associar a contratos.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Cobertura
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">A carregar...</p>
      ) : coberturas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma cobertura criada ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coberturas.map((c) => (
            <div key={c.id} className="border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="h-5 w-5 text-primary shrink-0" />
                  <p className="font-medium truncate">{c.nome}</p>
                </div>
                <Badge variant={c.ativo ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {c.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              {c.descricao && (
                <p className="text-xs text-muted-foreground line-clamp-2">{c.descricao}</p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">
                  {c.valor_diario != null ? `${c.valor_diario.toFixed(2)} €/dia` : 'Sem preço'}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cobertura' : 'Nova Cobertura'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cob-nome">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cob-nome"
                placeholder="Ex: Cobertura Total"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cob-descricao">Descrição</Label>
              <Textarea
                id="cob-descricao"
                placeholder="O que esta cobertura inclui..."
                className="min-h-[70px]"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cob-valor">Valor diário (€)</Label>
              <Input
                id="cob-valor"
                type="number"
                min="0"
                step="0.01"
                placeholder="Opcional — informativo"
                value={form.valor_diario}
                onChange={(e) => setForm((f) => ({ ...f, valor_diario: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Ativa</p>
                <p className="text-xs text-muted-foreground">
                  Aparece no select de cobertura do contrato
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.nome.trim()}>
              {isSaving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cobertura</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminar <strong>{deleteTarget?.nome}</strong>? Os contratos que a usam ficam sem
              cobertura associada. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
