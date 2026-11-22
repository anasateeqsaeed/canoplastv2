import { format, parseISO } from 'date-fns';

/** DD/MM/YYYY — the app-wide display format for dates. */
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? (value.length === 10 ? parseISO(value) : new Date(value)) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy');
}

/** Today as yyyy-MM-dd (for <input type="date"> and DB date columns). */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
