import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'gestor_tvde' | 'gestor_comercial' | 'colaborador';

interface PermissionsState {
  isAdmin: boolean;
  recursos: string[];
  cargo: string | null;
  cargo_id: string | null;
  loading: boolean;
  initialized: boolean;
}

interface PermissionsContextType extends PermissionsState {
  hasAccessToResource: (recurso: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const fetchIdRef = useRef(0);
  
  const [state, setState] = useState<PermissionsState>({
    isAdmin: false,
    recursos: [],
    cargo: null,
    cargo_id: null,
    loading: true,
    initialized: false,
  });

  const fetchPermissions = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    
    // Se auth ainda está carregando, manter loading
    if (authLoading) {
      return;
    }
    
    // Sem usuário = reset
    if (!user) {
      setState({
        isAdmin: false,
        recursos: [],
        cargo: null,
        cargo_id: null,
        loading: false,
        initialized: true,
      });
      return;
    }

    // Só setar loading se ainda não inicializou (primeira vez)
    if (!state.initialized) {
      setState(prev => ({ ...prev, loading: true }));
    }

    try {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, cargo_id, cargo')
        .eq('id', user.id)
        .single();

      if (profileError || currentFetchId !== fetchIdRef.current) {
        if (currentFetchId === fetchIdRef.current) {
          setState({
            isAdmin: false,
            recursos: [],
            cargo: null,
            cargo_id: null,
            loading: false,
            initialized: true,
          });
        }
        return;
      }

      // Se é admin, tem acesso a tudo
      if (profile?.is_admin) {
        setState({
          isAdmin: true,
          cargo: profile?.cargo || null,
          cargo_id: profile?.cargo_id || null,
          recursos: [],
          loading: false,
          initialized: true,
        });
        return;
      }

      // Se não tem cargo_id, não tem permissões
      if (!profile?.cargo_id) {
        setState({
          isAdmin: false,
          cargo: profile?.cargo || null,
          cargo_id: null,
          recursos: [],
          loading: false,
          initialized: true,
        });
        return;
      }

      // Buscar permissões do cargo
      const { data: permissoesList, error: permissoesError } = await supabase
        .from('cargo_permissoes')
        .select('recurso_id')
        .eq('cargo_id', profile.cargo_id)
        .eq('tem_acesso', true);

      if (permissoesError || currentFetchId !== fetchIdRef.current) {
        if (currentFetchId === fetchIdRef.current) {
          setState({
            isAdmin: false,
            cargo: profile?.cargo || null,
            cargo_id: profile.cargo_id,
            recursos: [],
            loading: false,
            initialized: true,
          });
        }
        return;
      }

      if (!permissoesList || permissoesList.length === 0) {
        setState({
          isAdmin: false,
          cargo: profile?.cargo || null,
          cargo_id: profile.cargo_id,
          recursos: [],
          loading: false,
          initialized: true,
        });
        return;
      }

      // Buscar nomes dos recursos
      const recursoIds = permissoesList.map(p => p.recurso_id);
      const { data: recursosList, error: recursosError } = await supabase
        .from('recursos')
        .select('id, nome')
        .in('id', recursoIds);

      if (currentFetchId !== fetchIdRef.current) return;

      const recursosAcessiveis = recursosError ? [] : (recursosList?.map(r => r.nome) || []);
      
      setState({
        isAdmin: false,
        cargo: profile?.cargo || null,
        cargo_id: profile.cargo_id,
        recursos: recursosAcessiveis,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      console.error('[PermissionsContext] Erro:', error);
      if (currentFetchId === fetchIdRef.current) {
        setState({
          isAdmin: false,
          recursos: [],
          cargo: null,
          cargo_id: null,
          loading: false,
          initialized: true,
        });
      }
    }
  }, [user, authLoading, state.initialized]);

  useEffect(() => {
    fetchPermissions();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAccessToResource = useCallback((recurso: string): boolean => {
    if (state.isAdmin) return true;
    return state.recursos.includes(recurso);
  }, [state.isAdmin, state.recursos]);

  const value: PermissionsContextType = {
    ...state,
    hasAccessToResource,
    refreshPermissions: fetchPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissionsContext = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
};
