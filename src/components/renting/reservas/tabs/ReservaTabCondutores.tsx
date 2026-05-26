import type { UseFormReturn } from 'react-hook-form';

import { CondutoresFields } from '@/components/renting/shared/CondutoresFields';

import type { ReservaFormValues } from '../reservaDialog.schema';
import type { ClienteComDocumentos } from '@/types/cliente';

interface ReservaTabCondutoresProps {
  // Mantido por compatibilidade com o callsite — o shared usa useFormContext.
  form: UseFormReturn<ReservaFormValues>;
  clientes: ClienteComDocumentos[];
}

export const ReservaTabCondutores: React.FC<ReservaTabCondutoresProps> = ({ clientes }) => (
  <CondutoresFields clientes={clientes} clientePrincipalLabel="Cliente da Reserva também conduz" />
);
