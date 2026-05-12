import { format, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '€0,00';
  return `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '0';
  return value.toLocaleString('pt-PT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, fmt, { locale: pt });
}

export function formatDateLong(date: string | Date | null | undefined): string {
  return formatDate(date, "d 'de' MMMM 'de' yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatMatricula(v: string): string {
  const c = v.replace(/[-\s]/g, '').toUpperCase();
  return c.match(/.{1,2}/g)?.join('-') || c;
}
