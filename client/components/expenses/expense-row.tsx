import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Amount } from '@/components/ui/amount';
import { Radius, Spacing } from '@/constants/layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatShortDate } from '@/lib/format';
import type { Expense } from '@/lib/types';

type ExpenseRowProps = {
  expense: Expense;
  personName?: string;
  onPress: (expense: Expense) => void;
};

export function ExpenseRow({ expense, personName, onPress }: ExpenseRowProps) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  const details = [formatShortDate(expense.date), personName, expense.category]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Editar ${expense.concept}`}
      onPress={() => onPress(expense)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: card, borderColor: border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={styles.info}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {expense.concept}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: muted }]} numberOfLines={1}>
          {details}
        </ThemedText>
      </View>
      <Amount value={expense.amount} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
});
