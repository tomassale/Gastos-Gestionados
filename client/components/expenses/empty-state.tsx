import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText style={[styles.description, { color: muted }]}>{description}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  description: {
    textAlign: 'center',
  },
});
