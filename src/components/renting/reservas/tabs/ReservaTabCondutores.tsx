import type { UseFormReturn } from 'react-hook-form';

import { CondutoresFields } from '@/components/renting/shared/CondutoresFields';

import type { ReservaFormValues } from '../reservaDialog.schema';
import type { ClienteComDocumentos } from '@/types/cliente';
import type { Motorista } from '@/types/motorista';

interface ReservaTabCondutoresProps {
  // Mantido por compatibilidade com o callsite — o shared usa useFormContext.
  form: UseFormReturn<ReservaFormValues>;
  regime: 'rent_a_car' | 'tvde';
  clientes: ClienteComDocumentos[];
  motoristas?: Motorista[];
  onCriarNovoCliente?: () => void;
  onCriarNovoMotorista?: () => void;
}

export const ReservaTabCondutores: React.FC<ReservaTabCondutoresProps> = ({
  regime,
  clientes,
  motoristas,
  onCriarNovoCliente,
  onCriarNovoMotorista,
}) => (
  <CondutoresFields
    regime={regime}
    clientes={clientes}
    motoristas={motoristas}
    clientePrincipalLabel="Cliente da Reserva também conduz"
    onCriarNovoCliente={onCriarNovoCliente}
    onCriarNovoMotorista={onCriarNovoMotorista}
  />
);
