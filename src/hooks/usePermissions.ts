import { usePermissionsContext, AppRole } from '@/contexts/PermissionsContext';

export type { AppRole };
export type Action = 'ver' | 'criar' | 'editar' | 'deletar';

interface UsePermissionsReturn {
  hasRole: (role: AppRole) => boolean;
  hasPermission: (resource: string, action?: Action) => boolean;
  hasAccessToResource: (recurso: string) => boolean;
  isAdmin: boolean;
  loading: boolean;
  roles: AppRole[];
  recursos: string[];
  cargo: string | null;
  cargo_id: string | null;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { isAdmin, recursos, cargo, cargo_id, loading, hasAccessToResource } = usePermissionsContext();

  const hasRole = (role: AppRole): boolean => {
    if (role === 'admin') return isAdmin;
    return false;
  };

  const hasPermission = (resource: string, action?: Action): boolean => {
    if (isAdmin) return true;
    return recursos.includes(resource);
  };

  return {
    hasRole,
    hasPermission,
    hasAccessToResource,
    isAdmin,
    loading,
    roles: isAdmin ? ['admin'] : [],
    recursos,
    cargo,
    cargo_id,
  };
};
