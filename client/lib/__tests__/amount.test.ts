import { describe, expect, test } from 'bun:test';

import { parseAmountInput } from '@/lib/amount';

describe('parseAmountInput', () => {
  test('acepta números tal cual', () => {
    expect(parseAmountInput(1234.56)).toBe(1234.56);
    expect(parseAmountInput(0)).toBe(0);
  });

  test('entiende el formato argentino, con punto de miles y coma decimal', () => {
    expect(parseAmountInput('1.234,56')).toBe(1234.56);
    expect(parseAmountInput('12.500')).toBe(12500);
    expect(parseAmountInput('1.234.567,89')).toBe(1234567.89);
  });

  test('un punto seguido de tres dígitos separa miles, no decimales', () => {
    // Este caso guardaba mil veces menos: "12.500" se leía como 12,5.
    expect(parseAmountInput('12.500')).toBe(12500);
    expect(parseAmountInput('1.000')).toBe(1000);
    expect(parseAmountInput('1.234.567')).toBe(1234567);
  });

  test('un punto con otra cantidad de dígitos es decimal', () => {
    expect(parseAmountInput('12.5')).toBe(12.5);
    expect(parseAmountInput('1234.56')).toBe(1234.56);
    expect(parseAmountInput('8500.1234')).toBe(8500.1234);
  });

  test('entiende el formato con coma de miles y punto decimal', () => {
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
    expect(parseAmountInput('1234.56')).toBe(1234.56);
  });

  test('ignora símbolos y espacios', () => {
    expect(parseAmountInput('$ 12.500,00')).toBe(12500);
    expect(parseAmountInput('  7 777  ')).toBe(7777);
    expect(parseAmountInput('ARS 1.000')).toBe(1000);
  });

  test('soporta negativos', () => {
    expect(parseAmountInput('-1.500,50')).toBe(-1500.5);
  });

  test('devuelve null cuando no hay número', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput(null)).toBeNull();
    expect(parseAmountInput(undefined)).toBeNull();
    expect(parseAmountInput(NaN)).toBeNull();
  });
});
