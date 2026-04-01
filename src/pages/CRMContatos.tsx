import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import CRM from "./CRM";
import Contatos from "./Contatos";

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
        <div className={`sticky ${isMobile ? 'top-16' : 'top-20'} z-40 bg-background border-b ${isMobile ? 'px-4 py-2' : 'px-6 py-4'} backdrop-blur-sm`}>
          <TabsList className={`grid w-full ${isMobile ? '' : 'max-w-md'} grid-cols-2`}>
            <TabsTrigger value="crm" className="relative z-50">CRM</TabsTrigger>
            <TabsTrigger value="contatos" className="relative z-50">Contactos</TabsTrigger>
          </TabsList>
        </div>
        
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
