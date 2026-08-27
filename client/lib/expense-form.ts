import { parseAmountInput } from '@/lib/amount';
import { isValidYMD, parseDateInput } from '@/lib/date';
import type { Expense } from '@/lib/types';

export type ExpenseDraft = {
  date: string;
  concept: string;
  amount: string;
  category: string;
  /** Quiénes lo pagaron: al menos una persona. */
  personIds: string[];
};

export type DraftErrors = Partial<Record<keyof ExpenseDraft, string>>;

/** Un gasto listo para guardar: el identificador y la marca de tiempo los pone el contexto. */
export type ValidatedExpense = Omit<Expense, 'id' | 'updatedAt' | 'deleted'>;

export type ValidationResult =
  | { ok: true; expense: ValidatedExpense }
  | { ok: false; errors: DraftErrors };

export function emptyDraft(date: string): ExpenseDraft {
  return { date, concept: '', amount: '', category: '', personIds: [] };
}

export function draftFromExpense(expense: Expense): ExpenseDraft {
  return {
    date: expense.date,
    concept: expense.concept,
    amount: String(expense.amount),
    category: expense.category ?? '',
    personIds: expense.personIds,
  };
}

export function validateDraft(draft: ExpenseDraft): ValidationResult {
  const errors: DraftErrors = {};

  const date = parseDateInput(draft.date);
  if (!date || !isValidYMD(date)) {
    errors.date = 'Ingresá una fecha válida (DD/MM/AAAA).';
  }

  const concept = draft.concept.trim();
  if (!concept) {
    errors.concept = 'Escribí un concepto.';
  }

  const amount = parseAmountInput(draft.amount);
  if (amount == null) {
    errors.amount = 'Ingresá un monto numérico.';
  } else if (amount <= 0) {
    errors.amount = 'El monto tiene que ser mayor a cero.';
  }

  if (draft.personIds.length === 0) {
    errors.personIds = 'Elegí quién lo pagó.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    expense: {
      date: date as string,
      concept,
      amount: amount as number,
      category: draft.category.trim() || undefined,
      personIds: draft.personIds,
    },
  };
}
