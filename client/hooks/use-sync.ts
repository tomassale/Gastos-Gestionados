import { useCallback, useEffect, useRef, useState } from 'react';

import { useExpenses } from '@/contexts/expenses-context';
import { useHousehold } from '@/contexts/household-context';
import { usePeople } from '@/contexts/people-context';
import { synchronize } from '@/lib/sync';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

/**
 * Empareja el dispositivo con el hogar compartido una vez al abrir la app.
 * Después de eso solo sincroniza a pedido, con el botón de la pantalla del
 * hogar. La app funciona igual sin conexión: lo local es la fuente de verdad.
 */
export function useSync() {
  const { household, loading: loadingHousehold, rememberSync } = useHousehold();
  const { allExpenses, loading: loadingExpenses, mergeRemote: mergeExpenses } = useExpenses();
  const { allPeople, loading: loadingPeople, mergeRemote: mergePeople } = usePeople();

  const [status, setStatus] = useState<SyncStatus>('off');
  const [error, setError] = useState<string | null>(null);

  const running = useRef(false);
  /** Llegó un pedido mientras corría la sincronización anterior. */
  const pending = useRef(false);
  /** Ya se hizo la sincronización de arranque para este hogar. */
  const startedForCode = useRef<string | null>(null);

  const loading = loadingHousehold || loadingExpenses || loadingPeople;
  const code = household?.code ?? null;

  const syncNow = useCallback(async () => {
    if (!code) return;
    if (running.current) {
      // No se pisa la que está en curso: se reintenta apenas termine.
      pending.current = true;
      return;
    }

    running.current = true;
    setStatus('syncing');
    setError(null);

    try {
      const result = await synchronize(
        code,
        allPeople,
        allExpenses,
        household?.lastSyncAt ?? null
      );

      // Se combina sobre el estado del momento, que puede haber cambiado
      // mientras esto viajaba.
      mergePeople(result.people);
      mergeExpenses(result.expenses);

      rememberSync(result.serverTime);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar.');
      setStatus('error');
    } finally {
      running.current = false;
      if (pending.current) {
        pending.current = false;
        void syncNow();
      }
    }
  }, [
    code,
    allPeople,
    allExpenses,
    household?.lastSyncAt,
    mergePeople,
    mergeExpenses,
    rememberSync,
  ]);

  useEffect(() => {
    if (!code) {
      setStatus('off');
      startedForCode.current = null;
      return;
    }
    // Solo la primera vez de cada hogar: los cambios posteriores viajan cuando
    // se toca "Sincronizar ahora" o al volver a abrir la app.
    if (loading || startedForCode.current === code) return;

    startedForCode.current = code;
    void syncNow();
  }, [code, loading, syncNow]);

  return { status, error, syncNow, household };
}
