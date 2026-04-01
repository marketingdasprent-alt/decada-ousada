import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Users, Upload, PenTool, BarChart3 } from 'lucide-react';
import CampanhasTab from '@/components/marketing/CampanhasTab';
import ListasTab from '@/components/marketing/ListasTab';
import ImportarTab from '@/components/marketing/ImportarTab';
import AssinaturasTab from '@/components/marketing/AssinaturasTab';
import EstatisticasTab from '@/components/marketing/EstatisticasTab';

const Marketing = () => {
  const [activeTab, setActiveTab] = useState('campanhas');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing</h1>
        <p className="text-muted-foreground">Gerir campanhas de email, listas de transmissão e importações</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campanhas" className="gap-2">
            <Mail className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="listas" className="gap-2">
            <Users className="h-4 w-4" />
            Listas
          </TabsTrigger>
          <TabsTrigger value="assinaturas" className="gap-2">
            <PenTool className="h-4 w-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="estatisticas" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="importar" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas">
          <CampanhasTab />
        </TabsContent>
        <TabsContent value="listas">
          <ListasTab />
        </TabsContent>
        <TabsContent value="assinaturas">
          <AssinaturasTab />
        </TabsContent>
        <TabsContent value="estatisticas">
          <EstatisticasTab />
        </TabsContent>
        <TabsContent value="importar">
          <ImportarTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Marketing;
