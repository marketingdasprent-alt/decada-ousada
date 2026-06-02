import { supabase } from '@/integrations/supabase/client';
import type { EmpresaConfig } from '@/config/empresas';

import { generateDocumentFromTemplate } from './generateDocumentFromTemplate';

import type { Motorista } from '@/types/motorista';
import type { ViaturaBasic } from '@/hooks/useViaturas';

export interface GenerateContratoPrestacaoPdfParams {
  motorista: Motorista;
  /** Viatura do motorista (carro slot). */
  viatura?: ViaturaBasic | null;
  /** Valor semanal cobrado pelo slot (por carro). */
  valorSemanal: number | null;
  /** Data de início do slot (ISO ou yyyy-mm-dd). */
  dataInicio: string | null;
  /** Número/código do contrato de prestação (se já gravado). */
  numeroContrato?: number | null;
  empresa: EmpresaConfig | null;
  action?: 'print' | 'download';
}

/**
 * Gera o PDF do Contrato de Prestação de Serviços (regime slot) a partir
 * do template `contrato_prestacao` da empresa. Reusa o motor genérico
 * `generateDocumentFromTemplate` — os placeholders {{motorista_*}} são
 * preenchidos com os dados do motorista, e {{valor_semanal}} com o slot.
 */
export const generateContratoPrestacaoPdf = async ({
  motorista,
  viatura,
  valorSemanal,
  dataInicio,
  numeroContrato,
  empresa,
  action = 'print',
}: GenerateContratoPrestacaoPdfParams): Promise<void> => {
  if (!empresa) {
    throw new Error('Empresa não definida — impossível gerar o contrato de prestação.');
  }

  // 1) Template de prestação para esta empresa.
  const { data: templates, error: templatesErr } = await supabase
    .from('document_templates')
    .select('id, nome, tipo, empresa_id')
    .eq('ativo', true)
    .eq('empresa_id', empresa.id)
    .eq('tipo', 'contrato_prestacao')
    .order('versao', { ascending: false });

  if (templatesErr) throw templatesErr;

  const template = (templates ?? [])[0];
  if (!template) {
    throw new Error(
      `Sem template de prestação activo para a empresa "${empresa.nome}". ` +
        `Cria um "Contrato Prestação - ${empresa.nome}" em Configurações do Sistema → Documentos.`
    );
  }

  // 2) Dados do motorista (placeholders {{motorista_*}}, {{carta_*}}).
  const motoristaData: Record<string, unknown> = {
    nome: motorista.nome,
    nif: motorista.nif ?? '',
    documento_tipo: motorista.documento_tipo ?? '',
    documento_numero: motorista.documento_numero ?? '',
    documento_validade: motorista.documento_validade ?? '',
    carta_conducao: motorista.carta_conducao ?? '',
    carta_categorias: motorista.carta_categorias?.join(', ') ?? '',
    carta_validade: motorista.carta_validade ?? '',
    morada: motorista.morada ?? '',
    email: motorista.email ?? '',
    telefone: motorista.telefone ?? '',
    cidade: motorista.cidade ?? '',
  };

  // 3) Dados do contrato (slot).
  const today = new Date().toISOString().split('T')[0];
  const eur = (n: number | null | undefined) =>
    n != null && !Number.isNaN(Number(n)) ? `${Number(n).toFixed(2)} €` : '—';

  const documentData = {
    data_inicio: dataInicio ?? today,
    data_assinatura: today,
    cidade_assinatura: empresa.sede || (motoristaData.cidade as string) || 'Leiria',
    numero_contrato: numeroContrato != null ? String(numeroContrato) : '',
    viatura_matricula: viatura?.matricula ?? '—',
    viatura_marca_modelo: viatura ? `${viatura.marca} ${viatura.modelo}`.trim() : '—',
    valor_semanal: eur(valorSemanal),
    empresaData: {
      nomeCompleto: empresa.nomeCompleto,
      nif: empresa.nif,
      sede: empresa.sede,
      licencaTVDE: empresa.licencaTVDE,
      licencaValidade: empresa.licencaValidade,
      representante: empresa.representante,
      cargoRepresentante: empresa.cargoRepresentante,
    },
  };

  await generateDocumentFromTemplate({
    templateId: template.id,
    motoristaData,
    documentData,
    action,
    headerLogoUrl: '/Logo.png',
  });
};
