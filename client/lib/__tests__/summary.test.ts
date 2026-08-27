import { describe, expect, test } from 'bun:test';

import { filterByMonth, isInMonth, shiftMonth, totalAmount } from '@/lib/month';
import {
  averageAmount,
  filterByPerson,
  knownCategories,
  sortByDateDesc,
  totalsByCategory,
  UNCATEGORIZED,
} from '@/lib/summary';
import type { Expense } from '@/lib/types';
import { normalizeExpense, personIdFor, sharePerPayer } from '@/lib/types';

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-08-27',
    concept: 'Gasto',
    amount: 1000,
    personIds: [],
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('meses', () => {
  const agosto = { year: 2026, month: 8 };

  test('reconoce si un gasto cae en el mes', () => {
    expect(isInMonth(expense({ date: '2026-08-01' }), agosto)).toBe(true);
    expect(isInMonth(expense({ date: '2026-08-31' }), agosto)).toBe(true);
    expect(isInMonth(expense({ date: '2026-09-01' }), agosto)).toBe(false);
    expect(isInMonth(expense({ date: '2025-08-15' }), agosto)).toBe(false);
  });

  test('filtra y suma el mes', () => {
    const lista = [
      expense({ date: '2026-08-10', amount: 1000 }),
      expense({ date: '2026-08-20', amount: 500 }),
      expense({ date: '2026-07-31', amount: 9999 }),
    ];

    expect(totalAmount(filterByMonth(lista, agosto))).toBe(1500);
  });

  test('cambia de mes cruzando el año', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('resumen', () => {
  test('agrupa por categoría y calcula la proporción', () => {
    const totales = totalsByCategory([
      expense({ amount: 7500, category: 'Comida' }),
      expense({ amount: 2500, category: 'Comida' }),
      expense({ amount: 10000, category: 'Casa' }),
    ]);

    // Con montos empatados el orden lo define quién apareció primero.
    expect(totales.map((t) => t.category).sort()).toEqual(['Casa', 'Comida']);
    expect(totales.every((t) => t.total === 10000 && t.share === 0.5)).toBe(true);
  });

  test('los gastos sin categoría se agrupan aparte', () => {
    const totales = totalsByCategory([expense({ amount: 300 }), expense({ amount: 200 })]);
    expect(totales[0].category).toBe(UNCATEGORIZED);
    expect(totales[0].total).toBe(500);
  });

  test('promedia', () => {
    expect(averageAmount([expense({ amount: 100 }), expense({ amount: 200 })])).toBe(150);
    expect(averageAmount([])).toBe(0);
  });

  test('lista las categorías usadas, sin repetir y ordenadas', () => {
    const categorias = knownCategories([
      expense({ category: 'Comida' }),
      expense({ category: 'Auto' }),
      expense({ category: 'comida' }),
      expense({ category: '  ' }),
    ]);

    // El orden es el del español, que no distingue mayúsculas para comparar.
    expect(categorias).toHaveLength(3);
    expect(categorias[0]).toBe('Auto');
    expect(categorias.slice(1).sort()).toEqual(['Comida', 'comida']);
  });

  test('filtra por persona, incluidos los gastos compartidos', () => {
    const lista = [
      expense({ id: 'a', personIds: ['ana'] }),
      expense({ id: 'b', personIds: ['ana', 'tomas'] }),
      expense({ id: 'c', personIds: ['tomas'] }),
    ];

    expect(filterByPerson(lista, 'ana').map((e) => e.id)).toEqual(['a', 'b']);
    expect(filterByPerson(lista, null)).toHaveLength(3);
  });

  test('ordena del más nuevo al más viejo', () => {
    const lista = [
      expense({ id: 'viejo', date: '2026-08-01' }),
      expense({ id: 'nuevo', date: '2026-08-27' }),
    ];

    expect(sortByDateDesc(lista).map((e) => e.id)).toEqual(['nuevo', 'viejo']);
  });
});

describe('modelo', () => {
  test('reparte el gasto entre quienes lo pagaron', () => {
    expect(sharePerPayer(expense({ amount: 900, personIds: ['a', 'b', 'c'] }))).toBe(300);
    expect(sharePerPayer(expense({ amount: 900, personIds: [] }))).toBe(0);
  });

  test('el identificador de una persona sale del nombre', () => {
    expect(personIdFor('Ana')).toBe('persona-ana');
    expect(personIdFor('  ANA  ')).toBe('persona-ana');
    expect(personIdFor('María José')).toBe('persona-maria-jose');
    expect(personIdFor('Ana')).toBe(personIdFor('ana'));
  });

  test('un gasto del formato viejo se adapta solo', () => {
    const migrado = normalizeExpense({
      id: 'e1',
      date: '2026-08-27',
      concept: 'Viejo',
      amount: 100,
      personId: 'persona-ana',
    } as never);

    expect(migrado.personIds).toEqual(['persona-ana']);
    expect(migrado.updatedAt).toBeTruthy();
  });

  test('un gasto viejo sin persona queda sin asignar', () => {
    const migrado = normalizeExpense({
      id: 'e1',
      date: '2026-08-27',
      concept: 'Viejo',
      amount: 100,
    } as never);

    expect(migrado.personIds).toEqual([]);
  });
});
