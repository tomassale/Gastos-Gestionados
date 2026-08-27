import { describe, expect, test } from 'bun:test';

import { applyRemote, withOverlap } from '@/lib/sync';
import type { Expense } from '@/lib/types';

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

describe('applyRemote', () => {
  test('agrega lo que no estaba', () => {
    const resultado = applyRemote([], [expense({ id: 'remoto' })]);
    expect(resultado).toHaveLength(1);
  });

  test('gana la modificación más reciente', () => {
    const local = expense({ id: 'e1', amount: 100, updatedAt: '2026-08-27T10:00:00.000Z' });
    const remotoNuevo = expense({ id: 'e1', amount: 999, updatedAt: '2026-08-27T11:00:00.000Z' });
    const remotoViejo = expense({ id: 'e1', amount: 555, updatedAt: '2026-08-27T09:00:00.000Z' });

    expect(applyRemote([local], [remotoNuevo])[0].amount).toBe(999);
    expect(applyRemote([local], [remotoViejo])[0].amount).toBe(100);
  });

  test('lo cargado en este dispositivo no se pierde al recibir lo remoto', () => {
    const propio = expense({ id: 'mio', concept: 'Cargado acá' });
    const resultado = applyRemote([propio], [expense({ id: 'ajeno' })]);

    expect(resultado.map((e) => e.id).sort()).toEqual(['ajeno', 'mio']);
  });

  test('si nada cambia devuelve la misma lista, para no guardar de más', () => {
    const lista = [expense({ id: 'e1' })];
    expect(applyRemote(lista, [expense({ id: 'e1' })])).toBe(lista);
    expect(applyRemote(lista, [])).toBe(lista);
  });

  test('una baja remota se propaga', () => {
    const resultado = applyRemote(
      [expense({ id: 'e1', updatedAt: '2026-08-27T10:00:00.000Z' })],
      [expense({ id: 'e1', deleted: true, updatedAt: '2026-08-27T11:00:00.000Z' })]
    );

    expect(resultado[0].deleted).toBe(true);
  });
});

describe('withOverlap', () => {
  test('sin marca previa pide todo', () => {
    expect(withOverlap(null)).toBeNull();
  });

  test('retrocede unos segundos para no perder lo que se escribió en el borde', () => {
    const resultado = withOverlap('2026-08-27T12:00:30.000Z');
    expect(resultado).toBe('2026-08-27T12:00:25.000Z');
  });

  test('una marca ilegible se trata como nunca sincronizado', () => {
    expect(withOverlap('cualquier cosa')).toBeNull();
  });
});
