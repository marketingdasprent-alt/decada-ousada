import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FormularioTagsMap {
  [formularioId: string]: string[];
}

export const useFormularioTags = () => {
  const [tagsMap, setTagsMap] = useState<FormularioTagsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        setLoading(true);
        console.log('🏷️ Buscando todas as tags de formulários...');
        
        const { data, error } = await supabase
          .from('formulario_campanhas')
          .select('formulario_id, campanha_tag');

        if (error) throw error;

        // Agrupar tags por formulario_id
        const grouped: FormularioTagsMap = {};
        data?.forEach((item) => {
          if (!grouped[item.formulario_id]) {
            grouped[item.formulario_id] = [];
          }
          grouped[item.formulario_id].push(item.campanha_tag);
        });

        console.log(`✅ Tags carregadas para ${Object.keys(grouped).length} formulários`);
        setTagsMap(grouped);
      } catch (error) {
        console.error('❌ Erro ao buscar tags de formulários:', error);
        setTagsMap({});
      } finally {
        setLoading(false);
      }
    };

    fetchAllTags();
  }, []);

  const getTagsForFormulario = (formularioId?: string): string[] => {
    if (!formularioId) return [];
    return tagsMap[formularioId] || [];
  };

  return {
    tagsMap,
    loading,
    getTagsForFormulario
  };
};
