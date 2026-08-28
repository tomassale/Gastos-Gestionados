import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { capitalize } from '@/lib/format';
import { compareMonths, formatMonthLabel, shiftMonth, type YearMonth } from '@/lib/month';

type MonthSwitcherProps = {
  value: YearMonth;
  onChange: (next: YearMonth) => void;
  /** Hasta dónde se puede avanzar. Sin esto no hay tope hacia adelante. */
  max?: YearMonth;
  /** Hasta dónde se puede retroceder. Sin esto no hay tope hacia atrás. */
  min?: YearMonth;
};

export function MonthSwitcher({ value, onChange, max, min }: MonthSwitcherProps) {
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  const go = (delta: number) => onChange(shiftMonth(value, delta));

  const canGoForward = !max || compareMonths(shiftMonth(value, 1), max) <= 0;
  const canGoBack = !min || compareMonths(shiftMonth(value, -1), min) >= 0;

  return (
    <View style={[styles.row, { backgroundColor: card, borderColor: border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
        accessibilityState={{ disabled: !canGoBack }}
        disabled={!canGoBack}
        onPress={() => go(-1)}
        style={({ pressed }) => [
          styles.arrow,
          { opacity: !canGoBack ? 0.3 : pressed ? 0.5 : 1 },
        ]}>
        <IconSymbol name="chevron.left" size={20} color={tint} />
      </Pressable>

      <ThemedText type="defaultSemiBold" style={styles.label}>
        {capitalize(formatMonthLabel(value))}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        accessibilityState={{ disabled: !canGoForward }}
        disabled={!canGoForward}
        onPress={() => go(1)}
        style={({ pressed }) => [
          styles.arrow,
          { opacity: !canGoForward ? 0.3 : pressed ? 0.5 : 1 },
        ]}>
        <IconSymbol name="chevron.right" size={20} color={tint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  arrow: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 17,
  },
});
