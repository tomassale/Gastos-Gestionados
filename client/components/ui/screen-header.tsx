import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/layout';
import { useThemeColor } from '@/hooks/use-theme-color';

type ScreenHeaderProps = {
  title: string;
  /** Renglón chico debajo del título: el mes, una aclaración. */
  subtitle?: string;
};

/**
 * El encabezado de cada pantalla. Está acá y no copiado en cada una para que
 * el logo quede siempre a la misma altura del título: si el subtítulo entrara
 * en la fila, las pantallas que lo tienen mostrarían el logo corrido respecto
 * de las que no.
 */
export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <ThemedText type="title">{title}</ThemedText>
      </View>
      {subtitle ? (
        <ThemedText style={[styles.subtitle, { color: muted }]}>{subtitle}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logo: {
    width: 34,
    height: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
});
