import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { capitalize } from '@/lib/format';
import { formatMonthLabel, type YearMonth } from '@/lib/month';

type MonthSwitcherProps = {
  value: YearMonth;
  onChange: (next: YearMonth) => void;
};

export function MonthSwitcher({ value, onChange }: MonthSwitcherProps) {
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  const go = (delta: number) => {
    const d = new Date(value.year, value.month - 1 + delta, 1);
    onChange({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  return (
    <View style={[styles.row, { backgroundColor: card, borderColor: border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
        onPress={() => go(-1)}
        style={({ pressed }) => [styles.arrow, { opacity: pressed ? 0.5 : 1 }]}>
        <IconSymbol name="chevron.left" size={20} color={tint} />
      </Pressable>

      <ThemedText type="defaultSemiBold" style={styles.label}>
        {capitalize(formatMonthLabel(value))}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        onPress={() => go(1)}
        style={({ pressed }) => [styles.arrow, { opacity: pressed ? 0.5 : 1 }]}>
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
