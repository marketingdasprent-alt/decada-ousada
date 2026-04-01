import { useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { RECURSOS } from '@/utils/permissions';

// IDs dos cargos (obtidos da tabela cargos)
const CARGO_IDS = {
  GESTOR_TVDE: 'fd39a12b-86c9-43c0-8ae3-d7b4e090e0a2',
  GESTOR_DOCUMENTAL: 'b128ef5c-49a2-4178-9e65-32c1c04a62b5',
  ADMINISTRADOR: '24beec8b-ac18-4ba7-a878-fcd1ed16e673',
} as const;

// Mapa de prioridade: ordem em que tentamos redirecionar
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

// Mapa de cargo_id para rota padrão
const CARGO_DEFAULT_ROUTES: Record<string, string> = {
  [CARGO_IDS.GESTOR_TVDE]: '/crm',
  [CARGO_IDS.GESTOR_DOCUMENTAL]: '/motoristas',
  [CARGO_IDS.ADMINISTRADOR]: '/crm',
};

/**
 * Função pura para calcular a rota padrão baseada nas permissões
 * Pode ser usada diretamente quando já temos os dados do usePermissions
 */
export const computeDefaultRoute = (
  isAdmin: boolean,
  cargo_id: string | null,
  recursos: string[],
  hasAccessToResource: (recurso: string) => boolean
): string => {
  console.log('🔍 [computeDefaultRoute] Calculando rota - Estado:', {
    isAdmin,
    cargo_id,
    recursos: recursos.length,
    recursosNomes: recursos
  });

  // Admin sempre pode ir para CRM
  if (isAdmin) {
    console.log('🔧 [computeDefaultRoute] Admin detectado → /crm');
    return '/crm';
  }

  // Se tem cargo_id definido, usar rota específica do cargo
  if (cargo_id && CARGO_DEFAULT_ROUTES[cargo_id]) {
    console.log(`🎯 [computeDefaultRoute] Cargo ID ${cargo_id} → ${CARGO_DEFAULT_ROUTES[cargo_id]}`);
    return CARGO_DEFAULT_ROUTES[cargo_id];
  }

  // Fallback: Encontrar primeira rota com acesso baseado em permissões
  for (const route of ROUTE_PRIORITY) {
    if (hasAccessToResource(route.recurso)) {
      console.log(`📍 [computeDefaultRoute] Permissão ${route.recurso} → ${route.path}`);
      return route.path;
    }
  }

  // Se não tem acesso a nada, ir para página de conta
  console.log('⚠️ [computeDefaultRoute] Sem permissões (cargo_id:', cargo_id, 'recursos:', recursos, ') → /my-account');
  return '/my-account';
};

export const useDefaultRoute = () => {
  const { loading: authLoading, user } = useAuth();
  const { hasAccessToResource, isAdmin, loading: permissionsLoading, cargo_id, recursos } = usePermissions();

  // CRÍTICO: Considerar AMBOS os loadings
  const loading = authLoading || permissionsLoading;

  const defaultRoute = useMemo(() => {
    // CRÍTICO: Se auth ou permissões ainda carregando, NÃO calcular rota
    if (authLoading || permissionsLoading) {
      console.log('⏳ [useDefaultRoute] Ainda carregando - authLoading:', authLoading, 'permissionsLoading:', permissionsLoading);
      return null;
    }

    // CRÍTICO: Se não tem user após auth carregar, retornar null (não logado)
    if (!user) {
      console.log('⏳ [useDefaultRoute] Sem user após auth carregar - retornando null');
      return null;
    }

    return computeDefaultRoute(isAdmin, cargo_id, recursos, hasAccessToResource);
  }, [hasAccessToResource, isAdmin, authLoading, permissionsLoading, cargo_id, recursos, user]);

  return { defaultRoute, loading };
};
