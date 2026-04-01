import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface ColumnContainerProps {
  id: string;
  title: string;
  color: string;
  icon: string;
  count: number;
  children: React.ReactNode;
}

export const ColumnContainer: React.FC<ColumnContainerProps> = ({ 
  id, 
  title, 
  color, 
  icon,
  count, 
  children 
}) => {
  const { setNodeRef, isOver } = useDroppable({ 
    id,
    data: {
      type: 'column',
      accepts: ['lead'],
      status: id,
    },
  });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`
        border-2 border-dashed rounded-xl p-6 min-h-[600px] transition-all duration-300
        bg-gradient-to-br ${color} backdrop-blur-sm relative
        ${isOver ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]' : ''}
        hover:shadow-lg hover:shadow-white/5
      `}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
        <h3 className="font-bold text-foreground text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm">Pipeline ativo</p>
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className="bg-foreground/10 text-foreground border-foreground/20 text-base px-3 py-1 font-bold"
        >
          {count}
        </Badge>
      </div>
      
      <div className="space-y-4 min-h-[400px] relative">
        {children}
        
        {/* Drop zone indicator when dragging over */}
        {isOver && (
          <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg bg-primary/5 pointer-events-none flex items-center justify-center">
            <p className="text-primary font-semibold">Soltar aqui</p>
          </div>
        )}
      </div>
      
      {count === 0 && !isOver && (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm text-center">Nenhum lead nesta fase</p>
        </div>
      )}
    </motion.div>
  );
};
