import { StyleSheet, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatCurrency } from '@/lib/format';

type AmountProps = {
  value: number;
  /** `display` para el número protagonista de una tarjeta, `row` para listas. */
  variant?: 'display' | 'row';
  style?: TextStyle;
};

export function Amount({ value, variant = 'row', style }: AmountProps) {
  const isDisplay = variant === 'display';

  return (
    <ThemedText
      type="defaultSemiBold"
      // Un monto siempre entra en un renglón: si no da, se achica en vez de partirse.
      numberOfLines={1}
      adjustsFontSizeToFit={isDisplay}
      minimumFontScale={0.7}
      style={[styles.amount, isDisplay ? styles.display : null, style]}>
      {formatCurrency(value)}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  amount: {
    // Los dígitos de igual ancho alinean las comas de una columna de montos.
    fontVariant: ['tabular-nums'],
  },
  display: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
});
