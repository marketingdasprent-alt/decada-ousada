import { useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { RECURSOS } from '@/utils/permissions';

const CARGO_IDS = {
  GESTOR_TVDE: 'fd39a12b-86c9-43c0-8ae3-d7b4e090e0a2',
  GESTOR_DOCUMENTAL: 'b128ef5c-49a2-4178-9e65-32c1c04a62b5',
  ADMINISTRADOR: '24beec8b-ac18-4ba7-a878-fcd1ed16e673',
} as const;

const ROUTE_PRIORITY = [
  { path: '/motoristas', recurso: RECURSOS.MOTORISTAS_GESTAO },
  { path: '/crm', recurso: RECURSOS.MOTORISTAS_CRM },
  { path: '/contatos', recurso: RECURSOS.MOTORISTAS_CONTACTOS },
  { path: '/contratos', recurso: RECURSOS.MOTORISTAS_CONTRATOS },
  { path: '/viaturas', recurso: RECURSOS.VIATURAS_VER },
  { path: '/assistencia', recurso: RECURSOS.ASSISTENCIA_TICKETS },
  { path: '/motorista/painel', recurso: RECURSOS.MOTORISTA_PAINEL },
  { path: '/admin/documentos', recurso: RECURSOS.ADMIN_DOCUMENTOS },
  { path: '/formularios', recurso: RECURSOS.ADMIN_FORMULARIOS },
  { path: '/admin/invites', recurso: RECURSOS.ADMIN_UTILIZADORES },
  { path: '/admin/settings', recurso: RECURSOS.ADMIN_CONFIGURACOES },
];

const CARGO_DEFAULT_ROUTES: Record<string, string> = {
  [CARGO_IDS.GESTOR_TVDE]: '/crm',
  [CARGO_IDS.GESTOR_DOCUMENTAL]: '/motoristas',
  [CARGO_IDS.ADMINISTRADOR]: '/crm',
};

export const computeDefaultRoute = (
  isAdmin: boolean,
  cargo_id: string | null,
  _recursos: string[],
  hasAccessToResource: (recurso: string) => boolean,
  tipoUtilizador: 'motorista' | 'colaborador' = 'colaborador'
): string => {
  // Motoristas vão sempre para o painel de motorista
  if (tipoUtilizador === 'motorista') {
    return '/motorista/painel';
  }

  if (isAdmin) return '/crm';

  if (cargo_id && CARGO_DEFAULT_ROUTES[cargo_id]) {
    return CARGO_DEFAULT_ROUTES[cargo_id];
  }

  for (const route of ROUTE_PRIORITY) {
    if (hasAccessToResource(route.recurso)) {
      return route.path;
    }
  }

  return '/my-account';
};

export const useDefaultRoute = () => {
  const { loading: authLoading, user } = useAuth();
  const { hasAccessToResource, isAdmin, loading: permissionsLoading, cargo_id, recursos, tipoUtilizador } = usePermissions();

  const loading = authLoading || permissionsLoading;

  const defaultRoute = useMemo(() => {
    if (authLoading || permissionsLoading) return null;
    if (!user) return null;
    return computeDefaultRoute(isAdmin, cargo_id, recursos, hasAccessToResource, tipoUtilizador);
  }, [hasAccessToResource, isAdmin, authLoading, permissionsLoading, cargo_id, recursos, tipoUtilizador, user]);

  return { defaultRoute, loading };
};
