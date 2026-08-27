import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { usePersistedState } from '@/hooks/use-persisted-state';
import { checkHousehold, createHousehold } from '@/lib/sync';

const STORAGE_KEY = '@gastos_gestionados_hogar_v1';

type Household = {
  /** Código secreto que comparten quienes usan el mismo hogar. */
  code: string;
  name: string;
  /** Hora del servidor en la última sincronización, para pedir solo lo nuevo. */
  lastSyncAt: string | null;
};

type HouseholdContextValue = {
  household: Household | null;
  loading: boolean;
  create: (name: string, code: string) => Promise<void>;
  join: (code: string) => Promise<void>;
  leave: () => void;
  rememberSync: (serverTime: string) => void;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const {
    value: household,
    update,
    loading,
  } = usePersistedState<Household | null>(STORAGE_KEY, null);

  const create = useCallback(
    async (name: string, code: string) => {
      await createHousehold(name, code);
      update(() => ({ code, name: name.trim() || 'Mi hogar', lastSyncAt: null }));
    },
    [update]
  );

  const join = useCallback(
    async (code: string) => {
      const name = await checkHousehold(code);
      update(() => ({ code, name, lastSyncAt: null }));
    },
    [update]
  );

  const leave = useCallback(() => update(() => null), [update]);

  const rememberSync = useCallback(
    (serverTime: string) =>
      update((prev) => (prev ? { ...prev, lastSyncAt: serverTime } : prev)),
    [update]
  );

  const value = useMemo(
    () => ({ household, loading, create, join, leave, rememberSync }),
    [household, loading, create, join, leave, rememberSync]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold debe usarse dentro de HouseholdProvider');
  return ctx;
}
