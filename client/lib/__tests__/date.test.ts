import { describe, expect, test } from 'bun:test';

import { isValidYMD, parseDateInput } from '@/lib/date';

describe('parseDateInput', () => {
  test('deja pasar el formato ISO', () => {
    expect(parseDateInput('2026-08-27')).toBe('2026-08-27');
    expect(parseDateInput('2026-08-27T15:30:00Z')).toBe('2026-08-27');
  });

  test('entiende el formato de acá, día primero', () => {
    expect(parseDateInput('27/08/2026')).toBe('2026-08-27');
    expect(parseDateInput('5/3/2026')).toBe('2026-03-05');
    expect(parseDateInput('27-08-2026')).toBe('2026-08-27');
  });

  test('completa los años de dos dígitos', () => {
    expect(parseDateInput('27/08/26')).toBe('2026-08-27');
  });

  test('acepta objetos Date', () => {
    expect(parseDateInput(new Date(Date.UTC(2026, 7, 27)))).toBe('2026-08-27');
  });

  test('devuelve null cuando no hay fecha', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput('cualquier cosa')).toBeNull();
    expect(parseDateInput(45000)).toBeNull();
  });
});

describe('isValidYMD', () => {
  test('acepta fechas que existen', () => {
    expect(isValidYMD('2026-08-27')).toBe(true);
    expect(isValidYMD('2024-02-29')).toBe(true); // bisiesto
  });

  test('rechaza fechas imposibles', () => {
    expect(isValidYMD('2026-02-30')).toBe(false);
    expect(isValidYMD('2025-02-29')).toBe(false); // no bisiesto
    expect(isValidYMD('2026-13-01')).toBe(false);
    expect(isValidYMD('27/08/2026')).toBe(false);
    expect(isValidYMD('')).toBe(false);
  });
});
