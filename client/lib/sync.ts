import { isBeyondRetention, retentionCutoff } from '@/lib/retention';
import { rpc } from '@/lib/supabase';
import { isExpiredTombstone } from '@/lib/tombstones';
import type { Expense, Person, Syncable } from '@/lib/types';

type RemotePerson = {
  id: string;
  name: string;
  deleted: boolean;
  updated_at: string;
};

type RemoteExpense = {
  id: string;
  date: string;
  concept: string;
  amount: string | number;
  category: string | null;
  person_ids: string[];
  deleted: boolean;
  updated_at: string;
};

type PullResponse = {
  server_time: string;
  people: RemotePerson[];
  expenses: RemoteExpense[];
};

export type SyncResult = {
  /** Lo que vino del servidor, sin combinar: lo combina cada contexto sobre su estado actual. */
  people: Person[];
  expenses: Expense[];
  serverTime: string;
};

function toPerson(remote: RemotePerson): Person {
  return {
    id: remote.id,
    name: remote.name,
    deleted: remote.deleted,
    updatedAt: remote.updated_at,
  };
}

function toExpense(remote: RemoteExpense): Expense {
  return {
    id: remote.id,
    date: remote.date,
    concept: remote.concept,
    amount: Number(remote.amount),
    category: remote.category ?? undefined,
    personIds: remote.person_ids ?? [],
    deleted: remote.deleted,
    updatedAt: remote.updated_at,
  };
}

function fromPerson(person: Person): RemotePerson {
  return {
    id: person.id,
    name: person.name,
    deleted: Boolean(person.deleted),
    updated_at: person.updatedAt,
  };
}

function fromExpense(expense: Expense): RemoteExpense {
  return {
    id: expense.id,
    date: expense.date,
    concept: expense.concept,
    amount: expense.amount,
    category: expense.category ?? null,
    person_ids: expense.personIds,
    deleted: Boolean(expense.deleted),
    updated_at: expense.updatedAt,
  };
}

/**
 * Aplica lo que vino del servidor sobre lo que hay ahora: ante el mismo
 * registro gana la modificación más reciente. Si nada cambia devuelve la misma
 * lista, para no guardar ni redibujar de más.
 *
 * Es importante que se aplique sobre el estado del momento y no sobre una foto
 * previa: si no, lo que el usuario cargue mientras se sincroniza se pierde.
 */
export function applyRemote<T extends Syncable & { id: string }>(current: T[], remote: T[]): T[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  let changed = false;

  for (const incoming of remote) {
    // Una marca de borrado vencida no se guarda: ya cumplió su función.
    if (isExpiredTombstone(incoming) && !byId.has(incoming.id)) continue;

    const mine = byId.get(incoming.id);
    if (!mine || incoming.updatedAt > mine.updatedAt) {
      byId.set(incoming.id, incoming);
      changed = true;
    }
  }

  return changed ? [...byId.values()] : current;
}

export async function createHousehold(name: string, code: string): Promise<void> {
  await rpc<string>('create_household', { p_name: name, p_code: code });
}

/** Devuelve el nombre del hogar si el código es correcto. */
export async function checkHousehold(code: string): Promise<string> {
  return rpc<string>('check_household', { p_code: code });
}

/** Lo que este dispositivo tiene para subir al hogar. */
export type LocalChanges = {
  people: Person[];
  expenses: Expense[];
};

/**
 * Lo modificado en este dispositivo desde la última subida confirmada. Sin este
 * corte, editar un solo gasto vuelve a mandar el historial entero y el servidor
 * reescribe todas las filas para dejarlas igual que estaban.
 *
 * `since` vacío significa que no hay nada confirmado todavía —hogar recién
 * creado o recién unido— y entonces sube todo, que es lo correcto.
 */
export function changesSince(
  people: Person[],
  expenses: Expense[],
  since: string
): LocalChanges {
  return {
    people: people.filter((p) => p.updatedAt > since),
    expenses: expenses.filter((e) => e.updatedAt > since),
  };
}

/**
 * Hasta dónde llega lo que se subió. Sale del propio contenido y no del reloj:
 * si algo se cargó mientras se armaba el envío y no llegó a entrar, su marca
 * queda por encima de esta y viaja en la próxima subida, en vez de quedar del
 * lado de lo ya confirmado y no salir nunca.
 */
export function highWaterMark(changes: LocalChanges, since: string): string {
  let mark = since;
  for (const person of changes.people) if (person.updatedAt > mark) mark = person.updatedAt;
  for (const expense of changes.expenses) if (expense.updatedAt > mark) mark = expense.updatedAt;
  return mark;
}

/**
 * Cuánto se retrocede sobre la marca del servidor al pedir novedades. El
 * servidor calcula esa marca al empezar a leer, así que una escritura de otro
 * dispositivo que se confirme un instante después queda del lado viejo del
 * corte y no llegaría nunca. El margen la vuelve a incluir: el precio es
 * recibir de nuevo unos pocos registros que ya teníamos.
 */
const OVERLAP_SECONDS = 5;

export function withOverlap(since: string | null): string | null {
  if (!since) return null;
  const time = Date.parse(since);
  // Una marca ilegible se trata como "nunca sincronizado": mejor traer de más.
  if (Number.isNaN(time)) return null;
  return new Date(time - OVERLAP_SECONDS * 1000).toISOString();
}

/**
 * Sube lo local y baja lo remoto en una pasada. Devuelve lo que vino del
 * servidor, sin combinar: lo combina cada contexto sobre su estado actual.
 *
 * `changes` en null significa que este dispositivo no cambió nada desde la
 * última subida, y entonces se ahorra el viaje de ida: es el caso de la
 * consulta periódica, que solo va a buscar lo que hicieron los demás.
 */
export async function synchronize(
  code: string,
  changes: LocalChanges | null,
  since: string | null
): Promise<SyncResult> {
  // Una sola vez por sincronización: como argumento por omisión se recalcularía
  // por cada gasto, y son dos formateos de fecha cada uno.
  const cutoff = retentionCutoff();

  if (changes) {
    await rpc<{ server_time: string }>('push_changes', {
      p_code: code,
      p_people: changes.people.map(fromPerson),
      // Los que ya cumplieron el plazo no se vuelven a subir: si no, resucitan.
      p_expenses: changes.expenses.filter((e) => !isBeyondRetention(e, cutoff)).map(fromExpense),
    });
  }

  const pulled = await rpc<PullResponse>('pull_changes', {
    p_code: code,
    p_since: withOverlap(since),
  });

  return {
    people: pulled.people.map(toPerson),
    expenses: pulled.expenses.map(toExpense).filter((e) => !isBeyondRetention(e, cutoff)),
    serverTime: pulled.server_time,
  };
}
