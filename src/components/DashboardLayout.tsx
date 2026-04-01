import React from 'react';
import { HorizontalTopMenu } from '@/components/navigation/HorizontalTopMenu';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HorizontalTopMenu />
      
      <main className="flex-1 p-4 md:p-6 max-w-[1800px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
};