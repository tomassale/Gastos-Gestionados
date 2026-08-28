import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/expenses/empty-state';
import { ExpenseList } from '@/components/expenses/expense-list';
import { MonthSwitcher } from '@/components/expenses/month-switcher';
import { PersonFilter } from '@/components/expenses/person-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Amount } from '@/components/ui/amount';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/layout';
import { useExpenses } from '@/contexts/expenses-context';
import { usePeople } from '@/contexts/people-context';
import { useLayout } from '@/hooks/use-layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import { filterByMonth, nowYearMonth, shiftMonth, totalAmount } from '@/lib/month';
import { filterByPerson, sortByDateDesc } from '@/lib/summary';
import { earliestKeptMonth, RETENTION_YEARS } from '@/lib/retention';
import type { Expense } from '@/lib/types';

/**
 * Los meses ya cerrados. Arranca en el anterior y no deja avanzar hasta el
 * actual: ese tiene su propia pantalla, y mezclarlos haría que el mismo gasto
 * apareciera en dos lugares con el mismo aspecto.
 */
export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useLayout();
  const { expenses, loading } = useExpenses();
  const { people } = usePeople();

  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  const lastClosedMonth = useMemo(() => shiftMonth(nowYearMonth(), -1), []);
  const oldestMonth = useMemo(() => earliestKeptMonth(), []);
  const [month, setMonth] = useState(lastClosedMonth);
  const [personId, setPersonId] = useState<string | null>(null);

  const monthExpenses = useMemo(() => filterByMonth(expenses, month), [expenses, month]);
  const visible = useMemo(
    () => sortByDateDesc(filterByPerson(monthExpenses, personId)),
    [monthExpenses, personId]
  );
  const total = useMemo(() => totalAmount(visible), [visible]);

  const openForm = (expense: Expense) =>
    router.push({ pathname: '/expense-form', params: { id: expense.id } });

  if (loading) {
    return (
      <ThemedView style={styles.loader}>
        <ActivityIndicator color={tint} />
      </ThemedView>
    );
  }

  const selectedPersonName = personId ? people.find((p) => p.id === personId)?.name : null;

  return (
    <ThemedView style={styles.container}>
      <ExpenseList
        expenses={visible}
        people={people}
        onPressExpense={openForm}
        contentContainerStyle={[
          styles.list,
          contentWidth,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        header={
          <View style={styles.header}>
            <ScreenHeader title="Historial" subtitle="Los meses anteriores a este." />

            <MonthSwitcher
              value={month}
              onChange={setMonth}
              max={lastClosedMonth}
              min={oldestMonth}
            />

            <Card style={styles.totalCard}>
              <ThemedText style={[styles.label, { color: muted }]}>
                {selectedPersonName ? `Total de ${selectedPersonName}` : 'Total del mes'}
              </ThemedText>
              <Amount value={total} variant="display" />
              <ThemedText style={{ color: muted }}>
                {visible.length === 1 ? '1 gasto registrado' : `${visible.length} gastos registrados`}
              </ThemedText>
            </Card>

            <PersonFilter people={people} selected={personId} onSelect={setPersonId} />
          </View>
        }
        empty={
          <EmptyState
            title={
              selectedPersonName ? `Sin gastos de ${selectedPersonName}` : 'No hay gastos ese mes'
            }
            description={`Movete entre meses con las flechas. Se guardan ${RETENTION_YEARS} años hacia atrás.`}
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  totalCard: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
