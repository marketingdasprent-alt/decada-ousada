import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  id: string;
  primary: string;
  secondary?: string;
  badge?: string;
}

interface SearchableDropdownProps {
  items: DropdownItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  matchFn: (item: DropdownItem, query: string) => boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  items, value, onChange, placeholder, icon, disabled, matchFn,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = items.find(i => i.id === value);
  const trimmedQuery = query.trim();
  const filtered = trimmedQuery ? items.filter(i => matchFn(i, trimmedQuery)) : items;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring ring-offset-1'
        )}
      >
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className={cn('flex-1 text-left truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.primary : placeholder}
        </span>
        {selected?.secondary && (
          <span className="text-xs text-muted-foreground shrink-0">{selected.secondary}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pesquisar..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum resultado</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item.id); setOpen(false); setQuery(''); }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left',
                    item.id === value && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <Check className={cn('h-4 w-4 shrink-0', item.id === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1 truncate">{item.primary}</span>
                  {item.secondary && <span className="text-xs text-muted-foreground">{item.secondary}</span>}
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.badge}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export function formatMatricula(v: string): string {
  const c = v.replace(/[-\s]/g, '').toUpperCase();
  return c.match(/.{1,2}/g)?.join('-') || c;
}
