import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'gestor_tvde' | 'gestor_comercial' | 'colaborador';

const CARGO_MOTORISTA_ID = 'a0000000-0000-0000-0000-000000000001';

interface PermissionsState {
  isAdmin: boolean;
  recursos: string[];
  recursosEditaveis: string[];
  cargo: string | null;
  cargo_id: string | null;
  tipoUtilizador: 'motorista' | 'colaborador';
  loading: boolean;
  initialized: boolean;
}

interface PermissionsContextType extends PermissionsState {
  hasAccessToResource: (recurso: string) => boolean;
  canEdit: (recurso: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const DEFAULT_STATE: PermissionsState = {
  isAdmin: false,
  recursos: [],
  recursosEditaveis: [],
  cargo: null,
  cargo_id: null,
  tipoUtilizador: 'colaborador',
  loading: true,
  initialized: false,
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const fetchIdRef = useRef(0);

  const [state, setState] = useState<PermissionsState>(DEFAULT_STATE);

  const fetchPermissions = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    if (authLoading) return;

    if (!user) {
      setState({ ...DEFAULT_STATE, loading: false, initialized: true });
      return;
    }

    if (!state.initialized) {
      setState(prev => ({ ...prev, loading: true }));
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, cargo_id, cargo, tipo_utilizador')
        .eq('id', user.id)
        .single();

      if (profileError || currentFetchId !== fetchIdRef.current) {
        if (currentFetchId === fetchIdRef.current) {
          setState({ ...DEFAULT_STATE, loading: false, initialized: true });
        }
        return;
      }

      const tipoUtilizador: 'motorista' | 'colaborador' =
        (profile?.tipo_utilizador as 'motorista' | 'colaborador') ||
        (profile?.cargo_id === CARGO_MOTORISTA_ID ? 'motorista' : 'colaborador');

      // Admins têm tudo
      if (profile?.is_admin) {
        setState({
          isAdmin: true,
          cargo: profile.cargo || null,
          cargo_id: profile.cargo_id || null,
          tipoUtilizador,
          recursos: [],
          recursosEditaveis: [],
          loading: false,
          initialized: true,
        });
        return;
      }

      if (!profile?.cargo_id) {
        setState({
          ...DEFAULT_STATE,
          cargo: profile?.cargo || null,
          tipoUtilizador,
          loading: false,
          initialized: true,
        });
        return;
      }

      const { data: permissoesList, error: permissoesError } = await supabase
        .from('cargo_permissoes')
        .select('recurso_id, tem_acesso')
        .eq('cargo_id', profile.cargo_id)
        .eq('tem_acesso', true);

      if (permissoesError || currentFetchId !== fetchIdRef.current) {
        if (currentFetchId === fetchIdRef.current) {
          setState({
            ...DEFAULT_STATE,
            cargo: profile.cargo || null,
            cargo_id: profile.cargo_id,
            tipoUtilizador,
            loading: false,
            initialized: true,
          });
        }
        return;
      }

      if (!permissoesList || permissoesList.length === 0) {
        setState({
          ...DEFAULT_STATE,
          cargo: profile.cargo || null,
          cargo_id: profile.cargo_id,
          tipoUtilizador,
          loading: false,
          initialized: true,
        });
        return;
      }

      const allRecursoIds = permissoesList.map(p => p.recurso_id);

      const { data: recursosList, error: recursosError } = await supabase
        .from('recursos')
        .select('id, nome')
        .in('id', allRecursoIds);

      if (currentFetchId !== fetchIdRef.current) return;

      const allNomes = recursosError ? [] : (recursosList?.map(r => r.nome) || []);

      let editNomes: string[] = [];
      try {
        const { data: editData } = await supabase
          .from('cargo_permissoes')
          .select('recurso_id, pode_editar')
          .eq('cargo_id', profile.cargo_id)
          .eq('tem_acesso', true)
          .eq('pode_editar', true);

        if (editData && editData.length > 0 && currentFetchId === fetchIdRef.current) {
          const editIds = editData.map((p: any) => p.recurso_id);
          editNomes = (recursosList || [])
            .filter(r => editIds.includes(r.id))
            .map(r => r.nome);
        }
      } catch {
        // pode_editar ainda não existe na DB
      }

      setState({
        isAdmin: false,
        cargo: profile.cargo || null,
        cargo_id: profile.cargo_id,
        tipoUtilizador,
        recursos: allNomes,
        recursosEditaveis: editNomes,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      console.error('[PermissionsContext] Erro:', error);
      if (currentFetchId === fetchIdRef.current) {
        setState({ ...DEFAULT_STATE, loading: false, initialized: true });
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

  const canEdit = useCallback((recurso: string): boolean => {
    if (state.isAdmin) return true;
    if (state.recursosEditaveis.length === 0 && state.recursos.includes(recurso)) return true;
    return state.recursosEditaveis.includes(recurso);
  }, [state.isAdmin, state.recursos, state.recursosEditaveis]);

  return (
    <PermissionsContext.Provider value={{ ...state, hasAccessToResource, canEdit, refreshPermissions: fetchPermissions }}>
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
