/**
 * Helpers de validação e normalização de datas para formulários.
 */

export const DATE_YEAR_MIN = 1900;
export const DATE_YEAR_MAX = 2100;

/**
 * Aceita strings no formato YYYY-MM-DD (input type=date). Strings vazias
 * ou em outros formatos passam (cabe ao input type=date validar o
 * formato, esta função foca-se apenas no intervalo do ano).
 */
export function validateDateYear(date: string | null | undefined): boolean {
  if (!date) return true;
  const match = date.match(/^(\d{4})-\d{2}-\d{2}/);
  if (!match) return true;
  const year = parseInt(match[1], 10);
  return year >= DATE_YEAR_MIN && year <= DATE_YEAR_MAX;
}

/**
 * Normaliza uma data ISO (com ou sem hora) para o formato YYYY-MM-DD
 * que o `<input type="date">` espera. Retorna '' se a entrada for nula.
 */
export function sanitizeDate(date: string | null | undefined): string {
  if (!date) return '';
  return date.split('T')[0];
}

export const YEAR_RANGE_MESSAGE = `Ano deve estar entre ${DATE_YEAR_MIN} e ${DATE_YEAR_MAX}`;
