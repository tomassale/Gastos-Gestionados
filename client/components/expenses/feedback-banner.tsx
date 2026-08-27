import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type FeedbackBannerProps = {
  message: string | null;
  error: string | null;
  onDismiss: () => void;
};

export function FeedbackBanner({ message, error, onDismiss }: FeedbackBannerProps) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');

  const text = error ?? message;
  if (!text) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Descartar mensaje"
      onPress={onDismiss}
      style={[styles.banner, { backgroundColor: card, borderColor: error ? danger : border }]}>
      <ThemedText style={error ? { color: danger } : undefined}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
