import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'react-router-dom';

interface AuthMobileShellProps {
  title: string;
  description: string;
  logoAlt: string;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthMobileShell({
  title,
  description,
  logoAlt,
  headerIcon,
  footer,
  children,
}: AuthMobileShellProps) {
  const location = useLocation();
  const isMotoristaRoute = location.pathname === '/motorista' || location.pathname.startsWith('/motorista/');
  
  const logoSrc = isMotoristaRoute 
    ? '/images/logo-rota-liquida.png.png'
    : '/images/logo-decada-ousada-white.png';

  return (
    <div className={`auth-screen auth-screen-safe ${isMotoristaRoute ? 'rota-liquida' : ''}`}>
      <div className="auth-screen__background" aria-hidden="true" />
      <div className="auth-screen__pattern" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        <Card className="auth-panel shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto">
              <img
                src={logoSrc}
                alt={logoAlt}
                className="h-72 w-auto mx-auto object-contain"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!isMotoristaRoute && img.src.includes('-white')) {
                    img.src = "/images/logo-decada-ousada.png";
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              {headerIcon}
              <CardTitle className="text-2xl font-bold text-card-foreground">
                {title}
              </CardTitle>
            </div>

            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {children}

            {footer ? (
              <div className="mt-6 border-t border-border/80 pt-6 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
