/** Cuántos dígitos tiene un grupo de miles: "12.500" son doce mil quinientos. */
const THOUSANDS_GROUP = 3;

/**
 * Decide cuál de los separadores es el decimal. El punto es ambiguo: en
 * "1234.56" es decimal, pero en "12.500" separa los miles. Se resuelve por el
 * largo del último grupo, que en miles siempre es de tres dígitos.
 */
function decimalSeparator(value: string): string {
  const hasComma = value.includes(',');
  const hasDot = value.includes('.');

  if (hasComma && hasDot) {
    return value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
  }
  if (hasComma) return ',';
  if (!hasDot) return '';

  const digitsAfterDot = value.length - value.lastIndexOf('.') - 1;
  return digitsAfterDot === THOUSANDS_GROUP ? '' : '.';
}

/**
 * Interpreta montos escritos a mano o traídos de una celda: "1.234,56",
 * "$ 1234.56" o un número. Devuelve null si no hay un número reconocible.
 */
export function parseAmountInput(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;

  const cleaned = v.replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;

  const separator = decimalSeparator(cleaned);
  const normalized = separator
    ? cleaned
        .split(separator)
        .map((part, i) => (i === 0 ? part.replace(/[.,]/g, '') : part))
        .join('.')
    : cleaned.replace(/[.,]/g, '');

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}
