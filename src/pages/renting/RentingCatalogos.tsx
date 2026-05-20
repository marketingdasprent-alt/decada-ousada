import { Library } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';

import { CoberturasTab } from '@/components/renting/catalogos/CoberturasTab';

const RentingCatalogos = () => {
  return (
    <div className="w-full">
      <StickyPageHeader
        title="Catálogos"
        description="Gerir catálogos do módulo de renting"
        icon={Library}
      />

      <Card className="bg-card border-border">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="coberturas" className="w-full">
            <TabsList className="justify-start overflow-x-auto">
              <TabsTrigger value="coberturas">Coberturas</TabsTrigger>
            </TabsList>

            <TabsContent value="coberturas" className="mt-4">
              <CoberturasTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentingCatalogos;
