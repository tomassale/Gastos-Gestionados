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
  /** Lo último que llegó al disco, para no reescribir lo que ya está guardado. */
  const persisted = useRef<T | null>(null);

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

      // Lo que vino del disco ya está en el disco: si nada se encoló, el efecto
      // de guardado no tiene que devolverlo.
      persisted.current = stored;
      hydrated.current = true;
      setValue(next);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  /**
   * El guardado va en un efecto y no dentro del updater de `setValue`: React
   * puede llamar a ese updater más de una vez por render, así que tiene que ser
   * puro. Escribir ahí adentro duplica la escritura.
   */
  useEffect(() => {
    // La sincronización periódica trae listas iguales a las que ya hay: si el
    // estado no cambió de identidad, guardarlo sería puro desgaste del disco.
    if (!hydrated.current || value === persisted.current) return;

    persisted.current = value;
    void AsyncStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  const update = useCallback((updater: Updater<T>) => {
    if (!hydrated.current) {
      // Todavía no sabemos qué hay guardado: no se puede escribir sin pisarlo.
      pending.current.push(updater);
    }
    setValue((previous) => updater(previous));
  }, []);

  return { value, update, loading };
}
