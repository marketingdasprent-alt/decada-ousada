import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { computeDefaultRoute } from '@/hooks/useDefaultRoute';
import { getUnauthenticatedRoute } from '@/lib/native';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredResource?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requiredResource,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, hasAccessToResource, loading: permissionsLoading, cargo_id, recursos } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const unauthenticatedRoute = getUnauthenticatedRoute();

  const loading = authLoading || permissionsLoading;

  const defaultRoute = useMemo(() => {
    if (loading || !user) {
      return null;
    }

    return computeDefaultRoute(isAdmin, cargo_id, recursos, hasAccessToResource);
  }, [isAdmin, cargo_id, recursos, hasAccessToResource, loading, user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate(unauthenticatedRoute, { replace: true });
    }
  }, [user, loading, navigate, unauthenticatedRoute]);

  useEffect(() => {
    if (loading || !user || !defaultRoute) return;

    if (location.pathname === '/my-account' && defaultRoute !== '/my-account') {
      navigate(defaultRoute, { replace: true });
    }
  }, [loading, user, defaultRoute, location.pathname, navigate]);

  useEffect(() => {
    if (loading || !user || !requiredResource) return;

    const hasAccess = isAdmin || hasAccessToResource(requiredResource);

    if (!hasAccess && defaultRoute && defaultRoute !== location.pathname) {
      navigate(defaultRoute, { replace: true });
    }
  }, [user, loading, requiredResource, isAdmin, hasAccessToResource, navigate, defaultRoute, location.pathname]);

  if (loading) {
    return (
      <div className="auth-screen auth-screen-safe">
        <div className="auth-screen__background" aria-hidden="true" />
        <div className="auth-screen__pattern" aria-hidden="true" />
        <div className="relative z-10 text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="auth-screen auth-screen-safe">
        <div className="auth-screen__background" aria-hidden="true" />
        <div className="auth-screen__pattern" aria-hidden="true" />
        <div className="relative z-10 max-w-md text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-2 text-xl font-bold text-foreground">Acesso restrito</h2>
          <p className="mb-4 text-muted-foreground">
            Precisa de permissões de administrador para aceder a esta página.
          </p>
          <Button onClick={() => defaultRoute && navigate(defaultRoute)} className="auth-primary-button">
            Voltar ao painel
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
