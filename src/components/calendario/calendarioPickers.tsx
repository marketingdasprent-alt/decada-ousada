import React, { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── DatePickerField ───────────────────────────────────────────────────────────

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  id?: string;
}

function parseLocalDate(str: string): Date | undefined {
  if (!str) return undefined;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({ value, onChange, id }) => {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const displayValue = selected ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: pt }) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
          {displayValue ?? 'Selecionar data...'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(toDateString(date));
              setOpen(false);
            }
          }}
          locale={pt}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

// ── TimePickerField ───────────────────────────────────────────────────────────

interface TimePickerFieldProps {
  value: string; // HH:MM
  onChange: (val: string) => void;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export const TimePickerField: React.FC<TimePickerFieldProps> = ({ value, onChange, disabled }) => {
  const parts = value ? value.split(':') : ['10', '00'];
  const hh = parts[0] ?? '10';
  // Round minutes to nearest 5 for display
  const rawMm = parseInt(parts[1] ?? '00', 10);
  const mm = String(Math.round(rawMm / 5) * 5 === 60 ? 55 : Math.round(rawMm / 5) * 5).padStart(
    2,
    '0'
  );

  return (
    <div className="flex items-center gap-1.5">
      <Select value={hh} onValueChange={(h) => onChange(`${h}:${mm}`)} disabled={disabled}>
        <SelectTrigger className="w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-semibold select-none">:</span>
      <Select value={mm} onValueChange={(m) => onChange(`${hh}:${m}`)} disabled={disabled}>
        <SelectTrigger className="w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
