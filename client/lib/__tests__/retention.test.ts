import { describe, expect, test } from 'bun:test';

import {
  isBeyondRetention,
  pruneOldExpenses,
  RETENTION_YEARS,
  retentionCutoff,
} from '@/lib/retention';
import type { Expense } from '@/lib/types';

const HOY = new Date('2026-08-27T00:00:00.000Z');
const CORTE = retentionCutoff(HOY);

function expense(date: string, overrides: Partial<Expense> = {}): Expense {
  return {
    id: date,
    date,
    concept: 'Gasto',
    amount: 1000,
    personIds: [],
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('retentionCutoff', () => {
  test('el corte está dos años atrás', () => {
    expect(RETENTION_YEARS).toBe(2);
    expect(CORTE).toBe('2024-08-27');
  });
});

describe('isBeyondRetention', () => {
  test('lo de hoy y lo reciente se queda', () => {
    expect(isBeyondRetention(expense('2026-08-27'), CORTE)).toBe(false);
    expect(isBeyondRetention(expense('2025-01-15'), CORTE)).toBe(false);
  });

  test('justo en el límite todavía se guarda', () => {
    expect(isBeyondRetention(expense('2024-08-27'), CORTE)).toBe(false);
  });

  test('un día antes del límite ya se va', () => {
    expect(isBeyondRetention(expense('2024-08-26'), CORTE)).toBe(true);
  });

  test('lo viejo se va', () => {
    expect(isBeyondRetention(expense('2020-03-01'), CORTE)).toBe(true);
  });
});

describe('pruneOldExpenses', () => {
  test('deja solo lo que está dentro del plazo', () => {
    const lista = [
      expense('2026-08-01'),
      expense('2024-12-31'),
      expense('2024-08-26'),
      expense('2019-05-05'),
    ];

    expect(pruneOldExpenses(lista, CORTE).map((e) => e.date)).toEqual([
      '2026-08-01',
      '2024-12-31',
    ]);
  });

  test('si no hay nada vencido devuelve la misma lista', () => {
    const lista = [expense('2026-08-01')];
    expect(pruneOldExpenses(lista, CORTE)).toBe(lista);
  });

  test('también alcanza a los que estaban marcados como borrados', () => {
    const lista = [expense('2019-01-01', { deleted: true })];
    expect(pruneOldExpenses(lista, CORTE)).toEqual([]);
  });

  test('con la lista vacía no rompe', () => {
    expect(pruneOldExpenses([], CORTE)).toEqual([]);
  });
});
