import React, { createContext, useContext } from 'react';

import { useSyncEngine, type SyncEngine } from '@/hooks/use-sync';

const SyncContext = createContext<SyncEngine | null>(null);

/**
 * Deja andando la sincronización mientras la app está abierta, sin importar en
 * qué pantalla esté el usuario. Va acá y no en cada pantalla porque tiene que
 * haber un solo motor: dos harían el doble de llamadas y podrían pisarse.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const engine = useSyncEngine();
  return <SyncContext.Provider value={engine}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync debe usarse dentro de SyncProvider');
  return ctx;
}
