import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatCurrency } from '@/lib/format';
import type { CategoryTotal } from '@/lib/summary';

export function CategoryBar({ item }: { item: CategoryTotal }) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  const percent = Math.round(item.share * 100);

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${item.category}: ${formatCurrency(item.total)}, ${percent} por ciento del total`}>
      <View style={styles.labels}>
        <ThemedText numberOfLines={1} style={styles.category}>
          {item.category}
        </ThemedText>
        <ThemedText type="defaultSemiBold">{formatCurrency(item.total)}</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: border }]}>
        <View style={[styles.fill, { backgroundColor: tint, width: `${Math.max(percent, 2)}%` }]} />
      </View>
      <ThemedText style={[styles.percent, { color: muted }]}>{percent}%</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  category: {
    flex: 1,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  percent: {
    fontSize: 13,
    lineHeight: 18,
  },
});
