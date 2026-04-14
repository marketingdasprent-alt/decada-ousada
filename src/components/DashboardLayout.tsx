import React from 'react';
import { SidebarMenu } from '@/components/navigation/SidebarMenu';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background w-full">
      <SidebarMenu />
      
      <main className="flex-1 p-4 md:p-8 w-full max-w-[1920px] mx-auto">
        {children}
      </main>
    </div>
  );
};