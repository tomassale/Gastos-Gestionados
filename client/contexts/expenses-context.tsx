import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { useSyncedState } from '@/hooks/use-synced-state';
import { pruneOldExpenses } from '@/lib/retention';
import { applyRemote } from '@/lib/sync';
import { pruneTombstones } from '@/lib/tombstones';
import type { Expense } from '@/lib/types';
import { isVisible, newId, normalizeExpense, now } from '@/lib/types';

const STORAGE_KEY = '@gastos_gestionados_v1';

type ExpensesContextValue = {
  /** Los gastos que la interfaz muestra: sin los dados de baja. */
  expenses: Expense[];
  /** Incluye las bajas, que hacen falta para sincronizar. */
  allExpenses: Expense[];
  loading: boolean;
  addExpense: (e: Omit<Expense, 'id' | 'updatedAt'>) => void;
  updateExpense: (id: string, patch: Partial<Omit<Expense, 'id' | 'updatedAt'>>) => void;
  removeExpense: (id: string) => void;
  /** Quita a una persona que ya no existe de los gastos que había pagado. */
  unassignPerson: (personId: string) => void;
  /** Combina lo que vino del hogar compartido con lo que hay en el dispositivo. */
  mergeRemote: (remote: Expense[]) => void;
  /** Cuántas veces cambiaron los gastos en este dispositivo, para saber qué falta subir. */
  localRevision: number;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function migrate(raw: unknown): Expense[] {
  if (!Array.isArray(raw)) return [];
  return pruneOldExpenses(pruneTombstones(raw.map(normalizeExpense)));
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const {
    value: allExpenses,
    update,
    updateFromRemote,
    localRevision,
    loading,
  } = useSyncedState<Expense[]>(STORAGE_KEY, [], migrate);

  const expenses = useMemo(() => allExpenses.filter(isVisible), [allExpenses]);

  const mergeRemote = useCallback(
    (remote: Expense[]) => updateFromRemote((prev) => applyRemote(prev, remote)),
    [updateFromRemote]
  );

  const addExpense = useCallback(
    (e: Omit<Expense, 'id' | 'updatedAt'>) =>
      update((prev) => [...prev, { ...e, id: newId(), updatedAt: now() }]),
    [update]
  );

  const updateExpense = useCallback(
    (id: string, patch: Partial<Omit<Expense, 'id' | 'updatedAt'>>) =>
      update((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e))
      ),
    [update]
  );

  const removeExpense = useCallback(
    (id: string) =>
      update((prev) =>
        prev.map((e) => (e.id === id ? { ...e, deleted: true, updatedAt: now() } : e))
      ),
    [update]
  );

  const unassignPerson = useCallback(
    (personId: string) =>
      update((prev) =>
        prev.map((e) =>
          e.personIds.includes(personId)
            ? {
                ...e,
                personIds: e.personIds.filter((id) => id !== personId),
                updatedAt: now(),
              }
            : e
        )
      ),
    [update]
  );

  const value = useMemo(
    () => ({
      expenses,
      allExpenses,
      loading,
      addExpense,
      updateExpense,
      removeExpense,
      unassignPerson,
      mergeRemote,
      localRevision,
    }),
    [
      expenses,
      allExpenses,
      loading,
      addExpense,
      updateExpense,
      removeExpense,
      unassignPerson,
      mergeRemote,
      localRevision,
    ]
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses debe usarse dentro de ExpensesProvider');
  return ctx;
}
