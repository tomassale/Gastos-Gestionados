import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { FeedbackBanner } from '@/components/expenses/feedback-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionButton } from '@/components/ui/action-button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/layout';
import { useHousehold } from '@/contexts/household-context';
import { useLayout } from '@/hooks/use-layout';
import { useSync } from '@/hooks/use-sync';
import { useThemeColor } from '@/hooks/use-theme-color';
import { isSupabaseConfigured } from '@/lib/supabase';

const MIN_CODE_LENGTH = 8;

export default function HouseholdScreen() {
  const { contentWidth, isNarrow } = useLayout();
  const { household, create, join, leave } = useHousehold();
  const { status, error: syncError, syncNow } = useSync();

  const muted = useThemeColor({}, 'muted');

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(ok);
      setCode('');
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar.');
    } finally {
      setBusy(false);
    }
  };

  const codeIsShort = code.trim().length < MIN_CODE_LENGTH;

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.content, contentWidth]}>
          <Card>
            <ThemedText type="subtitle">Falta configurar la sincronización</ThemedText>
            <ThemedText style={{ color: muted }}>
              Copiá el archivo .env.example a .env, completá la URL y la clave de Supabase, y
              reiniciá el servidor.
            </ThemedText>
          </Card>
        </ScrollView>
      </ThemedView>
    );
  }

  if (household) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.content, contentWidth]}>
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
                  ? 'No se pudo sincronizar. Se reintenta al próximo cambio.'
                  : household.lastSyncAt
                    ? `Última sincronización: ${new Date(household.lastSyncAt).toLocaleString('es-AR')}`
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
              Se sincroniza al abrir la app. Lo que cargues después viaja cuando toques
              Sincronizar ahora o la próxima vez que la abras. Salir no borra nada: los gastos
              quedan en este dispositivo y en el hogar.
            </ThemedText>
          </Card>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, contentWidth]}
          keyboardShouldPersistTaps="handled">
          <Card>
            <ThemedText type="subtitle">Entrar a un hogar</ThemedText>
            <ThemedText style={{ color: muted }}>
              Pedile el código a quien ya lo creó y los gastos se van a ver en los dos
              dispositivos.
            </ThemedText>
            <TextField
              label="Código"
              value={code}
              onChangeText={setCode}
              placeholder="al menos 8 caracteres"
            />
            <ActionButton
              label="Entrar"
              loading={busy}
              disabled={codeIsShort}
              onPress={() => void run(() => join(code.trim()), 'Listo, ya estás en el hogar.')}
            />
          </Card>

          <Card>
            <ThemedText type="subtitle">Crear uno nuevo</ThemedText>
            <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Casa" />
            <TextField
              label="Código secreto"
              value={code}
              onChangeText={setCode}
              placeholder="al menos 8 caracteres"
            />
            <ActionButton
              label="Crear hogar"
              loading={busy}
              disabled={codeIsShort}
              onPress={() =>
                void run(() => create(name, code.trim()), 'Hogar creado. Compartí el código.')
              }
            />
            <ThemedText style={[styles.hint, { color: muted }]}>
              Elegí un código largo y difícil de adivinar: es lo único que protege los datos.
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
    padding: Spacing.lg,
    // Aire extra bajo el encabezado, para que el contenido no arranque pegado.
    paddingTop: Spacing.xl,
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
