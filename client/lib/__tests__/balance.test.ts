import { describe, expect, test } from 'bun:test';

import { settle, totalsByPerson, UNASSIGNED } from '@/lib/balance';
import type { Expense, Person } from '@/lib/types';

const ana: Person = { id: 'persona-ana', name: 'Ana', updatedAt: '2026-08-01T00:00:00.000Z' };
const tomas: Person = { id: 'persona-tomas', name: 'Tomas', updatedAt: '2026-08-01T00:00:00.000Z' };

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

describe('totalsByPerson', () => {
  test('suma lo que puso cada una', () => {
    const totals = totalsByPerson(
      [
        expense({ amount: 40000, personIds: [ana.id] }),
        expense({ amount: 12500, personIds: [tomas.id] }),
      ],
      [ana, tomas]
    );

    expect(totals.find((t) => t.personId === ana.id)?.total).toBe(40000);
    expect(totals.find((t) => t.personId === tomas.id)?.total).toBe(12500);
  });

  test('reparte en partes iguales un gasto pagado entre varias', () => {
    const totals = totalsByPerson(
      [expense({ amount: 20000, personIds: [ana.id, tomas.id] })],
      [ana, tomas]
    );

    expect(totals.find((t) => t.personId === ana.id)?.total).toBe(10000);
    expect(totals.find((t) => t.personId === tomas.id)?.total).toBe(10000);
  });

  test('los gastos sin nadie quedan aparte, no se pierden', () => {
    const totals = totalsByPerson([expense({ amount: 500, personIds: [] })], [ana]);

    const sinDuenio = totals.find((t) => t.personId === null);
    expect(sinDuenio?.name).toBe(UNASSIGNED);
    expect(sinDuenio?.total).toBe(500);
  });

  test('una persona borrada deja el gasto sin asignar', () => {
    const totals = totalsByPerson([expense({ amount: 800, personIds: ['fantasma'] })], [ana]);
    expect(totals.find((t) => t.personId === null)?.total).toBe(800);
  });

  test('las proporciones suman uno', () => {
    const totals = totalsByPerson(
      [
        expense({ amount: 30000, personIds: [ana.id] }),
        expense({ amount: 10000, personIds: [tomas.id] }),
      ],
      [ana, tomas]
    );

    const suma = totals.reduce((s, t) => s + t.share, 0);
    expect(suma).toBeCloseTo(1, 10);
  });

  test('viene ordenado de mayor a menor', () => {
    const totals = totalsByPerson(
      [
        expense({ amount: 100, personIds: [ana.id] }),
        expense({ amount: 900, personIds: [tomas.id] }),
      ],
      [ana, tomas]
    );

    expect(totals[0].name).toBe('Tomas');
  });
});

describe('settle', () => {
  test('calcula quién puso de más y cuánto le deben', () => {
    const result = settle(
      [
        expense({ amount: 40000, personIds: [ana.id] }),
        expense({ amount: 20000, personIds: [ana.id, tomas.id] }),
      ],
      [ana, tomas]
    );

    // Ana puso 40000 + 10000, Tomas 10000. Total 60000, mitad 30000.
    expect(result.fairShare).toBe(30000);
    expect(result.balances).toEqual([
      { name: 'Ana', balance: 20000 },
      { name: 'Tomas', balance: -20000 },
    ]);
    expect(result.transfers).toEqual([{ from: 'Tomas', to: 'Ana', amount: 20000 }]);
  });

  test('sin diferencias no hay nada que pagar', () => {
    const result = settle(
      [expense({ amount: 20000, personIds: [ana.id, tomas.id] })],
      [ana, tomas]
    );

    expect(result.transfers).toEqual([]);
    expect(result.balances.every((b) => b.balance === 0)).toBe(true);
  });

  test('los gastos sin asignar no entran en el reparto', () => {
    const result = settle(
      [
        expense({ amount: 10000, personIds: [ana.id] }),
        expense({ amount: 99999, personIds: [] }),
      ],
      [ana, tomas]
    );

    expect(result.fairShare).toBe(5000);
    expect(result.transfers).toEqual([{ from: 'Tomas', to: 'Ana', amount: 5000 }]);
  });

  test('reparte entre tres con las transferencias mínimas', () => {
    const nico: Person = { id: 'persona-nico', name: 'Nico', updatedAt: '2026-08-01T00:00:00.000Z' };
    const result = settle(
      [
        expense({ amount: 3000, personIds: [ana.id] }),
        expense({ amount: 0, personIds: [tomas.id] }),
      ],
      [ana, tomas, nico]
    );

    // Ana puso 3000 y a cada uno le tocaba 1000.
    expect(result.fairShare).toBe(1000);
    expect(result.transfers).toHaveLength(2);
    expect(result.transfers.every((t) => t.to === 'Ana' && t.amount === 1000)).toBe(true);
  });

  test('sin personas no rompe', () => {
    const result = settle([expense({ amount: 500 })], []);
    expect(result).toEqual({ fairShare: 0, balances: [], transfers: [] });
  });

  test('los centavos no se escapan por la coma flotante', () => {
    const result = settle(
      [expense({ amount: 0.1, personIds: [ana.id] }), expense({ amount: 0.2, personIds: [ana.id] })],
      [ana, tomas]
    );

    expect(result.fairShare).toBe(0.15);
    expect(result.balances[0].balance).toBe(0.15);
  });
});
