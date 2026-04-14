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
      <div className="flex min-h-screen w-full bg-slate-50 rota-liquida">
        <MotoristaSidebar />
        
        <SidebarInset className="flex-1 flex flex-col bg-transparent">
          {/* Header Superior */}
          <header className="h-20 flex items-center justify-between px-8 border-b border-slate-200 sticky top-0 bg-white/80 backdrop-blur-xl z-20">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <SidebarTrigger className="text-slate-500 hover:text-slate-900 md:hidden" />
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                <Input 
                  placeholder="Pesquisar corridas, faturas ou suporte..." 
                  className="w-full bg-slate-100 border-none h-11 pl-12 rounded-xl text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-teal-600/50 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pl-8">
              <button className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
                <Bell className="w-5 h-5" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-teal-600 rounded-full border-2 border-white" />
              </button>

              <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">{userName || "Motorista"}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Gold Partner</p>
                </div>
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage src={userPhoto} />
                  <AvatarFallback className="bg-teal-50 text-teal-600 font-bold">
                    {userName?.charAt(0) || "M"}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-slate-400 hover:text-red-600">
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
