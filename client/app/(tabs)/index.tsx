import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/expenses/empty-state';
import { ExpenseRow } from '@/components/expenses/expense-row';
import { MonthSwitcher } from '@/components/expenses/month-switcher';
import { PersonFilter } from '@/components/expenses/person-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Amount } from '@/components/ui/amount';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing } from '@/constants/layout';
import { useExpenses } from '@/contexts/expenses-context';
import { usePeople } from '@/contexts/people-context';
import { useLayout } from '@/hooks/use-layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import { filterByMonth, nowYearMonth, totalAmount } from '@/lib/month';
import { filterByPerson, sortByDateDesc } from '@/lib/summary';
import type { Expense } from '@/lib/types';

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useLayout();
  const { expenses, loading } = useExpenses();
  const { people } = usePeople();
  const [month, setMonth] = useState(nowYearMonth);
  const [personId, setPersonId] = useState<string | null>(null);

  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  const monthExpenses = useMemo(() => filterByMonth(expenses, month), [expenses, month]);
  const visible = useMemo(
    () => sortByDateDesc(filterByPerson(monthExpenses, personId)),
    [monthExpenses, personId]
  );
  const total = useMemo(() => totalAmount(visible), [visible]);

  const nameOf = useCallback(
    (id: string) => people.find((p) => p.id === id)?.name,
    [people]
  );

  const payerNames = useCallback(
    (personIds: string[]) => personIds.map(nameOf).filter(Boolean).join(', '),
    [nameOf]
  );

  const openForm = (expense?: Expense) =>
    router.push(
      expense ? { pathname: '/expense-form', params: { id: expense.id } } : '/expense-form'
    );

  if (loading) {
    return (
      <ThemedView style={styles.loader}>
        <ActivityIndicator color={tint} />
      </ThemedView>
    );
  }

  const selectedPersonName = personId ? nameOf(personId) : null;

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          contentWidth,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 96 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.title}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                contentFit="contain"
                accessibilityIgnoresInvertColors
              />
              <ThemedText type="title">Gastos</ThemedText>
            </View>

            <MonthSwitcher value={month} onChange={setMonth} />

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
        renderItem={({ item }) => (
          <ExpenseRow expense={item} personName={payerNames(item.personIds)} onPress={openForm} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            title={selectedPersonName ? `Sin gastos de ${selectedPersonName}` : 'No hay gastos este mes'}
            description="Agregá el primero con el botón +."
          />
        }
      />

      <View style={styles.fabLayer} pointerEvents="box-none">
        <View style={[contentWidth, styles.fabAnchor, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar gasto"
            onPress={() => openForm()}
            style={({ pressed }) => [styles.fab, { backgroundColor: tint, opacity: pressed ? 0.85 : 1 }]}>
            <IconSymbol name="plus" size={28} color={background} />
          </Pressable>
        </View>
      </View>
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
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logo: {
    width: 34,
    height: 34,
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
  separator: {
    height: Spacing.sm,
  },
  // Capa transparente sobre la lista: mantiene el botón alineado con el
  // contenido centrado en vez de pegarlo al borde de la ventana.
  fabLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  fabAnchor: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
