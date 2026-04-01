import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EventoCard, formatMatricula } from './EventoCard';
import type { CalendarioEvento } from '@/pages/Calendario';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  eventos: CalendarioEvento[];
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
  onEventClick: (e: CalendarioEvento) => void;
  onDeleteEvent: (id: string) => void;
  onEventDetails: (e: CalendarioEvento) => void;
  onDaySelect?: (d: Date) => void;
  isLoading: boolean;
  currentUserId?: string;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const CalendarioGrid: React.FC<Props> = ({
  eventos, currentMonth, onMonthChange, onEventClick, onDeleteEvent, onEventDetails, onDaySelect, isLoading, currentUserId
}) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (d: Date) =>
    eventos.filter(ev => isSameDay(new Date(ev.data_inicio), d));

  const today = new Date();

  const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: pt })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map(wd => (
          <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dayEvts = getEventsForDay(d);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const isToday = isSameDay(d, today);
          const isSelected = selectedDay && isSameDay(d, selectedDay);

          const visibleEvts = dayEvts.slice(0, 2);
          const extraCount = dayEvts.length - visibleEvts.length;

          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => { setSelectedDay(d); onDaySelect?.(d); }}
              className={cn(
                "relative aspect-square p-1 rounded-md border transition-colors text-left flex flex-col cursor-pointer touch-manipulation",
                !isCurrentMonth && "opacity-40",
                isToday && "border-primary bg-primary/5",
                isSelected && "ring-2 ring-primary",
                !isToday && !isSelected && "border-border hover:bg-muted/50"
              )}
            >
              <span className={cn(
                "text-xs font-medium shrink-0",
                isToday && "text-primary font-bold"
              )}>
                {format(d, 'd')}
              </span>
              {dayEvts.length > 0 && (
                <div className="mt-0.5 space-y-0.5 flex-1 overflow-hidden min-h-0">
                  {visibleEvts.map(ev => (
                    <div
                      key={ev.id}
                      className={cn(
                        "text-[10px] leading-tight px-1 py-0.5 rounded truncate",
                        ev.tipo === 'entrega' && "bg-green-500/20 text-green-700 dark:text-green-300",
                        ev.tipo === 'recolha' && "bg-blue-500/20 text-blue-700 dark:text-blue-300",
                        ev.tipo === 'devolucao' && "bg-orange-500/20 text-orange-700 dark:text-orange-300",
                        ev.tipo === 'troca' && "bg-purple-500/20 text-purple-700 dark:text-purple-300",
                        ev.tipo === 'upgrade' && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
                      )}
                    >
                      {formatMatricula(ev.titulo)}{ev.cidade ? ` ${ev.cidade.toUpperCase()}` : ''}
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <span className="text-[9px] text-muted-foreground font-medium">+{extraCount}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDay && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold">
            Eventos de {format(selectedDay, "d 'de' MMMM", { locale: pt })}
          </h3>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos neste dia.</p>
          ) : (
            dayEvents.map(ev => (
              <EventoCard
                key={ev.id}
                evento={ev}
                onEdit={onEventClick}
                onDelete={onDeleteEvent}
                onDetails={onEventDetails}
                canEdit={currentUserId === ev.criado_por}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
