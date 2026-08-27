import { describe, expect, test } from 'bun:test';

import { applyRemote } from '@/lib/sync';
import { isExpiredTombstone, pruneTombstones, TOMBSTONE_TTL_DAYS } from '@/lib/tombstones';
import type { Expense } from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const AHORA = Date.parse('2026-08-27T00:00:00.000Z');

function hace(dias: number): string {
  return new Date(AHORA - dias * DAY_MS).toISOString();
}

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e1',
    date: '2026-08-27',
    concept: 'Gasto',
    amount: 1000,
    personIds: [],
    updatedAt: hace(0),
    ...overrides,
  };
}

describe('isExpiredTombstone', () => {
  test('un gasto vivo nunca vence, por viejo que sea', () => {
    expect(isExpiredTombstone(expense({ updatedAt: hace(9999) }), AHORA)).toBe(false);
  });

  test('un borrado reciente se conserva, para poder avisarle a los demás', () => {
    expect(isExpiredTombstone(expense({ deleted: true, updatedAt: hace(1) }), AHORA)).toBe(false);
    expect(
      isExpiredTombstone(expense({ deleted: true, updatedAt: hace(TOMBSTONE_TTL_DAYS - 1) }), AHORA)
    ).toBe(false);
  });

  test('pasado el plazo se olvida', () => {
    expect(
      isExpiredTombstone(expense({ deleted: true, updatedAt: hace(TOMBSTONE_TTL_DAYS + 1) }), AHORA)
    ).toBe(true);
  });

  test('una fecha ilegible se trata como vencida', () => {
    expect(isExpiredTombstone(expense({ deleted: true, updatedAt: 'roto' }), AHORA)).toBe(true);
  });
});

describe('pruneTombstones', () => {
  test('saca solo los borrados vencidos', () => {
    const lista = [
      expense({ id: 'vivo' }),
      expense({ id: 'borrado-hoy', deleted: true, updatedAt: hace(2) }),
      expense({ id: 'borrado-viejo', deleted: true, updatedAt: hace(200) }),
    ];

    expect(pruneTombstones(lista, AHORA).map((e) => e.id)).toEqual(['vivo', 'borrado-hoy']);
  });

  test('si no hay nada que sacar devuelve la misma lista', () => {
    const lista = [expense({ id: 'vivo' })];
    expect(pruneTombstones(lista, AHORA)).toBe(lista);
  });

  test('con la lista vacía no rompe', () => {
    expect(pruneTombstones([], AHORA)).toEqual([]);
  });
});

describe('applyRemote con marcas de borrado', () => {
  test('un borrado reciente que llega del servidor se aplica', () => {
    const resultado = applyRemote(
      [expense({ id: 'e1', updatedAt: hace(10) })],
      [expense({ id: 'e1', deleted: true, updatedAt: hace(1) })]
    );

    expect(resultado[0].deleted).toBe(true);
  });

  test('una marca vencida no vuelve a entrar en el dispositivo', () => {
    const resultado = applyRemote([], [expense({ id: 'viejo', deleted: true, updatedAt: hace(200) })]);
    expect(resultado).toEqual([]);
  });

  test('pero si el gasto todavía está acá, la marca vencida igual lo borra', () => {
    // El caso del dispositivo que estuvo mucho tiempo sin abrirse: más vale
    // respetar el borrado que revivir un gasto que ya no existe para nadie.
    const resultado = applyRemote(
      [expense({ id: 'e1', updatedAt: hace(300) })],
      [expense({ id: 'e1', deleted: true, updatedAt: hace(200) })]
    );

    expect(resultado[0].deleted).toBe(true);
  });
});
