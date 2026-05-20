import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  User,
  FileText,
  Settings,
  Menu,
  ClipboardCheck,
  ChevronDown,
  Wrench,
  Car,
  Wallet,
  CalendarDays,
  Mail,
  KeyRound,
  CalendarCheck,
  ArrowRightLeft,
  Users,
  Library,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/auth/UserMenu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useThemedLogo } from '@/hooks/useThemedLogo';
import { OrgSelector } from '@/components/OrgSelector';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SubMenuItem {
  label: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  recurso?: string;
}

interface MenuItem {
  label: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  recurso?: string;
  requireAdmin?: boolean;
  subItems?: SubMenuItem[];
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, recurso: 'motoristas_gestao' },
  {
    label: 'Renting',
    icon: KeyRound,
    subItems: [
      {
        label: 'Contratos',
        url: '/renting/contratos',
        icon: FileText,
        recurso: 'renting_contratos',
      },
      {
        label: 'Reservas',
        url: '/renting/reservas',
        icon: CalendarCheck,
        recurso: 'renting_reservas',
      },
      {
        label: 'Movimentações',
        url: '/renting/movimentacoes',
        icon: ArrowRightLeft,
        recurso: 'renting_movimentacoes',
      },
      {
        label: 'Clientes',
        url: '/renting/clientes',
        icon: Users,
        recurso: 'renting_clientes',
      },
      {
        label: 'Catálogos',
        url: '/renting/catalogos',
        icon: Library,
        recurso: 'renting_contratos',
      },
    ],
  },
  { label: 'CRM', url: '/crm', icon: BarChart3, recurso: 'motoristas_crm' },
  { label: 'Meus Tickets', url: '/meus-tickets', icon: Wrench, recurso: 'motoristas_crm' },
  {
    label: 'Motoristas',
    icon: User,
    recurso: 'motoristas_gestao',
    subItems: [
      { label: 'Todos Motoristas', url: '/motoristas', icon: User },
      { label: 'Aprovação', url: '/motoristas/candidaturas', icon: ClipboardCheck },
      { label: 'Contratos', url: '/contratos', icon: FileText },
    ],
  },
  { label: 'Viaturas', url: '/viaturas', icon: Car, recurso: 'viaturas_ver' },
  { label: 'Financeiro', url: '/financeiro', icon: Wallet, recurso: 'financeiro_recibos' },
  { label: 'Assistência', url: '/assistencia', icon: Wrench, recurso: 'assistencia_tickets' },
  { label: 'Calendário', url: '/calendario', icon: CalendarDays, recurso: 'calendario_ver' },
  { label: 'Marketing', url: '/marketing', icon: Mail, recurso: 'marketing_ver' },
];

export const SidebarMenu: React.FC = () => {
  const { isAdmin, hasAccessToResource, loading } = usePermissions();
  const { user } = useAuth();
  const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Utilizador';
  const userRole = isAdmin ? 'Administrador' : 'Utilizador';
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const logoSrc = useThemedLogo();
  const location = useLocation();

  const visibleMenuItems = MENU_ITEMS.map((item) => {
    if (loading) return item;
    if (!item.subItems) return item;
    // Submenus com recurso: filtrar pelos que o utilizador pode aceder
    const filteredSubs = item.subItems.filter(
      (sub) => !sub.recurso || hasAccessToResource(sub.recurso)
    );
    return { ...item, subItems: filteredSubs };
  }).filter((item) => {
    if (loading) return true;
    if (item.recurso && !hasAccessToResource(item.recurso)) return false;
    // Esconder item pai se tinha subItems mas nenhum sobrou visível
    if (item.subItems && item.subItems.length === 0) return false;
    return true;
  });

  const hasAdminAccess = !loading && (isAdmin || hasAccessToResource('admin_configuracoes'));

  const NavItem = ({ item, isSub = false }: { item: MenuItem | SubMenuItem; isSub?: boolean }) => {
    const Icon = item.icon!;
    const isActive =
      location.pathname === item.url ||
      (item.url !== '/' && location.pathname.startsWith(item.url + '/'));

    return (
      <NavLink
        to={item.url!}
        onClick={() => isMobile && setIsOpen(false)}
        className={({ isActive: linkActive }) =>
          cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative',
            isSub ? 'ml-9 text-sm' : 'text-sm font-medium',
            linkActive
              ? 'bg-primary/15 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )
        }
      >
        {isActive && !isSub && (
          <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
        )}
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isActive ? 'text-primary' : 'group-hover:scale-110'
          )}
        />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const MobileMenu = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <header className="native-header h-16 bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-[40] lg:hidden flex items-center px-4 w-full">
          <Button variant="ghost" size="icon" className="mr-4">
            <Menu className="h-6 w-6" />
          </Button>
          <img src={logoSrc} alt="Logo" className="h-8 w-auto" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 border-r border-border/50">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-border/50">
      {/* Header with Logo */}
      <div className="p-4 mb-0">
        <div className="flex items-center justify-center w-full py-1">
          <img src={logoSrc} alt="Logo" className="h-20 w-auto object-contain" />
        </div>
        <OrgSelector className="w-full mt-2 justify-center" />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {visibleMenuItems.map((item) => {
            if (item.subItems && item.subItems.length > 0) {
              const isSubActive = item.subItems.some((sub) =>
                location.pathname.startsWith(sub.url)
              );
              return (
                <Collapsible key={item.label} defaultOpen={isSubActive}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 w-full group text-sm font-medium',
                        '[&[data-state=open]>svg.chevron]:rotate-0',
                        isSubActive
                          ? 'text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isSubActive ? 'text-primary' : 'group-hover:scale-110'
                        )}
                      />
                      <span>{item.label}</span>
                      <ChevronDown className="chevron h-3 w-3 ml-auto -rotate-90 transition-transform duration-200" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1">
                    {item.subItems.map((sub) => (
                      <NavItem key={sub.url} item={sub} isSub />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            return <NavItem key={item.label} item={item} />;
          })}
        </div>

        {/* Admin Section Separator */}
        <div className="mt-8 mb-4">
          {hasAdminAccess && (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                SISTEMA
              </div>
              <div className="space-y-1 mb-2">
                <NavItem
                  item={{ label: 'Administração', url: '/admin/settings', icon: Settings }}
                />
              </div>
            </>
          )}
          <ThemeToggle variant="full" />
        </div>
      </ScrollArea>

      {/* User Footer */}
      <div className="p-4 border-t border-border/50 bg-muted/30">
        <div className="flex items-center w-full bg-background/50 p-2 rounded-xl border border-border/50 overflow-hidden">
          <UserMenu />
        </div>
      </div>
    </div>
  );

  if (isMobile) return <MobileMenu />;

  return (
    <aside className="hidden lg:block w-64 h-screen sticky top-0 overflow-hidden">
      <SidebarContent />
    </aside>
  );
};
