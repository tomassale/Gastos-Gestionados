/**
 * Normaliza a YYYY-MM-DD lo que escriba el usuario: ISO, DD/MM/AAAA o un Date.
 */
export function parseDateInput(v: unknown): string | null {
  if (v == null || v === '' || typeof v === 'number') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

/** @param date en formato YYYY-MM-DD */
export function isValidYMD(date: string): boolean {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const parsed = new Date(y, mo - 1, d);
  return (
    parsed.getFullYear() === y && parsed.getMonth() === mo - 1 && parsed.getDate() === d
  );
}
