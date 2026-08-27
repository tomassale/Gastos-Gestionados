import type { Expense } from '@/lib/types';

/**
 * Cuánto tiempo se guarda un gasto antes de borrarse solo.
 *
 * Se cuenta por la fecha del gasto, no por cuándo se cargó: lo que importa es
 * de cuándo es el gasto. Pasado el plazo desaparece del dispositivo y de la
 * base, sin vuelta atrás.
 */
export const RETENTION_YEARS = 2;

/** @param today YYYY-MM-DD; por defecto, hoy. */
export function retentionCutoff(today: Date = new Date()): string {
  const cutoff = new Date(today);
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
  return cutoff.toISOString().slice(0, 10);
}

export function isBeyondRetention(expense: Expense, cutoff: string = retentionCutoff()): boolean {
  return expense.date < cutoff;
}

/**
 * Saca los gastos que ya cumplieron el plazo. Devuelve la misma lista si no hay
 * nada que borrar, para no guardar ni redibujar de más.
 */
export function pruneOldExpenses(
  expenses: Expense[],
  cutoff: string = retentionCutoff()
): Expense[] {
  const kept = expenses.filter((e) => !isBeyondRetention(e, cutoff));
  return kept.length === expenses.length ? expenses : kept;
}
