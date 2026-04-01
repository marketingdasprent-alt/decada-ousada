import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Cargo {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Recurso {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
}

export interface CargoPermissao {
  id: string;
  cargo_id: string;
  recurso_id: string;
  tem_acesso: boolean;
  cargo?: Cargo;
  recurso?: Recurso;
}

export const useRBAC = () => {
  const { user } = useAuth();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [permissoes, setPermissoes] = useState<CargoPermissao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRBACData();
  }, []);

  const fetchRBACData = async () => {
    try {
      setLoading(true);

      const [cargosRes, recursosRes, permissoesRes] = await Promise.all([
        supabase.from('cargos').select('*').order('nome', { ascending: true }),
        supabase.from('recursos').select('*').order('categoria, nome'),
        supabase.from('cargo_permissoes').select(`
          *,
          cargo:cargos(*),
          recurso:recursos(*)
        `),
      ]);

      if (cargosRes.error) throw cargosRes.error;
      if (recursosRes.error) throw recursosRes.error;
      if (permissoesRes.error) throw permissoesRes.error;

      setCargos(cargosRes.data || []);
      setRecursos(recursosRes.data || []);
      setPermissoes(permissoesRes.data || []);
    } catch (error) {
      console.error('Error fetching RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePermissao = async (
    cargoId: string,
    recursoId: string,
    temAcesso: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('cargo_permissoes')
        .upsert({
          cargo_id: cargoId,
          recurso_id: recursoId,
          tem_acesso: temAcesso,
        });

      if (error) throw error;

      await fetchRBACData();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating permission:', error);
      return { success: false, error: error.message };
    }
  };

  const getPermissaoForCargoRecurso = (cargoId: string, recursoId: string): CargoPermissao | null => {
    return permissoes.find(p => p.cargo_id === cargoId && p.recurso_id === recursoId) || null;
  };

  return {
    cargos,
    recursos,
    permissoes,
    loading,
    updatePermissao,
    getPermissaoForCargoRecurso,
    refresh: fetchRBACData,
  };
};
