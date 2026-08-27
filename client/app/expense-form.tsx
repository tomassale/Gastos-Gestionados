import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PersonPicker } from '@/components/expenses/person-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionButton } from '@/components/ui/action-button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/layout';
import { useExpenses } from '@/contexts/expenses-context';
import { usePeople } from '@/contexts/people-context';
import { useLayout } from '@/hooks/use-layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  draftFromExpense,
  emptyDraft,
  validateDraft,
  type DraftErrors,
  type ExpenseDraft,
} from '@/lib/expense-form';
import { todayYMD } from '@/lib/format';
import { knownCategories } from '@/lib/summary';

export default function ExpenseFormScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { contentWidth, isNarrow } = useLayout();
  const { expenses, addExpense, updateExpense, removeExpense } = useExpenses();
  const { people, addPerson } = usePeople();

  const muted = useThemeColor({}, 'muted');

  const existing = useMemo(() => expenses.find((e) => e.id === id), [expenses, id]);
  const isEditing = Boolean(existing);

  const [draft, setDraft] = useState<ExpenseDraft>(() =>
    existing ? draftFromExpense(existing) : emptyDraft(todayYMD())
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const categories = useMemo(() => knownCategories(expenses), [expenses]);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Editar gasto' : 'Nuevo gasto' });
  }, [navigation, isEditing]);

  const setField = (field: keyof ExpenseDraft) => (value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = () => {
    const result = validateDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (existing) updateExpense(existing.id, result.expense);
    else addExpense(result.expense);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    removeExpense(existing.id);
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, contentWidth]}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.fields, isNarrow && styles.stacked]}>
            <View style={styles.field}>
              <TextField
                label="Fecha"
                value={draft.date}
                onChangeText={setField('date')}
                placeholder="AAAA-MM-DD"
                error={errors.date}
              />
            </View>
            <View style={styles.field}>
              <TextField
                label="Monto"
                value={draft.amount}
                onChangeText={setField('amount')}
                placeholder="0,00"
                keyboardType="decimal-pad"
                error={errors.amount}
              />
            </View>
          </View>

          <TextField
            label="Concepto"
            value={draft.concept}
            onChangeText={setField('concept')}
            placeholder="Supermercado"
            error={errors.concept}
            autoFocus={!isEditing}
          />

          <PersonPicker
            people={people}
            selected={draft.personIds}
            onChange={(personIds) => {
              setDraft((prev) => ({ ...prev, personIds }));
              setErrors((prev) => ({ ...prev, personIds: undefined }));
            }}
            onCreate={addPerson}
            error={errors.personIds}
          />

          <View style={styles.categories}>
            <TextField
              label="Categoría (opcional)"
              value={draft.category}
              onChangeText={setField('category')}
              placeholder="Comida"
            />
            {categories.length > 0 ? (
              <View style={styles.chips}>
                {categories.map((category) => (
                  <Chip
                    key={category}
                    label={category}
                    selected={draft.category.trim() === category}
                    onPress={() => setField('category')(category)}
                    accessibilityLabel={`Usar categoría ${category}`}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <ActionButton label="Guardar" onPress={handleSave} />

          {isEditing ? (
            <>
              <ActionButton
                label={confirmingDelete ? 'Confirmar eliminación' : 'Eliminar gasto'}
                variant={confirmingDelete ? 'danger' : 'secondary'}
                onPress={handleDelete}
              />
              {confirmingDelete ? (
                <ThemedText style={[styles.hint, { color: muted }]}>
                  Tocá de nuevo para eliminarlo definitivamente.
                </ThemedText>
              ) : null}
            </>
          ) : null}
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
    gap: Spacing.lg,
  },
  fields: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stacked: {
    flexDirection: 'column',
  },
  field: {
    flex: 1,
  },
  categories: {
    gap: Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
