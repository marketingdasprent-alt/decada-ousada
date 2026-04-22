
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserMenu = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-foreground hover:bg-primary/20 px-2 sm:px-4">
          <User className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{user.email}</span>
          {isAdmin && <span className="sm:ml-2 text-[10px] sm:text-xs bg-primary text-primary-foreground px-1 rounded">ADMIN</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card border-border" align="end">
        <DropdownMenuLabel className="text-foreground">Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem 
          onClick={() => navigate('/my-account')}
          className="text-foreground hover:bg-muted cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={signOut}
          className="text-foreground hover:bg-muted cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
