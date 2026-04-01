import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExistingDocument {
  templateId: string;
  contratoId: string;
  documentoUrl: string | null;
  versao: number;
  status: string;
}

export const useMotoristaDocuments = (motoristaId: string | null) => {
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (motoristaId) {
      loadDocuments();
    } else {
      setExistingDocuments([]);
    }
  }, [motoristaId]);

  const loadDocuments = async () => {
    if (!motoristaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contratos')
        .select('id, template_id, documento_url, versao, status')
        .eq('motorista_id', motoristaId)
        .neq('status', 'substituido')
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const docs = (data || []).map(d => ({
        templateId: d.template_id || '',
        contratoId: d.id,
        documentoUrl: d.documento_url,
        versao: d.versao || 1,
        status: d.status || 'ativo',
      }));

      setExistingDocuments(docs);
    } catch (error) {
      console.error('Erro ao carregar documentos do motorista:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasExistingDocument = (templateId: string): ExistingDocument | null => {
    return existingDocuments.find(d => d.templateId === templateId) || null;
  };

  const downloadDocument = async (documentoUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .download(documentoUrl);

      if (error) throw error;

      // Create blob URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentoUrl.split('/').pop() || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download do documento:', error);
      throw error;
    }
  };

  return {
    existingDocuments,
    loading,
    hasExistingDocument,
    downloadDocument,
    refresh: loadDocuments,
  };
};
