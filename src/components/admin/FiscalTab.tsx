import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgDefinicoes, useUpdateOrgDefinicoes } from '@/hooks/useOrgDefinicoes';

/**
 * Definições fiscais da organização. Começa com as taxas de IVA
 * (rent-a-car / TVDE); pensada para crescer com outras definições.
 */
export const FiscalTab: React.FC = () => {
  const { data: definicoes, isLoading } = useOrgDefinicoes();
  const updateMutation = useUpdateOrgDefinicoes();

  const [ivaRentACar, setIvaRentACar] = useState('');
  const [ivaTvde, setIvaTvde] = useState('');

  useEffect(() => {
    if (definicoes) {
      setIvaRentACar(String(definicoes.iva_rent_a_car));
      setIvaTvde(String(definicoes.iva_tvde));
    }
  }, [definicoes]);

  const handleSave = () => {
    const rac = Number(ivaRentACar);
    const tvde = Number(ivaTvde);
    if (!Number.isFinite(rac) || rac < 0 || rac > 100) {
      toast.error('IVA rent-a-car inválido — tem de estar entre 0 e 100.');
      return;
    }
    if (!Number.isFinite(tvde) || tvde < 0 || tvde > 100) {
      toast.error('IVA TVDE inválido — tem de estar entre 0 e 100.');
      return;
    }
    updateMutation.mutate(
      { iva_rent_a_car: rac, iva_tvde: tvde },
      {
        onSuccess: () => toast.success('Taxas de IVA guardadas.'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao guardar.'),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Fiscal
        </CardTitle>
        <CardDescription>
          Taxas de IVA da organização. Cada contrato aplica a taxa conforme o seu regime —
          rent-a-car ou TVDE.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-w-md space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iva-rac">IVA Rent-a-car (%)</Label>
                <Input
                  id="iva-rac"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={ivaRentACar}
                  onChange={(e) => setIvaRentACar(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iva-tvde">IVA TVDE (%)</Label>
                <Input
                  id="iva-tvde"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={ivaTvde}
                  onChange={(e) => setIvaTvde(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
