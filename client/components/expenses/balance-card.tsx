import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Amount } from '@/components/ui/amount';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatCurrency } from '@/lib/format';
import type { Settlement } from '@/lib/balance';

/** Muestra quién puso de más y qué pago empareja las cuentas del mes. */
export function BalanceCard({ settlement }: { settlement: Settlement }) {
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');

  const { fairShare, balances, transfers } = settlement;
  const hasMovement = balances.some((b) => b.balance !== 0);

  return (
    <Card>
      <View style={styles.heading}>
        <ThemedText type="subtitle">Quién puso más</ThemedText>
        <ThemedText style={[styles.hint, { color: muted }]}>
          En partes iguales le tocaba {formatCurrency(fairShare)} a cada una.
        </ThemedText>
      </View>

      {balances.map((item) => (
        <View key={item.name} style={styles.row}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {item.name}
          </ThemedText>
          <Amount
            value={item.balance}
            style={{ color: item.balance > 0 ? tint : item.balance < 0 ? danger : muted }}
          />
        </View>
      ))}

      {hasMovement ? (
        <View style={styles.transfers}>
          {transfers.map((t) => (
            <ThemedText key={`${t.from}-${t.to}`} style={{ color: muted }}>
              {t.from} le debe {formatCurrency(t.amount)} a {t.to}.
            </ThemedText>
          ))}
        </View>
      ) : (
        <ThemedText style={{ color: muted }}>Están a mano este mes.</ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: Spacing.xs,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  name: {
    flex: 1,
  },
  transfers: {
    gap: Spacing.xs,
  },
});
