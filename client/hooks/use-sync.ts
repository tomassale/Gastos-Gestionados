import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useExpenses } from '@/contexts/expenses-context';
import { useHousehold } from '@/contexts/household-context';
import { usePeople } from '@/contexts/people-context';
import { synchronize } from '@/lib/sync';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

export type SyncEngine = {
  status: SyncStatus;
  error: string | null;
  /** Sincroniza a pedido. Los cambios viajan solos igual; esto es el atajo manual. */
  syncNow: () => Promise<void>;
  /** Hay cambios de este dispositivo que todavía no llegaron al hogar. */
  hasPendingChanges: boolean;
};

/**
 * Se espera este rato tras un cambio antes de subirlo, para que una ráfaga de
 * ediciones viaje en una sola llamada en vez de una por tecla.
 */
const PUSH_DELAY_MS = 1_500;

/**
 * Cada cuánto se pregunta por novedades ajenas con la app a la vista. Es lo que
 * tarda como mucho en aparecer acá un gasto que cargó otro dispositivo.
 */
const POLL_INTERVAL_MS = 20_000;

/**
 * Mantiene el dispositivo al día con el hogar compartido mientras la app está
 * abierta: sube lo que se carga acá apenas se carga, y baja lo que cargan los
 * demás cada pocos segundos. La app sigue funcionando sin conexión, porque lo
 * local es la fuente de verdad y lo que no pudo viajar queda pendiente.
 *
 * Corre una sola vez en toda la app: lo comparte `SyncProvider`.
 */
export function useSyncEngine(): SyncEngine {
  const { household, loading: loadingHousehold, rememberSync } = useHousehold();
  const {
    allExpenses,
    loading: loadingExpenses,
    localRevision: expensesRevision,
    mergeRemote: mergeExpenses,
  } = useExpenses();
  const {
    allPeople,
    loading: loadingPeople,
    localRevision: peopleRevision,
    mergeRemote: mergePeople,
  } = usePeople();

  const [status, setStatus] = useState<SyncStatus>('off');
  const [error, setError] = useState<string | null>(null);
  /** La app está a la vista: fuera de la pantalla no tiene sentido consultar. */
  const [foreground, setForeground] = useState(true);

  const running = useRef(false);
  /** Ya se hizo la sincronización de arranque para este hogar. */
  const startedForCode = useRef<string | null>(null);

  const loading = loadingHousehold || loadingExpenses || loadingPeople;
  const code = household?.code ?? null;

  /** Cuántas veces cambiaron los datos por acción del usuario en este dispositivo. */
  const revision = peopleRevision + expensesRevision;
  /** La última revisión que llegó al hogar. */
  const synced = useRef(0);

  // Los efectos leen la revisión del momento, no la del render que los creó.
  const revisionRef = useRef(revision);
  revisionRef.current = revision;

  const hasPendingChanges = revision !== synced.current;

  const syncNow = useCallback(async () => {
    if (!code || running.current) return;

    // Se captura antes de salir: lo que se cargue durante el viaje queda para
    // la vuelta, no se da por subido.
    const sending = revisionRef.current;
    const changes =
      sending === synced.current ? null : { people: allPeople, expenses: allExpenses };

    running.current = true;
    setStatus('syncing');
    setError(null);

    try {
      const result = await synchronize(code, changes, household?.lastSyncAt ?? null);

      // Se combina sobre el estado del momento, que puede haber cambiado
      // mientras esto viajaba.
      mergePeople(result.people);
      mergeExpenses(result.expenses);

      synced.current = sending;
      rememberSync(result.serverTime);
      setStatus('idle');
    } catch (e) {
      // No se reintenta en el acto: sin conexión sería un bucle. Espera a la
      // próxima consulta periódica o al próximo cambio.
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar.');
      setStatus('error');
    } finally {
      running.current = false;
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

  // Los temporizadores disparan siempre la última versión, sin reiniciarse cada
  // vez que cambia un gasto.
  const latest = useRef(syncNow);
  latest.current = syncNow;

  useEffect(() => {
    if (!code) {
      setStatus('off');
      startedForCode.current = null;
      synced.current = 0;
      return;
    }
    if (loading || startedForCode.current === code) return;

    startedForCode.current = code;
    void latest.current();
  }, [code, loading]);

  // Sube lo que se acaba de cargar, agrupando la ráfaga de ediciones. Depende
  // del estado porque al terminar una sincronización hay que volver a mirar:
  // puede haber quedado pendiente lo que se cargó mientras esa viajaba.
  useEffect(() => {
    if (!code || loading || revision === synced.current) return;
    // Sin conexión no se insiste cada segundo: lo levanta la consulta periódica.
    if (status === 'syncing' || status === 'error') return;

    const timer = setTimeout(() => void latest.current(), PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code, loading, revision, status]);

  // Trae lo que cargaron los demás.
  useEffect(() => {
    if (!code || loading || !foreground) return;

    const timer = setInterval(() => void latest.current(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [code, loading, foreground]);

  useEffect(() => {
    if (!code) return;

    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setForeground(active);
      // Al volver, para ponerse al día de una; al irse, para no dejar lo
      // cargado esperando a la próxima apertura.
      if (active || revisionRef.current !== synced.current) void latest.current();
    });

    return () => subscription.remove();
  }, [code]);

  return { status, error, syncNow, hasPendingChanges };
}
