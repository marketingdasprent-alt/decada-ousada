
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterSummaryProps {
  totalLeads: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  showOnlyClearButton?: boolean;
}

export const FilterSummary: React.FC<FilterSummaryProps> = ({
  totalLeads,
  filteredCount,
  hasActiveFilters,
  onClearFilters,
  showOnlyClearButton = false
}) => {
  if (showOnlyClearButton) {
    return hasActiveFilters ? (
      <Button
        onClick={onClearFilters}
        variant="outline"
        size="sm"
        className="border-border text-foreground hover:bg-muted hover:text-foreground whitespace-nowrap"
      >
        <X className="h-4 w-4 mr-2" />
        Limpar Filtros
      </Button>
    ) : null;
  }
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto min-w-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span className="whitespace-nowrap">Mostrando</span>
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 flex-shrink-0">
          {filteredCount}
        </Badge>
        <span className="whitespace-nowrap">de</span>
        <Badge variant="secondary" className="bg-muted/20 text-foreground border-border/30 flex-shrink-0">
          {totalLeads}
        </Badge>
        <span className="whitespace-nowrap">leads</span>
      </div>
    </div>
  );
};
