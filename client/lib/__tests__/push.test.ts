import { describe, expect, test } from 'bun:test';

import { changesSince, highWaterMark } from '@/lib/sync';
import type { Expense, Person } from '@/lib/types';

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e1',
    date: '2026-08-27',
    concept: 'Supermercado',
    amount: 12500,
    personIds: [],
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  };
}

function person(overrides: Partial<Person>): Person {
  return { id: 'p1', name: 'Ana', updatedAt: '2026-08-27T00:00:00.000Z', ...overrides };
}

describe('changesSince', () => {
  test('sube solo lo modificado después de la última subida', () => {
    const viejo = expense({ id: 'viejo', updatedAt: '2026-08-27T09:00:00.000Z' });
    const nuevo = expense({ id: 'nuevo', updatedAt: '2026-08-27T11:00:00.000Z' });

    const resultado = changesSince([], [viejo, nuevo], '2026-08-27T10:00:00.000Z');

    expect(resultado.expenses.map((e) => e.id)).toEqual(['nuevo']);
  });

  test('sin marca previa sube todo: el hogar todavía no tiene nada', () => {
    const resultado = changesSince([person({})], [expense({})], '');

    expect(resultado.people).toHaveLength(1);
    expect(resultado.expenses).toHaveLength(1);
  });

  test('lo que tiene la marca exacta ya viajó y no se repite', () => {
    const marca = '2026-08-27T10:00:00.000Z';
    const resultado = changesSince([], [expense({ updatedAt: marca })], marca);

    expect(resultado.expenses).toHaveLength(0);
  });
});

describe('highWaterMark', () => {
  test('es la marca más nueva de lo que efectivamente se mandó', () => {
    const changes = {
      people: [person({ updatedAt: '2026-08-27T10:00:00.000Z' })],
      expenses: [expense({ updatedAt: '2026-08-27T12:00:00.000Z' })],
    };

    expect(highWaterMark(changes, '2026-08-27T09:00:00.000Z')).toBe('2026-08-27T12:00:00.000Z');
  });

  test('sin nada para mandar no avanza', () => {
    const marca = '2026-08-27T09:00:00.000Z';

    expect(highWaterMark({ people: [], expenses: [] }, marca)).toBe(marca);
  });

  test('no adelanta más allá de lo enviado: lo cargado mientras tanto viaja después', () => {
    // Un gasto cargado después de armarse el envío no está en `changes`, así que
    // su marca tiene que quedar por encima de la que se guarda como subida.
    const enviado = expense({ updatedAt: '2026-08-27T10:00:00.000Z' });
    const cargadoDespues = '2026-08-27T10:00:01.000Z';

    const marca = highWaterMark({ people: [], expenses: [enviado] }, '');

    expect(marca < cargadoDespues).toBe(true);
  });
});
