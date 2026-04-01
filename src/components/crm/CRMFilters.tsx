import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterControls } from './filters/FilterControls';
import { ActiveFilters } from './filters/ActiveFilters';
import { MobileFilterDrawer } from './filters/MobileFilterDrawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface CRMFiltersProps {
  filters: FilterState; // Receber filtros atuais como prop
  onFilterChange: (filters: FilterState) => void;
  statusColumns: { id: string; title: string; color: string; icon: string }[];
  totalLeads: number;
  filteredCount: number;
  availableTags?: string[];
  onGenerateReport?: (userId: string, filteredLeads: any[]) => void;
  filteredLeads?: any[];
}

export interface FilterState {
  search: string;
  status: string;
  dateRange: string;
  customStartDate?: Date;
  customEndDate?: Date;
  campaignTags: string[];
  userId: string;
}

export const CRMFilters: React.FC<CRMFiltersProps> = ({ 
  filters,
  onFilterChange, 
  statusColumns, 
  totalLeads, 
  filteredCount,
  availableTags = [],
  onGenerateReport,
  filteredLeads = []
}) => {
  const isMobile = useIsMobile();
  
  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { 
      search: '', 
      status: 'todos', 
      dateRange: 'todos', 
      customStartDate: undefined, 
      customEndDate: undefined, 
      campaignTags: [], 
      userId: 'todos' 
    };
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Boolean(
    filters.search || 
    filters.status !== 'todos' || 
    filters.customStartDate ||
    filters.customEndDate ||
    filters.campaignTags.length > 0 ||
    filters.userId !== 'todos'
  );

  const generateReport = () => {
    if (filters.userId !== 'todos' && onGenerateReport) {
      onGenerateReport(filters.userId, filteredLeads);
    }
  };

  // Mobile version
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-card/80 to-muted/80 backdrop-blur-sm border border-border rounded-xl p-4 mb-6"
      >
        <div className="space-y-3">
          {/* Filter Button */}
          <MobileFilterDrawer
            filters={filters}
            onFilterChange={updateFilters}
            statusColumns={statusColumns}
            availableTags={availableTags}
          />

          {/* Active Filters */}
          {hasActiveFilters && (
            <ActiveFilters
              filters={filters}
              statusColumns={statusColumns}
              hasActiveFilters={hasActiveFilters}
            />
          )}

          {/* Results Summary */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>Mostrando</span>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                {filteredCount}
              </Badge>
              <span>de</span>
              <Badge variant="secondary" className="bg-muted/20 text-foreground border-border/30">
                {totalLeads}
              </Badge>
              <span>leads</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}

              {filters.userId !== 'todos' && onGenerateReport && (
                <Button
                  onClick={generateReport}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Gerar Relatório
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Desktop version
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-card/80 to-muted/80 backdrop-blur-sm border border-border rounded-xl p-6 mb-8 overflow-hidden"
    >
      <div className="space-y-4 min-w-0">
        {/* Main Filter Controls */}
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center min-w-0">
          <FilterControls
            filters={filters}
            onFilterChange={updateFilters}
            statusColumns={statusColumns}
            availableTags={availableTags}
          />
        </div>

        {/* Active Filters and Results Summary */}
        {(hasActiveFilters || filteredCount !== totalLeads) && (
          <div className="pt-4 border-t border-border">
            <div className="flex flex-col gap-3">
              {/* Active Filters */}
              {hasActiveFilters && (
                <ActiveFilters
                  filters={filters}
                  statusColumns={statusColumns}
                  hasActiveFilters={hasActiveFilters}
                />
              )}
              
              {/* Results Summary and Clear Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground flex-wrap">
                  <span className="whitespace-nowrap">Mostrando</span>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    {filteredCount}
                  </Badge>
                  <span className="whitespace-nowrap">de</span>
                  <Badge variant="secondary" className="bg-muted/20 text-foreground border-border/30">
                    {totalLeads}
                  </Badge>
                  <span className="whitespace-nowrap">leads</span>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {hasActiveFilters && (
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      size="sm"
                      className="border-border text-foreground hover:bg-muted hover:text-foreground whitespace-nowrap"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  )}
                  
                  {filters.userId !== 'todos' && (
                    <Button
                      onClick={() => generateReport()}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                    >
                      📊 Gerar Relatório
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
