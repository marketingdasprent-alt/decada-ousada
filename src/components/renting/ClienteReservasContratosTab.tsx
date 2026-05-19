import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContratosRenting } from '@/hooks/useContratosRenting';
import { useReservas } from '@/hooks/useReservas';
import type { Reserva } from '@/types/reserva';
import type { ContratoRenting } from '@/types/contratoRenting';

import { ContratosTable } from './clienteReservasContratos/ContratosTable';
import { ReservasTable } from './clienteReservasContratos/ReservasTable';

// ─────────────────────────────────────────────────────────────

interface ClienteReservasContratosTabProps {
  clienteId: string | null;
}

export const ClienteReservasContratosTab: React.FC<ClienteReservasContratosTabProps> = ({
  clienteId,
}) => {
  const navigate = useNavigate();

  const { data: todasAsReservas = [], isLoading: loadingReservas } = useReservas({
    limit: 500,
  });

  const { data: todasOsContratos = [], isLoading: loadingContratos } = useContratosRenting({
    limit: 500,
  });

  // Filtra apenas as reservas deste cliente
  const reservas: Reserva[] = useMemo(
    () => todasAsReservas.filter((r) => r.cliente_id === clienteId),
    [todasAsReservas, clienteId]
  );

  // Filtra apenas os contratos deste cliente
  const contratos: ContratoRenting[] = useMemo(
    () => todasOsContratos.filter((c) => c.cliente_id === clienteId),
    [todasOsContratos, clienteId]
  );

  const isLoading = loadingReservas || loadingContratos;

  if (!clienteId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Guarde o cliente primeiro para ver as reservas e contratos.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = reservas.length > 0 || contratos.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Ainda não há reservas ou contratos para este cliente.
        </p>
      </div>
    );
  }

  const hasReservas = reservas.length > 0;
  const hasContratos = contratos.length > 0;
  const hasAmbos = hasReservas && hasContratos;

  // Determina a aba inicial e o grid das abas
  let defaultTab = 'reservas';
  let gridCols = 'grid-cols-2';

  if (!hasReservas && hasContratos) {
    defaultTab = 'contratos';
    gridCols = 'grid-cols-1';
  } else if (!hasContratos) {
    gridCols = 'grid-cols-1';
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className={`grid w-full ${gridCols}`}>
        {hasReservas && <TabsTrigger value="reservas">Reservas ({reservas.length})</TabsTrigger>}
        {hasContratos && (
          <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
        )}
      </TabsList>

      {/* Reservas */}
      {hasReservas && (
        <TabsContent value="reservas" className="mt-4">
          <ReservasTable reservas={reservas} navigate={navigate} />
        </TabsContent>
      )}

      {/* Contratos */}
      {hasContratos && (
        <TabsContent value="contratos" className="mt-4">
          <ContratosTable contratos={contratos} navigate={navigate} />
        </TabsContent>
      )}
    </Tabs>
  );
};
