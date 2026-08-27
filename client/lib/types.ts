export type Syncable = {
  /** Marca de la última modificación, en ISO. Decide quién gana al sincronizar. */
  updatedAt: string;
  /**
   * Baja lógica. Lo borrado se conserva para poder avisarle a los otros
   * dispositivos; la interfaz nunca lo muestra.
   */
  deleted?: boolean;
};

export type Expense = Syncable & {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  concept: string;
  amount: number;
  category?: string;
  /**
   * Quiénes pusieron la plata. El monto se reparte en partes iguales entre
   * ellas. Puede venir vacío en gastos guardados por versiones anteriores.
   */
  personIds: string[];
};

export type Person = Syncable & {
  id: string;
  name: string;
};

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * El identificador de una persona sale de su nombre, para que dos dispositivos
 * que la cargan por separado lleguen al mismo y no quede duplicada en el hogar.
 */
export function personIdFor(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `persona-${slug}` : newId();
}

export function now(): string {
  return new Date().toISOString();
}

/** Lo que aportó cada persona de un gasto que pagaron entre varias. */
export function sharePerPayer(expense: Expense): number {
  if (expense.personIds.length === 0) return 0;
  return expense.amount / expense.personIds.length;
}

export function isVisible<T extends Syncable>(item: T): boolean {
  return !item.deleted;
}

type StoredExpense = Omit<Expense, 'personIds' | 'updatedAt'> & {
  personIds?: string[];
  updatedAt?: string;
  /** Formato viejo: una sola persona por gasto. */
  personId?: string;
};

/** Adapta un gasto guardado por una versión anterior al modelo actual. */
export function normalizeExpense(stored: StoredExpense): Expense {
  const { personId, personIds, updatedAt, ...rest } = stored;
  return {
    ...rest,
    personIds: personIds ?? (personId ? [personId] : []),
    updatedAt: updatedAt ?? new Date(0).toISOString(),
  };
}

export function normalizePerson(stored: Omit<Person, 'updatedAt'> & { updatedAt?: string }): Person {
  return { ...stored, updatedAt: stored.updatedAt ?? new Date(0).toISOString() };
}
