import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import CRM from "./CRM";
import Contatos from "./Contatos";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Users2, MessageSquare } from "lucide-react";

export default function CRMContatos() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Determinar tab ativa baseado na URL
  const activeTab = location.pathname === '/contatos' ? 'contatos' : 'crm';
  
  const handleTabChange = (value: string) => {
    navigate(value === 'crm' ? '/crm' : '/contatos');
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <StickyPageHeader
          title={activeTab === 'crm' ? 'CRM de Leads' : 'Gestão de Contactos'}
          description={activeTab === 'crm' ? 'Acompanhamento do funil de vendas' : 'Lista completa de contactos na base'}
          icon={activeTab === 'crm' ? MessageSquare : Users2}
          className="pb-2"
        >
          <TabsList className={`grid w-full ${isMobile ? '' : 'max-w-md'} grid-cols-2`}>
            <TabsTrigger value="crm" className="relative z-50 text-xs">CRM</TabsTrigger>
            <TabsTrigger value="contatos" className="relative z-50 text-xs">Contactos</TabsTrigger>
          </TabsList>
        </StickyPageHeader>
        
        <TabsContent value="crm" className="mt-0">
          <CRM />
        </TabsContent>
        
        <TabsContent value="contatos" className="mt-0">
          <Contatos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
