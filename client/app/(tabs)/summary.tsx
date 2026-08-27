import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/expenses/balance-card';
import { CategoryBar } from '@/components/expenses/category-bar';
import { EmptyState } from '@/components/expenses/empty-state';
import { MonthSwitcher } from '@/components/expenses/month-switcher';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionButton } from '@/components/ui/action-button';
import { Amount } from '@/components/ui/amount';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/layout';
import { useExpenses } from '@/contexts/expenses-context';
import { usePeople } from '@/contexts/people-context';
import { useLayout } from '@/hooks/use-layout';
import { useSync } from '@/hooks/use-sync';
import { useThemeColor } from '@/hooks/use-theme-color';
import { settle, totalsByPerson } from '@/lib/balance';
import { formatCurrency } from '@/lib/format';
import { filterByMonth, nowYearMonth, totalAmount } from '@/lib/month';
import { RETENTION_YEARS } from '@/lib/retention';
import { averageAmount, totalsByCategory } from '@/lib/summary';

export default function SummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWide, isNarrow, wideContentWidth } = useLayout();
  const { expenses } = useExpenses();
  const { people } = usePeople();
  const { status: syncStatus, household } = useSync();
  const [month, setMonth] = useState(nowYearMonth);

  const muted = useThemeColor({}, 'muted');

  const monthExpenses = useMemo(() => filterByMonth(expenses, month), [expenses, month]);
  const total = useMemo(() => totalAmount(monthExpenses), [monthExpenses]);
  const average = useMemo(() => averageAmount(monthExpenses), [monthExpenses]);
  const categories = useMemo(() => totalsByCategory(monthExpenses), [monthExpenses]);
  const perPerson = useMemo(() => totalsByPerson(monthExpenses, people), [monthExpenses, people]);
  const settlement = useMemo(() => settle(monthExpenses, people), [monthExpenses, people]);

  const hasPeople = people.length > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          wideContentWidth,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl },
        ]}>
        <View style={styles.title}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
          <ThemedText type="title">Resumen</ThemedText>
        </View>

        <MonthSwitcher value={month} onChange={setMonth} />

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
            <Card>
              <View style={styles.sectionHeading}>
                <ThemedText type="subtitle">Por persona</ThemedText>
                <ActionButton
                  label={hasPeople ? 'Administrar' : 'Agregar personas'}
                  variant="secondary"
                  onPress={() => router.push('/people')}
                />
              </View>
              {perPerson.length === 0 ? (
                <EmptyState
                  title="Sin gastos este mes"
                  description="Cuando cargues gastos vas a ver cuánto puso cada persona."
                />
              ) : (
                perPerson.map((item) => (
                  <View key={item.personId ?? 'sin-asignar'} style={styles.personRow}>
                    <ThemedText numberOfLines={1} style={styles.personName}>
                      {item.name}
                    </ThemedText>
                    <View style={styles.personAmount}>
                      <Amount value={item.total} />
                      <ThemedText style={[styles.percent, { color: muted }]}>
                        {Math.round(item.share * 100)}%
                      </ThemedText>
                    </View>
                  </View>
                ))
              )}
            </Card>

            {hasPeople ? <BalanceCard settlement={settlement} /> : null}
          </View>
        </View>

        <Card>
          <View style={styles.sectionHeading}>
            <ThemedText type="subtitle">Hogar compartido</ThemedText>
            <ActionButton
              label={household ? 'Administrar' : 'Configurar'}
              variant="secondary"
              onPress={() => router.push('/household')}
            />
          </View>
          <ThemedText style={{ color: muted }}>
            {!household
              ? 'Los gastos viven solo en este dispositivo. Configurá un hogar para verlos también en el celular o la compu.'
              : syncStatus === 'syncing'
                ? `Sincronizando con ${household.name}…`
                : syncStatus === 'error'
                  ? `Sin conexión con ${household.name}. Los gastos se guardan igual y se sincronizan después.`
                  : `Sincronizado con ${household.name} al abrir la app.`}
          </ThemedText>
        </Card>

        <ThemedText style={[styles.hint, { color: muted }]}>
          {expenses.length === 1
            ? `1 gasto guardado, ${formatCurrency(totalAmount(expenses))} en total.`
            : `${expenses.length} gastos guardados, ${formatCurrency(totalAmount(expenses))} en total.`}
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
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logo: {
    width: 34,
    height: 34,
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
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  personName: {
    flex: 1,
  },
  personAmount: {
    alignItems: 'flex-end',
  },
  percent: {
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
