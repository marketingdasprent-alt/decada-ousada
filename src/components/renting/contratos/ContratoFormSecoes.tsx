import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ClienteComDocumentos } from '@/types/cliente';
import type { Estacao } from '@/hooks/useEstacoes';
import type { ViaturaBasic } from '@/hooks/useViaturas';
import { ALDFields } from '@/components/renting/shared/ALDFields';
import { FranquiaKmsFields } from '@/components/renting/shared/FranquiaKmsFields';
import type { ContratoFormValues } from './contratoForm.schema';
import { SectionEntregaRecolha } from './SectionEntregaRecolha';
import { SectionInfoAdicional } from './SectionInfoAdicional';
import { SectionGeral } from './SectionGeral';
import { SectionRegime } from './SectionRegime';
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
    <SectionRegime form={form} />
    <SectionEntregaRecolha form={form} estacoes={estacoes} />
    <ALDFields idPrefix="contrato" />
    <SectionViatura form={form} viaturas={viaturas} estacoes={estacoes} />
    <SectionGeral form={form} clientes={clientes} />
    <FranquiaKmsFields />
    <SectionInfoAdicional form={form} />
  </div>
);
