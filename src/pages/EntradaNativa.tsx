import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useThemedLogo } from '@/hooks/useThemedLogo';

const EntradaNativa = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const logoSrc = useThemedLogo();

  useEffect(() => {
    if (user) {
      const mode = localStorage.getItem('wegest_native_mode');
      if (mode === 'colaborador') {
        navigate('/equipa', { replace: true });
      } else {
        navigate('/motorista/painel', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleMotorista = () => {
    localStorage.setItem('wegest_native_mode', 'motorista');
    navigate('/motorista');
  };

  const handleColaborador = () => {
    localStorage.setItem('wegest_native_mode', 'colaborador');
    navigate('/equipa');
  };

  return (
    <div className="auth-screen auth-screen-safe rota-liquida">
      <div className="auth-screen__background" aria-hidden="true" />
      <div className="auth-screen__pattern" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center gap-10">
        <img src={logoSrc} alt="WeGest" className="h-24 w-auto object-contain" />

        <div className="w-full space-y-2 text-center">
          <h1 className="text-2xl font-black text-foreground">Bem-vindo</h1>
          <p className="text-sm text-muted-foreground">Como pretende entrar?</p>
        </div>

        <div className="w-full space-y-4">
          <button
            onClick={handleMotorista}
            className="w-full flex items-center gap-5 p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
          >
            <div className="p-3 bg-primary/10 rounded-xl shrink-0">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-black text-base text-foreground">Motorista</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aceder ao painel de motorista</p>
            </div>
          </button>

          <button
            onClick={handleColaborador}
            className="w-full flex items-center gap-5 p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
          >
            <div className="p-3 bg-blue-500/10 rounded-xl shrink-0">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="font-black text-base text-foreground">Colaborador</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aceder à área de gestão</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntradaNativa;
