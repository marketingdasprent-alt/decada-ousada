
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCampaignTags = () => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailableTags = async () => {
    try {
      setLoading(true);
      console.log('🔍 Buscando tags de campanha...');
      
      const { data, error } = await (supabase as any)
        .from('leads_dasprent')
        .select('campaign_tags')
        .not('campaign_tags', 'is', null);

      if (error) throw error;

      console.log('📊 Dados de leads recebidos:', data?.length, 'leads');

      // Extract all unique tags from all leads
      const allTags = new Set<string>();
      data?.forEach((lead: any) => {
        if (lead.campaign_tags && Array.isArray(lead.campaign_tags)) {
          lead.campaign_tags.forEach((tag: string) => allTags.add(tag));
        }
      });

      const sortedTags = Array.from(allTags).sort();
      console.log('✅ Tags encontradas:', sortedTags);
      setAvailableTags(sortedTags);
    } catch (error) {
      console.error('Error fetching campaign tags:', error);
      setAvailableTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const refreshTags = () => {
    fetchAvailableTags();
  };

  return {
    availableTags,
    loading,
    refreshTags
  };
};
