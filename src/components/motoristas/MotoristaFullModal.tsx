import { useState, useEffect } from "react";
import {
  User,
  FileText,
  Wallet,
  Car,
  FileSignature,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MotoristaTabDados } from "./tabs/MotoristaTabDados";
import { MotoristaTabDocumentos } from "./tabs/MotoristaTabDocumentos";
import { MotoristaTabFinanceiro } from "./tabs/MotoristaTabFinanceiro";
import { MotoristaTabRecibos } from "./tabs/MotoristaTabRecibos";
import { MotoristaTabViaturas } from "./tabs/MotoristaTabViaturas";
import { MotoristaTabContratos } from "./tabs/MotoristaTabContratos";
import { MotoristaTabDanos } from "./tabs/MotoristaTabDanos";
import type { Motorista } from "@/pages/Motoristas";

type TabId = "dados" | "documentos" | "financeiro" | "recibos" | "viaturas" | "contratos" | "danos";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof User;
}

const TABS: Tab[] = [
  { id: "dados", label: "Dados", icon: User },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "recibos", label: "Recibos", icon: Receipt },
  { id: "viaturas", label: "Viaturas", icon: Car },
  { id: "contratos", label: "Contratos", icon: FileSignature },
  { id: "danos", label: "Danos", icon: AlertTriangle },
];

interface MotoristaFullModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: Motorista | null;
  onMotoristaUpdated?: () => void;
  initialTab?: TabId;
}

export function MotoristaFullModal({
  open,
  onOpenChange,
  motorista,
  onMotoristaUpdated,
  initialTab = "dados",
}: MotoristaFullModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  if (!motorista) return null;

  const handleSave = () => {
    onMotoristaUpdated?.();
  };

  const handleClose = () => {
    setActiveTab("dados"); // Reset to first tab
    onOpenChange(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dados":
        return <MotoristaTabDados motorista={motorista} onSave={handleSave} />;
      case "documentos":
        return <MotoristaTabDocumentos motorista={motorista} />;
      case "financeiro":
        return <MotoristaTabFinanceiro motorista={motorista} />;
      case "recibos":
        return <MotoristaTabRecibos motorista={motorista} />;
      case "viaturas":
        return <MotoristaTabViaturas motorista={motorista} />;
      case "contratos":
        return <MotoristaTabContratos motorista={motorista} onMotoristaUpdated={onMotoristaUpdated} />;
      case "danos":
        return <MotoristaTabDanos motorista={motorista} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-base">
                  #{motorista.codigo}
                </span>
                {motorista.nome}
              </DialogTitle>
              <Badge variant={motorista.status_ativo ? "default" : "secondary"}>
                {motorista.status_ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 border-b bg-muted/30 flex-shrink-0">
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {renderTabContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
