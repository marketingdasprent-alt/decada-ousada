import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'gestor_tvde' | 'gestor_comercial' | 'colaborador';

interface PermissionsState {
  isAdmin: boolean;
  /** Recursos com tem_acesso = true (ver ou editar) */
  recursos: string[];
  /** Recursos com pode_editar = true (só disponível após migração) */
  recursosEditaveis: string[];
  cargo: string | null;
  cargo_id: string | null;
  loading: boolean;
  initialized: boolean;
}

interface PermissionsContextType extends PermissionsState {
  hasAccessToResource: (recurso: string) => boolean;
  canEdit: (recurso: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const fetchIdRef = useRef(0);

  const [state, setState] = useState<PermissionsState>({
    isAdmin: false,
    recursos: [],
    recursosEditaveis: [],
    cargo: null,
    cargo_id: null,
    loading: true,
    initialized: false,
  });

  const fetchPermissions = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    if (authLoading) return;

    if (!user) {
      setState({
        isAdmin: false,
        recursos: [],
        recursosEditaveis: [],
        cargo: null,
        cargo_id: null,
        loading: false,
        initialized: true,
      });
      return;
    }

    if (!state.initialized) {
      setState(prev => ({ ...prev, loading: true }));
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, cargo_id, cargo')
        .eq('id', user.id)
        .single();

      if (profileError || currentFetchId !== fetchIdRef.current) {
        if (currentFetchId === fetchIdRef.current) {
          setState({ isAdmin: false, recursos: [], recursosEditaveis: [], cargo: null, cargo_id: null, loading: false, initialized: true });
        }
        return;
      }

      // Admins têm tudo
      if (profile?.is_admin) {
        setState({ isAdmin: true, cargo: profile?.cargo || null, cargo_id: profile?.cargo_id || null, recursos: [], recursosEditaveis: [], loading: false, initialized: true });
        return;
      }

      if (!profile?.cargo_id) {
        setState({ isAdmin: false, cargo: profile?.cargo || null, cargo_id: null, recursos: [], recursosEditaveis: [], loading: false, initialized: true });
        return;
      }

      // ── Buscar permissões — APENAS tem_acesso para compatibilidade com DB sem pode_editar ──
      const { data: permissoesList, error: permissoesError } = await supabase
        .from('cargo_permissoes')
        .select('recurso_id, tem_acesso')
        .eq('cargo_id', profile.cargo_id)
        .eq('tem_acesso', true);

      if (permissoesError || currentFetchId !== fetchIdRef.current) {
        if (currentFetchId === fetchIdRef.current) {
          setState({ isAdmin: false, cargo: profile?.cargo || null, cargo_id: profile.cargo_id, recursos: [], recursosEditaveis: [], loading: false, initialized: true });
        }
        return;
      }

      if (!permissoesList || permissoesList.length === 0) {
        setState({ isAdmin: false, cargo: profile?.cargo || null, cargo_id: profile.cargo_id, recursos: [], recursosEditaveis: [], loading: false, initialized: true });
        return;
      }

      const allRecursoIds = permissoesList.map(p => p.recurso_id);

      // ── Buscar nomes de todos os recursos com acesso ──
      const { data: recursosList, error: recursosError } = await supabase
        .from('recursos')
        .select('id, nome')
        .in('id', allRecursoIds);

      if (currentFetchId !== fetchIdRef.current) return;

      const allNomes = recursosError ? [] : (recursosList?.map(r => r.nome) || []);

      // ── Tentar buscar pode_editar (falha silenciosa se a coluna não existir) ──
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
        // pode_editar ainda não existe na DB — ok, editNomes fica []
      }

      setState({
        isAdmin: false,
        cargo: profile?.cargo || null,
        cargo_id: profile.cargo_id,
        recursos: allNomes,
        recursosEditaveis: editNomes,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      console.error('[PermissionsContext] Erro:', error);
      if (currentFetchId === fetchIdRef.current) {
        setState({ isAdmin: false, recursos: [], recursosEditaveis: [], cargo: null, cargo_id: null, loading: false, initialized: true });
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
    // Se recursosEditaveis está vazio (coluna não existe), fallback para tem_acesso
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
