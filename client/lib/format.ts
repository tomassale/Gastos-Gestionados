const LOCALE = 'es-AR';
const CURRENCY = 'ARS';

export function formatCurrency(amount: number): string {
  return amount.toLocaleString(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 2,
  });
}

/** @param date en formato YYYY-MM-DD */
export function formatShortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
  });
}

export function todayYMD(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
