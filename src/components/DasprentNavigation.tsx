import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BarChart3
} from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useThemedLogo } from '@/hooks/useThemedLogo';

const DasprentNavigation = () => {
  const location = useLocation();
  const logoSrc = useThemedLogo();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={logoSrc}
              alt="Década Ousada" 
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <Button
              asChild
              variant={isActive('/crm') ? 'default' : 'ghost'}
              size="sm"
              className={`text-sm transition-colors ${
                isActive('/crm')
                  ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Link to="/crm" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                CRM
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive('/contatos') ? 'default' : 'ghost'}
              size="sm"
              className={`text-sm transition-colors ${
                isActive('/contatos')
                  ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Link to="/contatos" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contatos
              </Link>
            </Button>
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
};

export default DasprentNavigation;
