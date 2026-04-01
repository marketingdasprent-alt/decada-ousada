
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { FilterState } from '../CRMFilters';

interface ActiveFiltersProps {
  filters: FilterState;
  statusColumns: { id: string; title: string; color: string; icon: string }[];
  hasActiveFilters: boolean;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filters,
  statusColumns,
  hasActiveFilters
}) => {
  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.search && (
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
          Busca: "{filters.search}"
        </Badge>
      )}
      {filters.status !== 'todos' && (
        <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
          Status: {statusColumns.find(s => s.id === filters.status)?.title}
        </Badge>
      )}
      {(filters.customStartDate || filters.customEndDate) && (
        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
          {`Período: ${filters.customStartDate 
            ? format(filters.customStartDate, 'dd/MM/yy', { locale: ptBR }) 
            : '...'} - ${filters.customEndDate 
            ? format(filters.customEndDate, 'dd/MM/yy', { locale: ptBR }) 
            : '...'}`}
        </Badge>
      )}
      {filters.userId !== 'todos' && (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          Usuário: {filters.userId}
        </Badge>
      )}
      {filters.campaignTags.map((tag) => (
        <Badge key={tag} variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
          Campanha: {tag}
        </Badge>
      ))}
    </div>
  );
};
