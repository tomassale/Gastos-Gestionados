import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/expenses/balance-card';
import { CategoryBar } from '@/components/expenses/category-bar';
import { EmptyState } from '@/components/expenses/empty-state';
import { MonthSwitcher } from '@/components/expenses/month-switcher';
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
import { settle } from '@/lib/balance';
import { formatCurrency } from '@/lib/format';
import { filterByMonth, nowYearMonth, totalAmount } from '@/lib/month';
import { earliestKeptMonth, RETENTION_YEARS } from '@/lib/retention';
import { averageAmount, totalsByCategory } from '@/lib/summary';

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { isWide, isNarrow, wideContentWidth } = useLayout();
  const { expenses } = useExpenses();
  const { people } = usePeople();
  const currentMonth = useMemo(nowYearMonth, []);
  const oldestMonth = useMemo(() => earliestKeptMonth(), []);
  const [month, setMonth] = useState(currentMonth);

  const muted = useThemeColor({}, 'muted');

  const monthExpenses = useMemo(() => filterByMonth(expenses, month), [expenses, month]);
  const total = useMemo(() => totalAmount(monthExpenses), [monthExpenses]);
  const average = useMemo(() => averageAmount(monthExpenses), [monthExpenses]);
  const categories = useMemo(() => totalsByCategory(monthExpenses), [monthExpenses]);
  const settlement = useMemo(() => settle(monthExpenses, people), [monthExpenses, people]);
  const savedTotal = useMemo(() => totalAmount(expenses), [expenses]);

  const hasPeople = people.length > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          wideContentWidth,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl },
        ]}>
        <ScreenHeader title="Resumen" />

        <MonthSwitcher value={month} onChange={setMonth} max={currentMonth} min={oldestMonth} />

        <View style={[styles.stats, isNarrow && styles.stacked]}>
          <Card style={styles.stat}>
            <ThemedText style={[styles.label, { color: muted }]}>Total</ThemedText>
            <Amount value={total} variant="display" />
          </Card>
          <Card style={styles.stat}>
            <ThemedText style={[styles.label, { color: muted }]}>Promedio</ThemedText>
            <Amount value={average} variant="display" />
          </Card>
        </View>

        <View style={[styles.columns, isWide && styles.columnsWide]}>
          <View style={styles.column}>
            <Card>
              <ThemedText type="subtitle">Por categoría</ThemedText>
              {categories.length === 0 ? (
                <EmptyState
                  title="Sin datos para este mes"
                  description="Cargá gastos o cambiá de mes para ver el desglose."
                />
              ) : (
                categories.map((item) => <CategoryBar key={item.category} item={item} />)
              )}
            </Card>
          </View>

          <View style={styles.column}>
            {hasPeople ? <BalanceCard settlement={settlement} /> : null}
          </View>
        </View>

        <ThemedText style={[styles.hint, { color: muted }]}>
          {expenses.length === 1
            ? `1 gasto guardado, ${formatCurrency(savedTotal)} en total.`
            : `${expenses.length} gastos guardados, ${formatCurrency(savedTotal)} en total.`}
          {` Los de más de ${RETENTION_YEARS} años se borran solos, acá y en el hogar compartido.`}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stacked: {
    flexDirection: 'column',
  },
  stat: {
    flex: 1,
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  columns: {
    gap: Spacing.md,
  },
  columnsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    gap: Spacing.md,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
