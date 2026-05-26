import type React from 'react';
import { Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, isThisWeek } from 'date-fns';
import { pt } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';

const WEEK_STARTS_ON = 1 as const;

export interface AdminFiltrosIntegracao {
  id: string;
  nome: string;
  company_name?: string | null;
}

interface AdminFiltrosProps {
  selectedWeek: Date;
  onSelectedWeekChange: (date: Date) => void;
  /** Lista de integrações — se vazia/omitida, esconde o seletor. */
  integracoes?: AdminFiltrosIntegracao[];
  selectedIntegracao?: string;
  onSelectedIntegracaoChange?: (id: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  searchPlaceholder?: string;
  /** Slot à direita — botões como "Importar CSV". */
  extraRight?: React.ReactNode;
}

const weekShortcuts = [
  { label: 'Esta semana', date: new Date() },
  { label: 'Semana passada', date: subWeeks(new Date(), 1) },
  { label: 'Há 2 semanas', date: subWeeks(new Date(), 2) },
  { label: 'Há 4 semanas', date: subWeeks(new Date(), 4) },
];

/**
 * Filtros partilhados das tabs administrativas (Contas, Bolt, Uber, BP, ...).
 * Mantém o mesmo visual e comportamento da tab Contas: navegador de semana
 * (Seg-Dom), seletor de integração opcional, e pesquisa.
 */
export const AdminFiltros: React.FC<AdminFiltrosProps> = ({
  selectedWeek,
  onSelectedWeekChange,
  integracoes,
  selectedIntegracao = 'all',
  onSelectedIntegracaoChange,
  searchTerm,
  onSearchTermChange,
  searchPlaceholder = 'Pesquisar motorista...',
  extraRight,
}) => {
  const isMobile = useIsMobile();
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: WEEK_STARTS_ON });
  const isCurrentWeek = isThisWeek(selectedWeek, { weekStartsOn: WEEK_STARTS_ON });

  const goToPrevious = () => onSelectedWeekChange(subWeeks(selectedWeek, 1));
  const goToNext = () => onSelectedWeekChange(addWeeks(selectedWeek, 1));

  const handleDayClick = (day?: Date) => {
    if (day) onSelectedWeekChange(day);
  };

  const getWeekLabel = () => {
    const startStr = format(weekStart, 'dd MMM', { locale: pt });
    const endStr = format(weekEnd, 'dd MMM yyyy', { locale: pt });
    const label = `${startStr} – ${endStr}`;
    return isCurrentWeek ? `${label} (Semana Actual)` : label;
  };

  const mostrarIntegracoes = !!integracoes && integracoes.length > 0 && !!onSelectedIntegracaoChange;

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
      {/* Navegação de Semana */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-center text-center font-normal min-w-[260px]"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getWeekLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <div className="p-3 border-b">
              <div className="flex flex-wrap gap-1.5">
                {weekShortcuts.map((s) => (
                  <Button
                    key={s.label}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => onSelectedWeekChange(s.date)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <CalendarComponent
              initialFocus
              mode="single"
              defaultMonth={selectedWeek}
              selected={selectedWeek}
              onSelect={handleDayClick}
              numberOfMonths={isMobile ? 1 : 2}
              locale={pt}
              weekStartsOn={WEEK_STARTS_ON}
              className="pointer-events-auto"
              modifiers={{ selected: { from: weekStart, to: weekEnd } }}
              modifiersStyles={{
                selected: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  borderRadius: 0,
                },
              }}
            />
            <div className="p-2 text-center text-xs text-muted-foreground border-t bg-muted/50">
              Clique num dia para selecionar a semana inteira (Seg-Dom)
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={goToNext} disabled={isCurrentWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Seletor de Integração */}
      {mostrarIntegracoes && (
        <Select value={selectedIntegracao} onValueChange={onSelectedIntegracaoChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas integrações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas integrações</SelectItem>
            {integracoes!.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.company_name || i.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Pesquisa */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {extraRight}
    </div>
  );
};
