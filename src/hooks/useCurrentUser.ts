import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  nome: string;
  is_admin: boolean;
  cargo?: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !authUser) {
          console.error('Erro ao obter usuário atual:', userError);
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nome, is_admin, cargo')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile?.nome) {
          console.error('Erro ao obter perfil do usuário:', profileError);
          setUser(null);
        } else {
          setUser(profile);
        }
      } catch (error) {
        console.error('Erro ao buscar usuário atual:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return { user, loading };
};