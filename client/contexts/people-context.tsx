import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { usePersistedState } from '@/hooks/use-persisted-state';
import { applyRemote } from '@/lib/sync';
import { pruneTombstones } from '@/lib/tombstones';
import type { Person } from '@/lib/types';
import { isVisible, normalizePerson, now, personIdFor } from '@/lib/types';

const STORAGE_KEY = '@gastos_gestionados_personas_v1';

type PeopleContextValue = {
  /** Las personas que la interfaz muestra: sin las dadas de baja. */
  people: Person[];
  /** Incluye las bajas, que hacen falta para sincronizar. */
  allPeople: Person[];
  loading: boolean;
  addPerson: (name: string) => Person | null;
  /** Devuelve la persona con ese nombre y la crea si todavía no existe. */
  ensurePerson: (name: string) => Person | null;
  renamePerson: (id: string, name: string) => void;
  removePerson: (id: string) => void;
  /** Combina lo que vino del hogar compartido con lo que hay en el dispositivo. */
  mergeRemote: (remote: Person[]) => void;
};

const PeopleContext = createContext<PeopleContextValue | null>(null);

function sameName(a: string, b: string): boolean {
  return a.trim().localeCompare(b.trim(), 'es', { sensitivity: 'base' }) === 0;
}

function migrate(raw: unknown): Person[] {
  if (!Array.isArray(raw)) return [];
  return pruneTombstones(raw.map(normalizePerson));
}

export function PeopleProvider({ children }: { children: React.ReactNode }) {
  const {
    value: allPeople,
    update,
    loading,
  } = usePersistedState<Person[]>(STORAGE_KEY, [], migrate);

  const people = useMemo(() => allPeople.filter(isVisible), [allPeople]);

  const addPerson = useCallback(
    (name: string): Person | null => {
      const clean = name.trim();
      if (!clean) return null;

      const existing = people.find((p) => sameName(p.name, clean));
      if (existing) return existing;

      const person: Person = { id: personIdFor(clean), name: clean, updatedAt: now() };
      update((prev) => [...prev, person]);
      return person;
    },
    [people, update]
  );

  const renamePerson = useCallback(
    (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      update((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: clean, updatedAt: now() } : p))
      );
    },
    [update]
  );

  const removePerson = useCallback(
    (id: string) =>
      update((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deleted: true, updatedAt: now() } : p))
      ),
    [update]
  );

  const mergeRemote = useCallback(
    (remote: Person[]) => update((prev) => applyRemote(prev, remote)),
    [update]
  );

  const value = useMemo(
    () => ({
      people,
      allPeople,
      loading,
      addPerson,
      ensurePerson: addPerson,
      renamePerson,
      removePerson,
      mergeRemote,
    }),
    [people, allPeople, loading, addPerson, renamePerson, removePerson, mergeRemote]
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople() {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople debe usarse dentro de PeopleProvider');
  return ctx;
}
