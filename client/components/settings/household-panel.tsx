import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FeedbackBanner } from '@/components/expenses/feedback-banner';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/layout';
import { useHousehold } from '@/contexts/household-context';
import { useSync } from '@/contexts/sync-context';
import { useLayout } from '@/hooks/use-layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import { generateHouseholdCode } from '@/lib/household-code';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Lo mínimo que puede tener un código para molestarse en consultarlo. */
const MIN_CODE_LENGTH = 8;

/** Entrar a un hogar, crear uno o ver el estado del que ya está. */
export function HouseholdPanel() {
  const { isNarrow } = useLayout();
  const { household, create, join, leave } = useHousehold();
  const { status, error: syncError, syncNow, hasPendingChanges } = useSync();

  const muted = useThemeColor({}, 'muted');

  const [name, setName] = useState('');
  // Cada formulario tiene el suyo: cuando compartían el campo, escribir en
  // "Entrar" completaba también "Crear uno nuevo".
  const [joinCode, setJoinCode] = useState('');
  const [newCode, setNewCode] = useState(generateHouseholdCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, ok: string, done?: () => void) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(ok);
      done?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar.');
    } finally {
      setBusy(false);
    }
  };

  const codeIsShort = joinCode.trim().length < MIN_CODE_LENGTH;

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.panel}>
        <Card>
          <ThemedText type="subtitle">Falta configurar la sincronización</ThemedText>
          <ThemedText style={{ color: muted }}>
            Copiá el archivo .env.example a .env, completá la URL y la clave de Supabase, y
            reiniciá el servidor.
          </ThemedText>
        </Card>
      </View>
    );
  }

  if (household) {
    return (
      <View style={styles.panel}>
        <Card>
          <ThemedText type="subtitle">{household.name}</ThemedText>
          <ThemedText style={{ color: muted }}>
            Este dispositivo comparte los gastos con quien tenga el mismo código.
          </ThemedText>
          <View style={styles.codeBox}>
            <ThemedText style={[styles.label, { color: muted }]}>Código del hogar</ThemedText>
            <ThemedText type="defaultSemiBold" selectable style={styles.code}>
              {household.code}
            </ThemedText>
          </View>
          <ThemedText style={[styles.hint, { color: muted }]}>
            Compartilo solo con quienes tengan que ver estos gastos: alcanza para entrar.
          </ThemedText>
        </Card>

        <Card>
          <ThemedText type="subtitle">Estado</ThemedText>
          <ThemedText style={{ color: muted }}>
            {status === 'syncing'
              ? 'Sincronizando…'
              : status === 'error'
                ? 'No se pudo sincronizar. Se reintenta solo en unos segundos.'
                : hasPendingChanges
                  ? 'Hay cambios sin subir. Viajan en unos segundos.'
                  : household.lastSyncAt
                    ? `Al día. Última sincronización: ${new Date(household.lastSyncAt).toLocaleString('es-AR')}`
                    : 'Todavía no se sincronizó.'}
          </ThemedText>
          <FeedbackBanner message={null} error={syncError} onDismiss={() => {}} />
          <View style={[styles.actions, isNarrow && styles.stacked]}>
            <ActionButton
              label="Sincronizar ahora"
              loading={status === 'syncing'}
              onPress={() => void syncNow()}
              style={styles.action}
            />
            <ActionButton
              label="Salir del hogar"
              variant="secondary"
              onPress={leave}
              style={styles.action}
            />
          </View>
          <ThemedText style={[styles.hint, { color: muted }]}>
            Se sincroniza sola: lo que cargás viaja a los pocos segundos y lo que cargan los
            demás aparece acá sin hacer nada. El botón es por si querés que sea ya. Sin conexión
            la app funciona igual y los cambios salen cuando vuelve. Salir no borra nada: los
            gastos quedan en este dispositivo y en el hogar.
          </ThemedText>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Card>
        <ThemedText type="subtitle">Entrar a un hogar</ThemedText>
        <ThemedText style={{ color: muted }}>
          Pedile el código a quien ya lo creó y los gastos se van a ver en los dos dispositivos.
        </ThemedText>
        <TextField
          label="Código"
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="el código que te pasaron"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ActionButton
          label="Entrar"
          loading={busy}
          disabled={codeIsShort}
          onPress={() =>
            void run(() => join(joinCode.trim()), 'Listo, ya estás en el hogar.', () =>
              setJoinCode('')
            )
          }
        />
      </Card>

      <Card>
        <ThemedText type="subtitle">Crear uno nuevo</ThemedText>
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Casa" />
        <View style={styles.codeBox}>
          <ThemedText style={[styles.label, { color: muted }]}>Código del hogar</ThemedText>
          <ThemedText type="defaultSemiBold" selectable style={styles.code}>
            {newCode}
          </ThemedText>
        </View>
        <View style={[styles.actions, isNarrow && styles.stacked]}>
          <ActionButton
            label="Crear hogar"
            loading={busy}
            onPress={() =>
              void run(() => create(name, newCode), 'Hogar creado. Compartí el código.', () => {
                setName('');
                setNewCode(generateHouseholdCode());
              })
            }
            style={styles.action}
          />
          <ActionButton
            label="Generar otro"
            variant="secondary"
            onPress={() => setNewCode(generateHouseholdCode())}
            style={styles.action}
          />
        </View>
        <ThemedText style={[styles.hint, { color: muted }]}>
          El código lo genera este dispositivo al azar y es lo único que protege los gastos del
          hogar: pasáselo solo a quienes tengan que verlos, y por un medio privado. Anotalo antes
          de crear el hogar si lo vas a compartir después.
        </ThemedText>
      </Card>

      <FeedbackBanner
        message={message}
        error={error}
        onDismiss={() => {
          setMessage(null);
          setError(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.md,
  },
  codeBox: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  code: {
    fontSize: 20,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stacked: {
    flexDirection: 'column',
  },
  action: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
