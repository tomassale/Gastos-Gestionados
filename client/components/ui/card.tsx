import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/layout';
import { useThemeColor } from '@/hooks/use-theme-color';

export function Card({ style, ...rest }: ViewProps) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  return <View style={[styles.card, { backgroundColor: card, borderColor: border }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      },
      default: {},
    }),
  },
});
