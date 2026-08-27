import type { Expense, Person } from '@/lib/types';

export const UNASSIGNED = 'Sin asignar';

export type PersonTotal = {
  personId: string | null;
  name: string;
  total: number;
  /** Proporción sobre el total del período, entre 0 y 1. */
  share: number;
};

export type Transfer = {
  from: string;
  to: string;
  amount: number;
};

export type Settlement = {
  /** Lo que le habría tocado poner a cada persona si repartían en partes iguales. */
  fairShare: number;
  /** Diferencia de cada persona contra su parte: positivo si puso de más. */
  balances: { name: string; balance: number }[];
  /** Pagos que emparejan las cuentas, del que puso de menos al que puso de más. */
  transfers: Transfer[];
};

/** Redondeo a centavos, para que las diferencias no arrastren coma flotante. */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cuánto puso cada persona. Un gasto pagado entre varias se reparte en partes
 * iguales entre ellas; los que no tienen a nadie quedan aparte, sin dueño.
 */
export function totalsByPerson(expenses: Expense[], people: Person[]): PersonTotal[] {
  const totals = new Map<string | null, number>();
  const add = (key: string | null, amount: number) =>
    totals.set(key, (totals.get(key) ?? 0) + amount);

  for (const expense of expenses) {
    const payers = expense.personIds.filter((id) => people.some((p) => p.id === id));
    if (payers.length === 0) {
      add(null, expense.amount);
      continue;
    }
    const share = expense.amount / payers.length;
    for (const personId of payers) add(personId, share);
  }

  const grandTotal = [...totals.values()].reduce((s, n) => s + n, 0);
  return [...totals.entries()]
    .map(([personId, total]) => ({
      personId,
      name: personId ? (people.find((p) => p.id === personId)?.name ?? UNASSIGNED) : UNASSIGNED,
      total: round(total),
      share: grandTotal === 0 ? 0 : total / grandTotal,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Reparte en partes iguales lo gastado y calcula quién le debe a quién.
 * Solo entran las personas registradas: los gastos sin nadie asignado quedan
 * afuera porque no se sabe quién los puso.
 */
export function settle(expenses: Expense[], people: Person[]): Settlement {
  const totals = totalsByPerson(expenses, people);
  const participants = people.map((person) => ({
    name: person.name,
    paid: totals.find((t) => t.personId === person.id)?.total ?? 0,
  }));

  if (participants.length === 0) {
    return { fairShare: 0, balances: [], transfers: [] };
  }

  const totalPaid = participants.reduce((s, p) => s + p.paid, 0);
  const fairShare = round(totalPaid / participants.length);

  const balances = participants
    .map((p) => ({ name: p.name, balance: round(p.paid - fairShare) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b }));

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = round(Math.min(creditor.balance, -debtor.balance));
    if (amount > 0) {
      transfers.push({ from: debtor.name, to: creditor.name, amount });
      creditor.balance = round(creditor.balance - amount);
      debtor.balance = round(debtor.balance + amount);
    }
    if (creditor.balance <= 0) ci++;
    if (debtor.balance >= 0) di++;
  }

  return { fairShare, balances, transfers };
}
