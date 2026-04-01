import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthMobileShell } from '@/components/auth/AuthMobileShell';
import { useAuth } from '@/contexts/AuthContext';

const EntradaMotoristaNativa = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/motorista/painel', { replace: true });
    }
  }, [user, navigate]);

  return (
    <AuthMobileShell
      title="Área do Motorista"
      description="Escolha como pretende continuar para aceder ao seu painel de motorista."
      logoAlt="Década Ousada"
      headerIcon={<Car className="auth-icon-accent" />}
    >
      <div className="space-y-3">
        <Button asChild className="auth-primary-button w-full">
          <Link to="/motorista/login" className="inline-flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" />
            Entrar
          </Link>
        </Button>

        <Button asChild variant="secondary" className="auth-secondary-button w-full">
          <Link to="/motorista/registo" className="inline-flex items-center justify-center gap-2">
            <UserPlus className="h-4 w-4" />
            Criar conta
          </Link>
        </Button>

        <Button asChild variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
          <Link to="/motorista/login?modo=recuperar" className="inline-flex items-center justify-center gap-2">
            <KeyRound className="h-4 w-4" />
            Recuperar acesso
          </Link>
        </Button>
      </div>
    </AuthMobileShell>
  );
};

export default EntradaMotoristaNativa;
