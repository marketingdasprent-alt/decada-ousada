import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const currentFetchId = ++fetchIdRef.current;

    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // CRÍTICO: Setar loading: true imediatamente quando user existe
      setLoading(true);

      try {
        // Using any type to handle the current type issues
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        // Verificar se este fetch ainda é o mais recente
        if (currentFetchId !== fetchIdRef.current) return;

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin || false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (currentFetchId !== fetchIdRef.current) return;
        setIsAdmin(false);
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};
