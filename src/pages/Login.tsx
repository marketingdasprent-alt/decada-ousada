import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDefaultRoute } from '@/hooks/useDefaultRoute';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { getEmailRedirectUrl, getResetPasswordRedirectUrl } from '@/lib/native';
import { AuthMobileShell } from '@/components/auth/AuthMobileShell';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { user } = useAuth();
  const { defaultRoute, loading: routeLoading } = useDefaultRoute();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!user) {
      hasRedirected.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (hasRedirected.current) return;

    if (user && !routeLoading && defaultRoute) {
      hasRedirected.current = true;
      navigate(defaultRoute, { replace: true });
    }
  }, [user, routeLoading, defaultRoute, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Sessão iniciada com sucesso.',
      });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Erro no login',
        description: error.message || 'Não foi possível iniciar sessão. Verifique as suas credenciais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: 'Email obrigatório',
        description: 'Introduza o seu email para recuperar a palavra-passe.',
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getResetPasswordRedirectUrl(),
      });

      if (error) throw error;

      toast({
        title: 'Email enviado',
        description: 'Verifique o seu email para redefinir a palavra-passe.',
      });

      setResetMode(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Erro ao enviar email',
        description: error.message || 'Não foi possível enviar o email de recuperação.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast({
        title: 'Email obrigatório',
        description: 'Introduza o seu email para receber o link de acesso.',
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getEmailRedirectUrl(defaultRoute || '/crm'),
        },
      });

      if (error) throw error;

      toast({
        title: 'Link enviado',
        description: 'Verifique o seu email para entrar sem palavra-passe.',
      });
    } catch (error: any) {
      console.error('Magic link error:', error);
      toast({
        title: 'Erro ao enviar link',
        description: error.message || 'Não foi possível enviar o link de acesso.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthMobileShell
      title={resetMode ? 'Recuperar acesso' : 'Iniciar sessão'}
      description={
        resetMode
          ? 'Introduza o seu email para receber o link de redefinição.'
          : 'Acesso exclusivo para membros autorizados.'
      }
      logoAlt="Década Ousada"
      headerIcon={<ShieldCheck className="auth-icon-accent" />}
      footer={
        !resetMode ? (
          <p>
            Não tem acesso?{' '}
            <Link to="/auth/register" className="auth-link">
              Registar com convite
            </Link>
          </p>
        ) : null
      }
    >
      {resetMode ? (
        <form onSubmit={handlePasswordReset} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <Button type="submit" disabled={resetLoading} className="auth-primary-button w-full">
            {resetLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A enviar...
              </>
            ) : (
              'Enviar email de recuperação'
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setResetMode(false)}
            className="w-full"
          >
            Voltar ao login
          </Button>
        </form>
      ) : (
        <>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                placeholder="seu@email.com"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input pr-11"
                  placeholder="A sua palavra-passe"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setResetMode(true)} className="auth-link">
                Esqueceu-se da palavra-passe?
              </button>
            </div>

            <Button type="submit" disabled={loading} className="auth-primary-button w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A entrar...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span className="bg-card px-2">ou</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleMagicLink}
              disabled={resetLoading}
              variant="outline"
              className="auth-secondary-button mt-4 w-full"
            >
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A enviar...
                </>
              ) : (
                'Receber link de acesso'
              )}
            </Button>
          </div>
        </>
      )}
    </AuthMobileShell>
  );
};

export default Login;
