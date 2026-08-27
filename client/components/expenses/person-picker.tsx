import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Person } from '@/lib/types';

type PersonPickerProps = {
  people: Person[];
  /** Puede ser más de una: el gasto se reparte entre las elegidas. */
  selected: string[];
  onChange: (personIds: string[]) => void;
  onCreate: (name: string) => Person | null;
  error?: string;
};

/**
 * Elige quiénes pusieron la plata y permite sumar una persona nueva sin salir
 * del formulario.
 */
export function PersonPicker({
  people,
  selected,
  onChange,
  onCreate,
  error,
}: PersonPickerProps) {
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const [adding, setAdding] = useState(people.length === 0);
  const [name, setName] = useState('');

  const toggle = (personId: string) =>
    onChange(
      selected.includes(personId)
        ? selected.filter((id) => id !== personId)
        : [...selected, personId]
    );

  const confirmNewPerson = () => {
    const person = onCreate(name);
    if (person && !selected.includes(person.id)) onChange([...selected, person.id]);
    setName('');
    setAdding(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: muted }]}>Quién lo pagó</ThemedText>

      <View style={styles.chips}>
        {people.map((person) => (
          <Chip
            key={person.id}
            label={person.name}
            selected={selected.includes(person.id)}
            onPress={() => toggle(person.id)}
          />
        ))}
        {!adding ? <Chip label="+ Nueva persona" onPress={() => setAdding(true)} /> : null}
      </View>

      {selected.length > 1 ? (
        <ThemedText style={[styles.hint, { color: muted }]}>
          El monto se reparte en partes iguales entre las {selected.length} personas.
        </ThemedText>
      ) : null}

      {error ? <ThemedText style={[styles.hint, { color: danger }]}>{error}</ThemedText> : null}

      {adding ? (
        <View style={styles.newPerson}>
          <TextField
            label="Nombre de la persona"
            value={name}
            onChangeText={setName}
            placeholder="Ana"
            autoFocus={people.length > 0}
          />
          <View style={styles.newPersonActions}>
            <ActionButton label="Agregar" onPress={confirmNewPerson} style={styles.newPersonAction} />
            {people.length > 0 ? (
              <ActionButton
                label="Cancelar"
                variant="secondary"
                onPress={() => {
                  setName('');
                  setAdding(false);
                }}
                style={styles.newPersonAction}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  newPerson: {
    gap: Spacing.md,
  },
  newPersonActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  newPersonAction: {
    flex: 1,
  },
});
