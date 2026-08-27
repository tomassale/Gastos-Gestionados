import type { Expense } from '@/lib/types';

export const UNCATEGORIZED = 'Sin categoría';

export type CategoryTotal = {
  category: string;
  total: number;
  /** Proporción sobre el total del período, entre 0 y 1. */
  share: number;
};

export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category?.trim() || UNCATEGORIZED;
    totals.set(key, (totals.get(key) ?? 0) + e.amount);
  }

  const grandTotal = [...totals.values()].reduce((s, n) => s + n, 0);
  return [...totals.entries()]
    .map(([category, total]) => ({
      category,
      total,
      share: grandTotal === 0 ? 0 : total / grandTotal,
    }))
    .sort((a, b) => b.total - a.total);
}

export function averageAmount(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  return expenses.reduce((s, e) => s + e.amount, 0) / expenses.length;
}

export function knownCategories(expenses: Expense[]): string[] {
  const set = new Set<string>();
  for (const e of expenses) {
    const c = e.category?.trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

/** @param personId null para no filtrar. */
export function filterByPerson(expenses: Expense[], personId: string | null): Expense[] {
  if (!personId) return expenses;
  return expenses.filter((e) => e.personIds.includes(personId));
}

export function sortByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date));
}
