import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUPERVISOR_GESTOR_TVDE_CARGO_ID = '0cf27801-80ff-4480-857e-e90bfb75d5a6';

export function useCanEditFinanceiro() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['can-edit-financeiro', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, cargo_id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      return data.is_admin === true || data.cargo_id === SUPERVISOR_GESTOR_TVDE_CARGO_ID;
    },
    enabled: !!user?.id,
  });

  return { canEdit: data ?? false, isLoading };
}
