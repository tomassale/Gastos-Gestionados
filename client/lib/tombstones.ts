import type { Syncable } from '@/lib/types';

/**
 * Cuánto se conserva la marca de un registro borrado antes de olvidarla.
 *
 * La marca existe para avisarle a los otros dispositivos que algo se borró: si
 * se tira antes de que se enteren, el registro reaparece cuando ese dispositivo
 * vuelva a sincronizar. Noventa días es más de lo que puede estar un teléfono
 * sin abrir la app, y a la vez evita que lo borrado se acumule para siempre.
 */
export const TOMBSTONE_TTL_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isExpiredTombstone(item: Syncable, now: number = Date.now()): boolean {
  if (!item.deleted) return false;
  const deletedAt = Date.parse(item.updatedAt);
  if (Number.isNaN(deletedAt)) return true;
  return now - deletedAt > TOMBSTONE_TTL_DAYS * DAY_MS;
}

/** Saca las marcas de borrado que ya cumplieron su función. */
export function pruneTombstones<T extends Syncable>(list: T[], now: number = Date.now()): T[] {
  const kept = list.filter((item) => !isExpiredTombstone(item, now));
  return kept.length === list.length ? list : kept;
}
