import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

interface RealtimeStatusProps {
  className?: string;
  isConnected?: boolean;
  lastActivity?: Date | null;
}

export const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ 
  className = '',
  isConnected: externalIsConnected,
  lastActivity: externalLastActivity 
}) => {
  // Usar estado externo se fornecido (via canal compartilhado)
  const connected = externalIsConnected !== undefined ? externalIsConnected : false;
  const activity = externalLastActivity !== undefined ? externalLastActivity : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-1.5"
      >
        <div className="relative">
          {connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          
          {connected && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1"
            >
              <Circle className="h-2 w-2 text-green-400 fill-current" />
            </motion.div>
          )}
        </div>

        <Badge 
          variant={connected ? "default" : "destructive"}
          className="text-xs px-2 py-0.5"
        >
          {connected ? 'Tempo Real' : 'Desconectado'}
        </Badge>
      </motion.div>

      {activity && connected && (
        <span className="text-xs text-muted-foreground">
          Última atualização: {activity.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};