
import { supabase } from '@/integrations/supabase/client';

export const promoteUserToAdmin = async (email: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('promote-admin', {
      body: { email }
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error promoting user:', error);
    throw new Error(error.message || 'Erro ao promover usuário');
  }
};
