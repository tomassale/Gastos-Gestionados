import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HouseholdPanel } from '@/components/settings/household-panel';
import { PeoplePanel } from '@/components/settings/people-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/layout';
import { useLayout } from '@/hooks/use-layout';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * Lo que se configura una vez y no se toca todos los días: con quién se
 * comparten los gastos y quiénes los ponen.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { contentWidth } = useLayout();

  const muted = useThemeColor({}, 'muted');

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            contentWidth,
            { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Configuración" />

          <ThemedText style={[styles.section, { color: muted }]}>Hogar compartido</ThemedText>
          <HouseholdPanel />

          <ThemedText style={[styles.section, { color: muted }]}>Personas</ThemedText>
          <PeoplePanel />
        </ScrollView>
      </KeyboardAvoidingView>
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
  section: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    // Separa una sección de la anterior sin necesidad de una línea divisoria.
    paddingTop: Spacing.md,
  },
});
