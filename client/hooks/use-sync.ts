import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useExpenses } from '@/contexts/expenses-context';
import { useHousehold } from '@/contexts/household-context';
import { usePeople } from '@/contexts/people-context';
import { changesSince, highWaterMark, synchronize } from '@/lib/sync';

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
 * Techo del espaciado entre reintentos. Sin conexión, insistir cada 20 segundos
 * es despertar la radio 180 veces por hora para nada; cinco minutos alcanza
 * para retomar solo cuando la conexión vuelve sin gastar batería mientras tanto.
 */
const MAX_POLL_MS = 5 * 60_000;

/**
 * Mantiene el dispositivo al día con el hogar compartido mientras la app está
 * abierta: sube lo que se carga acá apenas se carga, y baja lo que cargan los
 * demás cada pocos segundos. La app sigue funcionando sin conexión, porque lo
 * local es la fuente de verdad y lo que no pudo viajar queda pendiente.
 *
 * Corre una sola vez en toda la app: lo comparte `SyncProvider`.
 */
export function useSyncEngine(): SyncEngine {
  const { household, loading: loadingHousehold, rememberSync, rememberPush } = useHousehold();
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
  /** Fallos seguidos, para ir espaciando los reintentos. */
  const [failures, setFailures] = useState(0);

  const running = useRef(false);
  /** Ya se hizo la sincronización de arranque para este hogar. */
  const startedForCode = useRef<string | null>(null);

  const loading = loadingHousehold || loadingExpenses || loadingPeople;
  const code = household?.code ?? null;
  const lastPushAt = household?.lastPushAt ?? '';

  /** Cuántas veces cambiaron los datos por acción del usuario en este dispositivo. */
  const revision = peopleRevision + expensesRevision;
  /**
   * La última revisión que llegó al hogar. Es estado y no solo una referencia
   * porque la interfaz lo muestra: mutar una referencia no vuelve a dibujar, y
   * el cartel de "hay cambios sin subir" quedaría pegado.
   */
  const [synced, setSynced] = useState(0);
  const syncedRef = useRef(0);

  // Los efectos leen la revisión del momento, no la del render que los creó.
  const revisionRef = useRef(revision);
  revisionRef.current = revision;

  const hasPendingChanges = revision !== synced;

  const syncNow = useCallback(async () => {
    if (!code || running.current) return;

    // Se captura antes de salir: lo que se cargue durante el viaje queda para
    // la vuelta, no se da por subido.
    const sending = revisionRef.current;
    const changes =
      sending === syncedRef.current ? null : changesSince(allPeople, allExpenses, lastPushAt);

    running.current = true;
    setStatus('syncing');
    setError(null);

    try {
      const result = await synchronize(code, changes, household?.lastSyncAt ?? null);

      // Se combina sobre el estado del momento, que puede haber cambiado
      // mientras esto viajaba.
      mergePeople(result.people);
      mergeExpenses(result.expenses);

      if (changes) rememberPush(highWaterMark(changes, lastPushAt));
      syncedRef.current = sending;
      setSynced(sending);
      rememberSync(result.serverTime);
      setStatus('idle');
      setFailures(0);
    } catch (e) {
      // No se reintenta en el acto: sin conexión sería un bucle. Espera a la
      // próxima consulta periódica, que además se va espaciando.
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar.');
      setStatus('error');
      setFailures((n) => n + 1);
    } finally {
      running.current = false;
    }
  }, [
    code,
    allPeople,
    allExpenses,
    lastPushAt,
    household?.lastSyncAt,
    mergePeople,
    mergeExpenses,
    rememberSync,
    rememberPush,
  ]);

  // Los temporizadores disparan siempre la última versión, sin reiniciarse cada
  // vez que cambia un gasto.
  const latest = useRef(syncNow);
  latest.current = syncNow;

  useEffect(() => {
    if (!code) {
      setStatus('off');
      startedForCode.current = null;
      syncedRef.current = 0;
      setSynced(0);
      setFailures(0);
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
    if (!code || loading || revision === synced) return;
    // Sin conexión no se insiste cada segundo: lo levanta la consulta periódica.
    if (status === 'syncing' || status === 'error') return;

    const timer = setTimeout(() => void latest.current(), PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code, loading, revision, synced, status]);

  // Trae lo que cargaron los demás. Con la conexión sana `failures` es cero y el
  // intervalo es el de siempre; cada fallo seguido lo duplica hasta el techo.
  useEffect(() => {
    if (!code || loading || !foreground) return;

    const delay = Math.min(POLL_INTERVAL_MS * 2 ** Math.min(failures, 4), MAX_POLL_MS);
    const timer = setInterval(() => void latest.current(), delay);
    return () => clearInterval(timer);
  }, [code, loading, foreground, failures]);

  useEffect(() => {
    if (!code) return;

    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setForeground(active);
      // Al volver, para ponerse al día de una; al irse, para no dejar lo
      // cargado esperando a la próxima apertura.
      if (active || revisionRef.current !== syncedRef.current) void latest.current();
    });

    return () => subscription.remove();
  }, [code]);

  return { status, error, syncNow, hasPendingChanges };
}
