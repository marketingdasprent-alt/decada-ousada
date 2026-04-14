import { MotoristaRecibosSection } from "./MotoristaRecibosSection";
import type { Motorista } from "@/pages/Motoristas";

interface MotoristaTabRecibosProps {
  motorista: Motorista;
}

export function MotoristaTabRecibos({ motorista }: MotoristaTabRecibosProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recibos Verdes</h2>
          <p className="text-muted-foreground">
            Gestão e validação de recibos submetidos pelo motorista.
          </p>
        </div>
      </div>

      <MotoristaRecibosSection motoristaId={motorista.id} />
    </div>
  );
}
