import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

type Updater<T> = (previous: T) => T;

/**
 * Estado que se guarda en el dispositivo. Devuelve `loading` en true hasta
 * terminar la primera lectura, para que la interfaz no muestre una lista vacía
 * antes de tiempo.
 *
 * Los cambios que llegan antes de esa lectura no se pierden ni pisan lo
 * guardado: quedan encolados y se aplican sobre lo que venía del disco.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  /** Adapta lo guardado al formato actual, para datos de versiones anteriores. */
  parse: (raw: unknown) => T = (raw) => raw as T
): { value: T; update: (updater: Updater<T>) => void; loading: boolean } {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  // Se leen por referencia para no re-disparar la carga si cambia la identidad.
  const parseRef = useRef(parse);
  parseRef.current = parse;
  const initialRef = useRef(initialValue);

  const hydrated = useRef(false);
  const pending = useRef<Updater<T>[]>([]);

  const persist = useCallback(
    (next: T) => {
      void AsyncStorage.setItem(key, JSON.stringify(next));
    },
    [key]
  );

  useEffect(() => {
    let cancelled = false;
    hydrated.current = false;

    (async () => {
      let stored = initialRef.current;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw != null) stored = parseRef.current(JSON.parse(raw));
      } catch {
        // Un guardado corrupto no debería impedir usar la app: se arranca vacío.
      }
      if (cancelled) return;

      // Lo que el usuario hizo mientras se leía el disco se aplica encima.
      const queued = pending.current;
      pending.current = [];
      const next = queued.reduce((acc, updater) => updater(acc), stored);

      hydrated.current = true;
      setValue(next);
      if (queued.length > 0) persist(next);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [key, persist]);

  const update = useCallback(
    (updater: Updater<T>) => {
      if (!hydrated.current) {
        // Todavía no sabemos qué hay guardado: no se puede escribir sin pisarlo.
        pending.current.push(updater);
        setValue((previous) => updater(previous));
        return;
      }
      setValue((previous) => {
        const next = updater(previous);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { value, update, loading };
}
