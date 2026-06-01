import { supabase } from '@/integrations/supabase/client';
import type { EmpresaConfig } from '@/config/empresas';

import { generateDocumentFromTemplate } from './generateDocumentFromTemplate';

import type { ContratoRenting } from '@/types/contratoRenting';
import type { ClienteComDocumentos } from '@/types/cliente';
import type { Motorista } from '@/types/motorista';
import type { ViaturaBasic } from '@/hooks/useViaturas';

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
  /** Viatura do contrato — fornece marca/modelo/kms para os placeholders {{viatura_*}}. */
  viatura?: ViaturaBasic | null;
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
  viatura,
  empresa,
  action = 'print',
}: GenerateContratoPdfParams): Promise<void> => {
  if (!empresa) {
    throw new Error('Empresa não definida — impossível gerar contrato.');
  }

  // 1) Escolher o template de contrato para esta empresa, conforme o `regime`.
  //    Convenção de nomes (até existir taxonomia própria de `tipo`):
  //      - rent-a-car → "Contrato Aluguer - <Empresa>"
  //      - tvde       → "Contrato TVDE - <Empresa>"
  //    Se ainda não existir o de aluguer, cai no de TVDE — não parte nada
  //    enquanto o template de aluguer não for criado no admin.
  const { data: templates, error: templatesErr } = await supabase
    .from('document_templates')
    .select('id, nome, tipo, empresa_id')
    .eq('ativo', true)
    .eq('empresa_id', empresa.id)
    .in('tipo', ['contrato_tvde', 'contrato', 'contrato_aluguer'])
    .order('nome', { ascending: true });

  if (templatesErr) throw templatesErr;

  const porPrefixo = (prefixo: string) =>
    (templates ?? []).find((t) => t.nome.toLowerCase().startsWith(prefixo.toLowerCase()));

  const regimeAluguer = contrato.regime === 'rent_a_car';
  const template = regimeAluguer
    ? (porPrefixo('Contrato Aluguer') ?? porPrefixo('Contrato Rent') ?? porPrefixo('Contrato TVDE'))
    : (porPrefixo('Contrato TVDE') ?? (templates ?? [])[0]);

  if (!template) {
    const nomeSugerido = regimeAluguer ? 'Contrato Aluguer' : 'Contrato TVDE';
    throw new Error(
      `Sem template de contrato activo para a empresa "${empresa.nome}". ` +
        `Cria um chamado "${nomeSugerido} - ${empresa.nome}" em Configurações do Sistema → Documentos.`
    );
  }

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

  // 4) Dados do contrato (placeholders {{data_inicio}}, {{viatura_*}}, etc.)
  const today = new Date().toISOString().split('T')[0];
  const eur = (n: number | null | undefined) =>
    n != null && !Number.isNaN(Number(n)) ? `${Number(n).toFixed(2)} €` : '—';
  const num = (n: number | null | undefined) =>
    n != null && !Number.isNaN(Number(n)) ? String(n) : '—';

  const documentData = {
    data_inicio: contrato.data_inicio,
    data_fim: contrato.data_fim,
    data_assinatura: today,
    cidade_assinatura: empresa.sede || (motoristaData.cidade as string) || 'Leiria',
    duracao_meses: duracaoMeses,
    numero_contrato: contrato.codigo != null ? String(contrato.codigo) : '',
    // Viatura
    viatura_matricula: contrato.matricula ?? viatura?.matricula ?? '—',
    viatura_marca_modelo: viatura ? `${viatura.marca} ${viatura.modelo}`.trim() : '—',
    viatura_grupo: contrato.grupo ?? '—',
    viatura_kms: num(viatura?.km_atual),
    // Financeiro (já formatado; total_final só existe após facturar)
    tarifa_diaria: eur(contrato.tarifa_diaria),
    franquia: eur(contrato.franquia_valor),
    caucao: eur(contrato.caucao_valor),
    kms_incluidos: num(contrato.kms_incluidos),
    km_adicional: eur(contrato.km_adicional_valor),
    total: contrato.total_final != null ? eur(contrato.total_final) : 'A facturar',
    observacoes: contrato.observacoes ?? '',
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
    // Contratos de aluguer levam o logo WeGest no canto superior esquerdo.
    headerLogoUrl: regimeAluguer ? '/Logo.png' : undefined,
  });
};
