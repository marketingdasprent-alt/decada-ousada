import * as React from 'react';
import { useFormContext, useController, type FieldPath, type FieldValues } from 'react-hook-form';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

// Asterisco vermelho para campos obrigatórios
// Nota: usa text-red-500 (vermelho vivo, fixo) em vez de text-destructive
// porque no tema escuro o destructive é demasiado escuro (#7f1d1d) e parece preto.
export const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

export type FieldStatus = 'valid' | 'invalid' | 'neutro';

function inputStateClass(status: FieldStatus): string {
  if (status === 'valid') return 'border-emerald-500 focus-visible:ring-emerald-500/20 pr-9';
  if (status === 'invalid') return 'border-destructive focus-visible:ring-destructive/20 pr-9';
  return '';
}

interface ValidationIconProps {
  status: FieldStatus;
  className?: string;
}

export const ValidationIcon: React.FC<ValidationIconProps> = ({ status, className }) => {
  if (status === 'valid') {
    return (
      <Check
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 pointer-events-none',
          className
        )}
      />
    );
  }
  if (status === 'invalid') {
    return (
      <AlertCircle
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive pointer-events-none',
          className
        )}
      />
    );
  }
  return null;
};

/**
 * Hook que devolve o estado de validação visual de um campo.
 * Usado no nível do componente — nunca dentro de uma render prop.
 */
export function useFieldStatus<T extends FieldValues = FieldValues>(
  name: FieldPath<T>
): FieldStatus {
  const { watch, formState } = useFormContext<T>();
  const value = watch(name);
  const error = formState.errors[name as string];
  const isTouched = formState.touchedFields[name as string];

  if (error) return 'invalid';
  if (value && isTouched) return 'valid';
  return 'neutro';
}

// ── Componente principal ──────────────────────────────────────
interface ValidatedTextFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  // Transformação opcional aplicada antes de actualizar o form (ex: formatarCodigoPostal)
  format?: (raw: string) => string;
  // Esconder o ícone de validação (útil quando o input já tem outro adornment)
  hideIcon?: boolean;
  className?: string;
}

export function ValidatedTextField<T extends FieldValues>({
  name,
  label,
  required,
  placeholder,
  type = 'text',
  inputMode,
  maxLength,
  format,
  hideIcon,
  className,
}: ValidatedTextFieldProps<T>) {
  const { control } = useFormContext<T>();
  const status = useFieldStatus<T>(name);
  const {
    field: { onChange, onBlur, value, ref },
  } = useController({ name, control });

  return (
    <FormItem>
      <FormLabel>
        {label}
        {required && <RequiredMark />}
      </FormLabel>
      <div className="relative">
        <FormControl>
          <Input
            ref={ref}
            type={type}
            placeholder={placeholder}
            inputMode={inputMode}
            maxLength={maxLength}
            value={(value as string | undefined) ?? ''}
            onChange={(e) => onChange(format ? format(e.target.value) : e.target.value)}
            onBlur={onBlur}
            className={cn('h-11', inputStateClass(status), className)}
          />
        </FormControl>
        {!hideIcon && <ValidationIcon status={status} />}
      </div>
      <FormMessage />
    </FormItem>
  );
}
