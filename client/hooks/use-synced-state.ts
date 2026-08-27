import { useCallback, useState } from 'react';

import { usePersistedState } from '@/hooks/use-persisted-state';

type Updater<T> = (previous: T) => T;

/**
 * Estado guardado en el dispositivo que además distingue quién lo cambió: lo
 * que edita el usuario queda pendiente de subir al hogar, y lo que llega del
 * hogar ya está allá y no tiene que volver a viajar.
 *
 * Sin esa distinción cada bajada contaría como cambio y la app se pasaría
 * subiendo lo que acababa de recibir.
 */
export function useSyncedState<T>(
  key: string,
  initialValue: T,
  parse?: (raw: unknown) => T
): {
  value: T;
  /** Cambio hecho en este dispositivo: cuenta para subir. */
  update: (updater: Updater<T>) => void;
  /** Cambio que vino del hogar: se guarda, pero no se vuelve a subir. */
  updateFromRemote: (updater: Updater<T>) => void;
  /** Cuántas veces cambió por acción del usuario. Sirve para saber qué falta subir. */
  localRevision: number;
  loading: boolean;
} {
  const { value, update, loading } = usePersistedState<T>(key, initialValue, parse);
  const [localRevision, setLocalRevision] = useState(0);

  const updateLocal = useCallback(
    (updater: Updater<T>) => {
      update(updater);
      setLocalRevision((previous) => previous + 1);
    },
    [update]
  );

  return { value, update: updateLocal, updateFromRemote: update, localRevision, loading };
}
