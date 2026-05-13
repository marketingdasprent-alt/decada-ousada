import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Pencil, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Organizacao {
  id: string;
  nome: string;
  codigo: string;
  logo_url: string | null;
  ativa: boolean;
  created_at: string;
  _user_count?: number;
}

export const OrganizacoesTab: React.FC = () => {
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organizacao | null>(null);
  const [formData, setFormData] = useState({ nome: '', codigo: '', ativa: true });
  const [saving, setSaving] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizacoes')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar organizações:', error);
      toast.error('Erro ao carregar organizações');
    } else {
      // Count users per org
      const orgsWithCount = await Promise.all(
        (data || []).map(async (org: any) => {
          const { count } = await supabase
            .from('user_organizacoes')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);
          return { ...org, _user_count: count || 0 };
        })
      );
      setOrgs(orgsWithCount);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const openCreateDialog = () => {
    setEditingOrg(null);
    setFormData({ nome: '', codigo: '', ativa: true });
    setDialogOpen(true);
  };

  const openEditDialog = (org: Organizacao) => {
    setEditingOrg(org);
    setFormData({ nome: org.nome, codigo: org.codigo, ativa: org.ativa });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo) {
      toast.error('Nome e código são obrigatórios');
      return;
    }

    setSaving(true);

    if (editingOrg) {
      const { error } = await supabase
        .from('organizacoes')
        .update({
          nome: formData.nome,
          codigo: formData.codigo.toLowerCase().trim(),
          ativa: formData.ativa,
        })
        .eq('id', editingOrg.id);

      if (error) {
        toast.error(error.message.includes('duplicate') ? 'Código já existe' : 'Erro ao atualizar');
      } else {
        toast.success('Organização atualizada');
        setDialogOpen(false);
        fetchOrgs();
      }
    } else {
      const { error } = await supabase.from('organizacoes').insert({
        nome: formData.nome,
        codigo: formData.codigo.toLowerCase().trim(),
        ativa: formData.ativa,
      });

      if (error) {
        toast.error(error.message.includes('duplicate') ? 'Código já existe' : 'Erro ao criar');
      } else {
        toast.success('Organização criada');
        setDialogOpen(false);
        fetchOrgs();
      }
    }

    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizações
          </CardTitle>
          <CardDescription>Gerir as organizações do sistema multi-tenant</CardDescription>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nova Organização
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Utilizadores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.nome}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{org.codigo}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="text-sm">{org._user_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.ativa ? 'default' : 'secondary'}>
                      {org.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(org)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma organização encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? 'Editar Organização' : 'Nova Organização'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-nome">Nome</Label>
                <Input
                  id="org-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome da organização"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-codigo">Código de Login</Label>
                <Input
                  id="org-codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData((p) => ({ ...p, codigo: e.target.value }))}
                  placeholder="Ex: decada"
                />
                <p className="text-xs text-muted-foreground">
                  Código que os utilizadores usam no login para identificar a empresa.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="org-ativa">Ativa</Label>
                <Switch
                  id="org-ativa"
                  checked={formData.ativa}
                  onCheckedChange={(checked) => setFormData((p) => ({ ...p, ativa: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingOrg ? 'Guardar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
