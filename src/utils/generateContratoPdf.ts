import { supabase } from '@/integrations/supabase/client';
import type { EmpresaConfig } from '@/config/empresas';

import { generateDocumentFromTemplate } from './generateDocumentFromTemplate';

import type { ContratoRenting } from '@/types/contratoRenting';
import type { ClienteComDocumentos } from '@/types/cliente';
import type { Motorista } from '@/types/motorista';

export interface CondutorPrincipal {
  cliente_id: string | null;
  motorista_id: string | null;
}

export interface GenerateContratoPdfParams {
  contrato: ContratoRenting;
  /** Condutor principal — usado para preencher o "PRIMEIRO OUTORGANTE" no template. */
  condutorPrincipal: CondutorPrincipal | null;
  clientes: ClienteComDocumentos[];
  motoristas: Motorista[];
  /** Empresa actual — fornece dados para os placeholders {{empresa_*}}. */
  empresa: EmpresaConfig | null;
  action?: 'print' | 'download';
}

/**
 * Mapeia os dados do contrato + condutor principal para o formato
 * esperado por `generateDocumentFromTemplate`, que usa placeholders
 * centrados no motorista TVDE. Em rent-a-car, o cliente toma o lugar
 * do motorista no template.
 */
export const generateContratoPdf = async ({
  contrato,
  condutorPrincipal,
  clientes,
  motoristas,
  empresa,
  action = 'print',
}: GenerateContratoPdfParams): Promise<void> => {
  if (!empresa) {
    throw new Error('Empresa não definida — impossível gerar contrato.');
  }

  // 1) Encontrar template de contrato para esta empresa.
  //    HACK pragmático: o tipo `contrato_tvde` é usado de forma demasiado
  //    abrangente (Iban, Procedimentos, etc.) — filtramos por prefixo do
  //    nome até refactor da taxonomia de templates. Convenção actual:
  //    "Contrato TVDE - <Empresa>" tanto para TVDE como rent-a-car.
  const { data: templates, error: templatesErr } = await supabase
    .from('document_templates')
    .select('id, nome, tipo, empresa_id')
    .eq('ativo', true)
    .eq('empresa_id', empresa.id)
    .in('tipo', ['contrato_tvde', 'contrato'])
    .ilike('nome', 'Contrato TVDE%')
    .order('nome', { ascending: true });

  if (templatesErr) throw templatesErr;
  if (!templates || templates.length === 0) {
    throw new Error(
      `Sem template de contrato activo para a empresa "${empresa.nome}". ` +
        'Cria um chamado "Contrato TVDE - ' +
        empresa.nome +
        '" em Configurações do Sistema → Templates.'
    );
  }
  const template = templates[0];

  // 2) Resolver o condutor principal para preencher o "motorista" no template.
  //    TVDE: motorista directo. Rent-a-car: cliente mapeado para motorista_*.
  const cli = condutorPrincipal?.cliente_id
    ? (clientes.find((c) => c.id === condutorPrincipal.cliente_id) ?? null)
    : null;
  const mo = condutorPrincipal?.motorista_id
    ? (motoristas.find((m) => m.id === condutorPrincipal.motorista_id) ?? null)
    : null;

  const motoristaData: Record<string, unknown> = mo
    ? {
        nome: mo.nome,
        nif: mo.nif ?? '',
        documento_tipo: mo.documento_tipo ?? '',
        documento_numero: mo.documento_numero ?? '',
        documento_validade: mo.documento_validade ?? '',
        carta_conducao: mo.carta_conducao ?? '',
        carta_categorias: mo.carta_categorias?.join(', ') ?? '',
        carta_validade: mo.carta_validade ?? '',
        licenca_tvde_numero: mo.licenca_tvde_numero ?? '',
        licenca_tvde_validade: mo.licenca_tvde_validade ?? '',
        morada: mo.morada ?? '',
        email: mo.email ?? '',
        telefone: mo.telefone ?? '',
        cidade: mo.cidade ?? '',
      }
    : cli
      ? {
          nome: cli.nome,
          nif: cli.nif ?? '',
          documento_tipo: cli.documentoIdentificacao?.tipo ?? '',
          documento_numero: cli.documentoIdentificacao?.numero ?? '',
          documento_validade: cli.documentoIdentificacao?.validade ?? '',
          carta_conducao: cli.cartaConducao?.numero ?? '',
          carta_categorias: '',
          carta_validade: cli.cartaConducao?.validade ?? '',
          licenca_tvde_numero: '',
          licenca_tvde_validade: '',
          morada: cli.morada ?? '',
          email: cli.email ?? '',
          telefone: cli.telefone ?? '',
          cidade: cli.cidade ?? '',
        }
      : { nome: '—', nif: '', morada: '', email: '', telefone: '' };

  // 3) Duração em meses (placeholder {{duracao_meses}}). Arredonda para cima.
  const msDia = 86400000;
  const diasContrato = Math.max(
    1,
    Math.ceil(
      (new Date(contrato.data_fim).getTime() - new Date(contrato.data_inicio).getTime()) / msDia
    )
  );
  const duracaoMeses = Math.max(1, Math.round(diasContrato / 30));

  // 4) Dados do contrato (placeholders {{data_inicio}}, etc.)
  const today = new Date().toISOString().split('T')[0];
  const documentData = {
    data_inicio: contrato.data_inicio,
    data_assinatura: today,
    cidade_assinatura: empresa.sede || (motoristaData.cidade as string) || 'Leiria',
    duracao_meses: duracaoMeses,
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
  });
};
