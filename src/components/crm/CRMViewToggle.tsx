import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CRMViewToggleProps {
  viewMode: 'kanban' | 'lista';
  onViewModeChange: (mode: 'kanban' | 'lista') => void;
}

export const CRMViewToggle: React.FC<CRMViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
      <Button
        variant={viewMode === 'kanban' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('kanban')}
        className={cn(
          'h-8 px-3 gap-2',
          viewMode === 'kanban' && 'shadow-sm'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Kanban</span>
      </Button>
      <Button
        variant={viewMode === 'lista' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('lista')}
        className={cn(
          'h-8 px-3 gap-2',
          viewMode === 'lista' && 'shadow-sm'
        )}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Lista</span>
      </Button>
    </div>
  );
};
