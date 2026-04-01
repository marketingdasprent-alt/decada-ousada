
import React from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, FormInput, UserPlus, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminMenu = () => {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  // Only show for admins
  if (!isAdmin) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800/90 border-gray-600 text-white hover:bg-gray-700 hover:text-white shadow-lg backdrop-blur-sm"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-800 border-gray-700" align="end">
          <DropdownMenuLabel className="text-gray-300">Administração</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem 
            onClick={() => navigate('/formularios')}
            className="text-gray-300 hover:bg-gray-700 cursor-pointer"
          >
            <FormInput className="h-4 w-4 mr-2" />
            Formulários
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => navigate('/admin/documentos')}
            className="text-gray-300 hover:bg-gray-700 cursor-pointer"
          >
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => navigate('/admin/invites')}
            className="text-gray-300 hover:bg-gray-700 cursor-pointer"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Convites
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => navigate('/admin/users')}
            className="text-gray-300 hover:bg-gray-700 cursor-pointer"
          >
            <Users className="h-4 w-4 mr-2" />
            Utilizadores
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
