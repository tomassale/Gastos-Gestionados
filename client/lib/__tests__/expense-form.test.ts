import { describe, expect, test } from 'bun:test';

import { draftFromExpense, emptyDraft, validateDraft } from '@/lib/expense-form';
import type { Expense } from '@/lib/types';

function validDraft() {
  return {
    date: '2026-08-27',
    concept: 'Supermercado',
    amount: '12.500,50',
    category: 'Comida',
    personIds: ['persona-ana'],
  };
}

describe('validateDraft', () => {
  test('acepta un gasto completo y normaliza el monto', () => {
    const result = validateDraft(validDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expense.amount).toBe(12500.5);
    expect(result.expense.date).toBe('2026-08-27');
    expect(result.expense.personIds).toEqual(['persona-ana']);
  });

  test('acepta la fecha escrita como se usa acá', () => {
    const result = validateDraft({ ...validDraft(), date: '27/08/2026' });
    expect(result.ok && result.expense.date).toBe('2026-08-27');
  });

  test('exige quién lo pagó', () => {
    const result = validateDraft({ ...validDraft(), personIds: [] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.personIds).toBeTruthy();
  });

  test('exige un concepto', () => {
    const result = validateDraft({ ...validDraft(), concept: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.concept).toBeTruthy();
  });

  test('rechaza montos que no son números o no son positivos', () => {
    for (const amount of ['', 'abc', '0', '-100']) {
      const result = validateDraft({ ...validDraft(), amount });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.amount).toBeTruthy();
    }
  });

  test('rechaza fechas que no existen', () => {
    const result = validateDraft({ ...validDraft(), date: '30/02/2026' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBeTruthy();
  });

  test('junta todos los errores de una vez', () => {
    const result = validateDraft({
      date: 'cualquiera',
      concept: '',
      amount: 'nada',
      category: '',
      personIds: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      'amount',
      'concept',
      'date',
      'personIds',
    ]);
  });

  test('la categoría es opcional y se limpia', () => {
    const result = validateDraft({ ...validDraft(), category: '  ' });
    expect(result.ok && result.expense.category).toBeUndefined();
  });
});

describe('borradores', () => {
  test('el vacío arranca sin personas', () => {
    expect(emptyDraft('2026-08-27').personIds).toEqual([]);
  });

  test('editar un gasto trae sus datos', () => {
    const expense: Expense = {
      id: 'e1',
      date: '2026-08-27',
      concept: 'Alquiler',
      amount: 45000,
      category: 'Casa',
      personIds: ['persona-ana'],
      updatedAt: '2026-08-27T00:00:00.000Z',
    };

    expect(draftFromExpense(expense)).toEqual({
      date: '2026-08-27',
      concept: 'Alquiler',
      amount: '45000',
      category: 'Casa',
      personIds: ['persona-ana'],
    });
  });
});
