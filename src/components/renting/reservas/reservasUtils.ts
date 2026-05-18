import { format } from 'date-fns';

/** Normaliza matrícula: lowercase + ignora hífens e espaços */
export function normalizeMatricula(m: string): string {
  return m.toLowerCase().replace(/[-\s]/g, '');
}

export function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return iso;
  }
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
