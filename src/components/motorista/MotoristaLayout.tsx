import React from "react";
import { MotoristaSidebar } from "./MotoristaSidebar";
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface MotoristaLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userPhoto?: string;
}

export const MotoristaLayout: React.FC<MotoristaLayoutProps> = ({ 
  children, 
  userName,
  userPhoto
}) => {
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background rota-liquida">
        <MotoristaSidebar />
        
        <SidebarInset className="flex-1 flex flex-col bg-transparent">
          {/* Header Superior */}
          <header className="h-20 flex items-center justify-between px-8 border-b border-border sticky top-0 bg-background/80 backdrop-blur-xl z-20">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground md:hidden" />
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar corridas, faturas ou suporte..." 
                  className="w-full bg-muted/50 border-none h-11 pl-12 rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pl-8">
              <button className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="w-5 h-5" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
              </button>

              <div className="flex items-center gap-3 border-l border-border pl-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-foreground leading-none">{userName || "Motorista"}</p>
                </div>
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={userPhoto} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {userName?.charAt(0) || "M"}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Área de Conteúdo */}
          <main className="flex-1 p-8 scrollbar-hide">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
