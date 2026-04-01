
import React from 'react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useThemedLogo } from '@/hooks/useThemedLogo';

export const AdminInvitesHeader = () => {
  const logoSrc = useThemedLogo();

  return (
    <div className="bg-card/50 border-b border-border backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img 
            src={logoSrc} 
            alt="Década Ousada Logo" 
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-xl font-bold text-foreground">
            Administração - Convites
          </h1>
        </div>
        <UserMenu />
      </div>
    </div>
  );
};
