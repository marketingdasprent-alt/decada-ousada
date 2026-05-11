import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { ThemeProvider } from 'next-themes';
import { isNativeDriverOnlyMode } from '@/lib/native';
import NativeAppRoutes from '@/routes/NativeAppRoutes';
import WebAppRoutes from '@/routes/WebAppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    const handleUpdate = () => {
      toast('Nova versão disponível', {
        description: 'Podes continuar a trabalhar e atualizar quando quiseres.',
        action: {
          label: 'Atualizar agora',
          onClick: () => {
            const fn = (window as any).__swUpdate;
            if (fn) fn();
            else window.location.reload();
          },
        },
        duration: Infinity,
      });
    };
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                {isNativeDriverOnlyMode() ? <NativeAppRoutes /> : <WebAppRoutes />}
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
