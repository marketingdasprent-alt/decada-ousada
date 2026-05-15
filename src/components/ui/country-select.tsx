import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { PAISES } from '@/lib/paises';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CountrySelect = React.forwardRef<HTMLButtonElement, CountrySelectProps>(
  ({ value, onChange, placeholder = 'Selecione o país…', disabled, className }, ref) => {
    const [open, setOpen] = React.useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]"
        >
          <Command>
            <CommandInput placeholder="Procurar país…" className="h-9" />
            <CommandList className="max-h-[260px]">
              <CommandEmpty>País não encontrado.</CommandEmpty>
              <CommandGroup>
                {PAISES.map((pais) => (
                  <CommandItem
                    key={pais}
                    value={pais}
                    onSelect={() => {
                      onChange(pais);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === pais ? 'opacity-100' : 'opacity-0')}
                    />
                    {pais}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

CountrySelect.displayName = 'CountrySelect';
