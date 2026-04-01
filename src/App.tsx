import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { ThemeProvider } from 'next-themes';
import { isNativeDriverOnlyMode } from '@/lib/native';
import NativeAppRoutes from '@/routes/NativeAppRoutes';
import WebAppRoutes from '@/routes/WebAppRoutes';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PermissionsProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
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

export default App;
