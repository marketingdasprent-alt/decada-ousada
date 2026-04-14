import React from "react";
import { 
  LayoutDashboard, 
  Car, 
  BarChart3, 
  Euro, 
  Truck, 
  Calendar, 
  MessageSquare, 
  LifeBuoy,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const menuItems = [
  { icon: Car, label: "Minhas Corridas", id: "rides" },
  { icon: BarChart3, label: "Análise", id: "analytics" },
  { icon: Euro, label: "Despesas", id: "expenses" },
  { icon: Truck, label: "Veículos", id: "vehicles" },
  { icon: MessageSquare, label: "Mensagens", id: "messages" },
  { icon: LifeBuoy, label: "Suporte", id: "support" },
];

export function MotoristaSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = "rides"; // Ajustado para um ID que existe no novo menu

  return (
    <Sidebar className="border-r border-slate-200 bg-white text-slate-900">
      <SidebarHeader className="px-6 py-8">
        <div className="flex items-center justify-center">
          <img 
            src="/images/logo-rota-liquida.png.png" 
            alt="Rota Líquida" 
            className="h-16 w-auto object-contain transition-all hover:scale-105" 
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeId === item.id}
                    className={cn(
                      "w-full h-11 px-4 flex items-center justify-between rounded-xl transition-all duration-200 group outline-none",
                      activeId === item.id 
                        ? "bg-teal-50 text-teal-600 font-bold shadow-sm" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "w-5 h-5 transition-colors",
                        activeId === item.id 
                          ? "text-teal-600" 
                          : "text-slate-400 group-hover:text-slate-900"
                      )} />
                      <span className={cn(
                        "text-sm font-semibold transition-colors",
                        activeId === item.id ? "text-teal-600" : "text-slate-600 group-hover:text-slate-900"
                      )}>
                        {item.label}
                      </span>
                    </div>
                    {activeId === item.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-600 shadow-[0_0_8px_rgba(20,184,166,0.2)]" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="bg-slate-100 mx-6" />
      
      <div className="mt-auto p-6">
        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 relative overflow-hidden group hover:border-teal-200 transition-all">
          <div className="relative z-10">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1">Dica Premium</p>
            <p className="text-[10px] text-teal-700/70 leading-relaxed font-medium">Poupe até 15% em combustível com os novos cartões Repsol.</p>
          </div>
          <div className="absolute -right-4 -bottom-4 bg-teal-600/5 w-16 h-16 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
        </div>
      </div>
    </Sidebar>
  );
}
