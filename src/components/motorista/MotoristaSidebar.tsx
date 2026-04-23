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
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: LifeBuoy, label: "Suporte", id: "support" },
];

export function MotoristaSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = "dashboard";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
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
                        ? "bg-primary/10 text-primary font-bold shadow-sm" 
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "w-5 h-5 transition-colors",
                        activeId === item.id 
                          ? "text-primary" 
                          : "text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-semibold transition-colors",
                        activeId === item.id ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                      )}>
                        {item.label}
                      </span>
                    </div>
                    {activeId === item.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.2)]" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
