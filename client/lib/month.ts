import type { Expense } from '@/lib/types';

export type YearMonth = { year: number; month: number };

export function nowYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function isInMonth(expense: Expense, ym: YearMonth): boolean {
  const [y, m] = expense.date.split('-').map(Number);
  return y === ym.year && m === ym.month;
}

export function filterByMonth(expenses: Expense[], ym: YearMonth): Expense[] {
  return expenses.filter((e) => isInMonth(e, ym));
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
