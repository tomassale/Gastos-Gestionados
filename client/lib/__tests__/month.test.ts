import { describe, expect, test } from 'bun:test';

import { compareMonths, shiftMonth } from '@/lib/month';

describe('shiftMonth', () => {
  test('avanza y retrocede dentro del año', () => {
    expect(shiftMonth({ year: 2026, month: 8 }, 1)).toEqual({ year: 2026, month: 9 });
    expect(shiftMonth({ year: 2026, month: 8 }, -1)).toEqual({ year: 2026, month: 7 });
  });

  test('cruza el fin de año', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('compareMonths', () => {
  test('ordena por año antes que por mes', () => {
    expect(compareMonths({ year: 2025, month: 12 }, { year: 2026, month: 1 })).toBeLessThan(0);
    expect(compareMonths({ year: 2026, month: 1 }, { year: 2025, month: 12 })).toBeGreaterThan(0);
  });

  test('el mismo mes da cero', () => {
    expect(compareMonths({ year: 2026, month: 8 }, { year: 2026, month: 8 })).toBe(0);
  });

  test('el historial no deja pasar del último mes cerrado', () => {
    const actual = { year: 2026, month: 8 };
    const ultimoCerrado = shiftMonth(actual, -1);
    // Es la comprobación que hace MonthSwitcher para apagar la flecha.
    expect(compareMonths(shiftMonth(ultimoCerrado, 1), ultimoCerrado)).toBeGreaterThan(0);
    expect(compareMonths(ultimoCerrado, ultimoCerrado)).toBe(0);
  });
});
