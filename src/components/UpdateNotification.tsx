import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpdateNotification() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);

  if (!visible) return null;

  const handleUpdate = () => {
    const fn = (window as any).__swUpdate;
    if (fn) fn();
    else window.location.reload();
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Nova versão disponível</span>
        <span className="text-xs text-muted-foreground">Atualize para usar as melhorias mais recentes.</span>
      </div>
      <Button size="sm" onClick={handleUpdate} className="shrink-0 gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Atualizar
      </Button>
    </div>
  );
}
