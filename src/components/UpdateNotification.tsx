import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
// @ts-ignore — virtual module gerado pelo vite-plugin-pwa em tempo de build
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateNotification() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Nova versão disponível</span>
        <span className="text-xs text-muted-foreground">
          Atualize para usar as melhorias mais recentes.
        </span>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await updateServiceWorker(true);
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          window.location.reload();
        }}
        className="shrink-0 gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Atualizar
      </Button>
    </div>
  );
}
