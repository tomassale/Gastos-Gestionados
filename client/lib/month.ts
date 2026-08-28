import type { Expense } from '@/lib/types';

export type YearMonth = { year: number; month: number };

export function nowYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** El mes en el mismo formato en que empiezan las fechas: `YYYY-MM`. */
export function monthPrefix(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, '0')}`;
}

export function isInMonth(expense: Expense, ym: YearMonth): boolean {
  return expense.date.startsWith(monthPrefix(ym));
}

export function filterByMonth(expenses: Expense[], ym: YearMonth): Expense[] {
  // El prefijo se arma una vez y no por gasto: esto recorre todo el historial
  // al montar tres pantallas y en cada toque de flecha del selector de mes.
  const prefix = monthPrefix(ym);
  return expenses.filter((e) => e.date.startsWith(prefix));
}

export function totalAmount(list: Expense[]): number {
  return list.reduce((s, e) => s + e.amount, 0);
}

export function formatMonthLabel(ym: YearMonth, locale = 'es-AR'): string {
  const d = new Date(ym.year, ym.month - 1, 1);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const d = new Date(ym.year, ym.month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Orden cronológico: negativo si `a` cae antes que `b`, cero si es el mismo mes. */
export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year - b.year || a.month - b.month;
}
