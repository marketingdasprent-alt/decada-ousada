import {
  CondutoresFields,
  type CondutorPessoa,
} from '@/components/renting/shared/CondutoresFields';

interface ReservaTabCondutoresProps {
  /** Clientes (rent-a-car) ou motoristas (TVDE), conforme o regime. */
  pessoas: CondutorPessoa[];
  tipo: 'cliente' | 'motorista';
}

export const ReservaTabCondutores: React.FC<ReservaTabCondutoresProps> = ({ pessoas, tipo }) => (
  <CondutoresFields
    pessoas={pessoas}
    tipo={tipo}
    clientePrincipalLabel="Cliente da Reserva também conduz"
  />
);
