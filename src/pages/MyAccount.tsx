import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDefaultRoute } from '@/hooks/useDefaultRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  nome: string;
  cargo: string;
  is_admin: boolean;
  created_at: string;
}

export default function MyAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { defaultRoute } = useDefaultRoute();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData(prev => ({
        ...prev,
        nome: data.nome || '',
      }));
    } catch (error: any) {
      console.error('Erro ao buscar perfil:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar dados do perfil',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // REMOVIDO: Redirect automático causava loop infinito
  // Usuários devem poder acessar /my-account independentemente das permissões

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: formData.nome })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar perfil',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem',
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso',
      });

      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao alterar senha',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <p className="text-white">Perfil não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Minha Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações Gerais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Pessoais</h3>
              
              <div>
                <Label htmlFor="nome">
                  Nome
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    nome: e.target.value
                  }))}
                  onKeyDown={(e) => handleKeyDown(e, handleUpdateProfile)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={profile.email}
                  disabled
                  className="bg-muted cursor-not-allowed opacity-80"
                />
                <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
              </div>

              <div>
                <Label>Cargo</Label>
                <Input
                  value={profile.cargo || 'Não definido'}
                  disabled
                  className="bg-muted cursor-not-allowed opacity-80"
                />
                <p className="text-xs text-muted-foreground mt-1">O cargo só pode ser alterado por um administrador</p>
              </div>

              <div>
                <Label>Data de Criação</Label>
                <Input
                  value={formatDate(profile.created_at)}
                  disabled
                  className="bg-muted cursor-not-allowed opacity-80"
                />
              </div>

              <div>
                <Label>Tipo de Conta</Label>
                <Input
                  value={profile.is_admin ? 'Administrador' : 'Usuário'}
                  disabled
                  className="bg-muted cursor-not-allowed opacity-80"
                />
              </div>

              <Button
                onClick={handleUpdateProfile}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Informações
              </Button>
            </div>

            {/* Alteração de Senha */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Alterar Senha</h3>
              
              <div>
                <Label htmlFor="newPassword">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                    placeholder="Nova senha (min. 6 caracteres)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      new: !prev.new
                    }))}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                    onKeyDown={(e) => handleKeyDown(e, handleChangePassword)}
                    placeholder="Confirme a nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      confirm: !prev.confirm
                    }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !formData.newPassword || !formData.confirmPassword}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}