import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ClienteComDocumentos } from '@/types/cliente';
import type { Estacao } from '@/hooks/useEstacoes';
import type { ViaturaBasic } from '@/hooks/useViaturas';
import type { ContratoFormValues } from './contratoForm.schema';
import { SectionALD } from './SectionALD';
import { SectionEntregaRecolha } from './SectionEntregaRecolha';
import { SectionFranquiaKms } from './SectionFranquiaKms';
import { SectionInfoAdicional } from './SectionInfoAdicional';
import { SectionGeral } from './SectionGeral';
import { SectionViatura } from './SectionViatura';

interface ContratoFormSecoesProps {
  form: UseFormReturn<ContratoFormValues>;
  clientes: ClienteComDocumentos[];
  viaturas: ViaturaBasic[];
  estacoes: Estacao[];
}

/**
 * Orquestrador de seções do formulário de contrato.
 * Compõe sub-componentes de formulário específicas.
 */
export const ContratoFormSecoes: React.FC<ContratoFormSecoesProps> = ({
  form,
  clientes,
  viaturas,
  estacoes,
}) => (
  <div className="space-y-6">
    <SectionEntregaRecolha form={form} estacoes={estacoes} />
    <SectionALD form={form} />
    <SectionViatura form={form} viaturas={viaturas} estacoes={estacoes} />
    <SectionGeral form={form} clientes={clientes} />
    <SectionFranquiaKms form={form} />
    <SectionInfoAdicional form={form} />
  </div>
);
