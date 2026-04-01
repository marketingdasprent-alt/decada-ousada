import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { FilterControls } from './FilterControls';
import { FilterState } from '../CRMFilters';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileFilterDrawerProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  statusColumns: { id: string; title: string; color: string; icon: string }[];
  availableTags: string[];
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  filters,
  onFilterChange,
  statusColumns,
  availableTags
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Filtrar Leads</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(85vh-8rem)] mt-4">
          <div className="px-1">
            <FilterControls
              filters={filters}
              onFilterChange={onFilterChange}
              statusColumns={statusColumns}
              availableTags={availableTags}
            />
          </div>
        </ScrollArea>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button onClick={() => setIsOpen(false)} className="w-full">
            Aplicar Filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
