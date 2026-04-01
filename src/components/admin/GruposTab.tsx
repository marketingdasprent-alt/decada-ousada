import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Cargo } from '@/hooks/useRBAC';
import { PermissionsSelector } from './PermissionsSelector';

export const GruposTab = () => {
  const [grupos, setGrupos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<Cargo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState<Cargo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<any[]>([]);

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar grupos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openNewGrupoDialog = () => {
    setEditingGrupo(null);
    setFormData({
      nome: '',
      descricao: '',
    });
    setSelectedPermissions([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (grupo: Cargo) => {
    setEditingGrupo(grupo);
    setFormData({
      nome: grupo.nome,
      descricao: grupo.descricao || '',
    });
    setSelectedPermissions([]);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o grupo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      let grupoId: string;

      if (editingGrupo) {
        // Update existing grupo
        const { error } = await supabase
          .from('cargos')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
          })
          .eq('id', editingGrupo.id);

        if (error) throw error;
        grupoId = editingGrupo.id;

        // Delete old permissions
        await supabase
          .from('cargo_permissoes')
          .delete()
          .eq('cargo_id', grupoId);
      } else {
        // Create new grupo
        const { data, error } = await supabase
          .from('cargos')
          .insert([
            {
              nome: formData.nome,
              descricao: formData.descricao,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        grupoId = data.id;
      }

      // Insert new permissions
      if (selectedPermissions.length > 0) {
        const permissionsToInsert = selectedPermissions.map((perm) => ({
          cargo_id: grupoId,
          recurso_id: perm.recurso_id,
          tem_acesso: perm.tem_acesso || false,
        }));

        const { error: permError } = await supabase
          .from('cargo_permissoes')
          .insert(permissionsToInsert);

        if (permError) throw permError;
      }

      toast({
        title: editingGrupo ? 'Grupo atualizado' : 'Grupo criado',
        description: editingGrupo
          ? 'O grupo foi atualizado com sucesso.'
          : 'O novo grupo foi criado com sucesso.',
      });

      setIsDialogOpen(false);
      fetchGrupos();
    } catch (error: any) {
      toast({
        title: 'Erro ao guardar grupo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!grupoToDelete) return;

    setIsDeleting(true);
    try {
      // Check if any users have this grupo
      const { data: usersWithGrupo, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('cargo_id', grupoToDelete.id)
        .limit(1);

      if (checkError) throw checkError;

      if (usersWithGrupo && usersWithGrupo.length > 0) {
        toast({
          title: 'Não é possível eliminar',
          description: 'Existem utilizadores associados a este grupo. Por favor, reatribua-os primeiro.',
          variant: 'destructive',
        });
        setDeleteConfirmOpen(false);
        setGrupoToDelete(null);
        setIsDeleting(false);
        return;
      }

      // Delete associated permissions first
      const { error: permError } = await supabase
        .from('cargo_permissoes')
        .delete()
        .eq('cargo_id', grupoToDelete.id);

      if (permError) throw permError;

      // Delete the grupo
      const { error } = await supabase
        .from('cargos')
        .delete()
        .eq('id', grupoToDelete.id);

      if (error) throw error;

      toast({
        title: 'Grupo eliminado',
        description: 'O grupo foi eliminado com sucesso.',
      });

      fetchGrupos();
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar grupo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setGrupoToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Grupos</CardTitle>
          <Button
            onClick={openNewGrupoDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </CardHeader>
        <CardContent>
          {grupos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum grupo criado ainda. Clique em "Novo Grupo" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((grupo) => (
                  <TableRow key={grupo.id} className="border-border hover:bg-muted">
                    <TableCell className="text-foreground font-medium">{grupo.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{grupo.descricao || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(grupo)}
                          className="text-primary hover:text-primary/80 hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setGrupoToDelete(grupo);
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGrupo ? 'Editar Grupo' : 'Novo Grupo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Gestor TVDE, Comercial, etc."
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o grupo e suas responsabilidades..."
                className="min-h-[80px]"
              />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Permissões</h3>
              <PermissionsSelector
                cargoId={editingGrupo?.id}
                onChange={setSelectedPermissions}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar o grupo "{grupoToDelete?.nome}"?
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A eliminar...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
