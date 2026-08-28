import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/expenses/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/layout';
import { useExpenses } from '@/contexts/expenses-context';
import { usePeople } from '@/contexts/people-context';
import { useLayout } from '@/hooks/use-layout';
import { useThemeColor } from '@/hooks/use-theme-color';

/** Quiénes comparten los gastos: alta, cambio de nombre y baja. */
export function PeoplePanel() {
  const { isNarrow } = useLayout();
  const { people, addPerson, renamePerson, removePerson } = usePeople();
  const { expenses, unassignPerson } = useExpenses();

  const muted = useThemeColor({}, 'muted');

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Una pasada por el historial en vez de una por persona: si no, el recuento
  // se rehace entero con cada tecla del campo de nombre.
  const expenseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expense of expenses) {
      for (const personId of expense.personIds) {
        counts.set(personId, (counts.get(personId) ?? 0) + 1);
      }
    }
    return counts;
  }, [expenses]);

  const handleAdd = () => {
    if (!addPerson(newName)) return;
    setNewName('');
  };

  const handleRename = (personId: string) => {
    renamePerson(personId, editingName);
    setEditingId(null);
    setEditingName('');
  };

  const handleRemove = (personId: string) => {
    if (confirmingDeleteId !== personId) {
      setConfirmingDeleteId(personId);
      return;
    }
    // Los gastos no se borran: quedan sin asignar para no perder el registro.
    unassignPerson(personId);
    removePerson(personId);
    setConfirmingDeleteId(null);
  };

  return (
    <View style={styles.panel}>
      <Card>
        <ThemedText type="subtitle">Agregar persona</ThemedText>
        <View style={[styles.addRow, isNarrow && styles.stacked]}>
          <View style={styles.addField}>
            <TextField label="Nombre" value={newName} onChangeText={setNewName} placeholder="Ana" />
          </View>
          <ActionButton label="Agregar" onPress={handleAdd} style={styles.addButton} />
        </View>
      </Card>

      {people.length === 0 ? (
        <EmptyState
          title="Todavía no hay personas"
          description="Agregá a quienes comparten los gastos para saber cuánto puso cada una."
        />
      ) : (
        people.map((person) => {
          const count = expenseCounts.get(person.id) ?? 0;
          const isEditing = editingId === person.id;
          const isConfirming = confirmingDeleteId === person.id;

          return (
            <Card key={person.id}>
              {isEditing ? (
                <>
                  <TextField
                    label="Nombre"
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                  />
                  <View style={[styles.actions, isNarrow && styles.stacked]}>
                    <ActionButton
                      label="Guardar"
                      onPress={() => handleRename(person.id)}
                      style={styles.action}
                    />
                    <ActionButton
                      label="Cancelar"
                      variant="secondary"
                      onPress={() => setEditingId(null)}
                      style={styles.action}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.personHeader}>
                    <ThemedText type="subtitle" numberOfLines={1} style={styles.personName}>
                      {person.name}
                    </ThemedText>
                    <ThemedText style={{ color: muted }}>
                      {count === 1 ? '1 gasto' : `${count} gastos`}
                    </ThemedText>
                  </View>
                  <View style={[styles.actions, isNarrow && styles.stacked]}>
                    <ActionButton
                      label="Renombrar"
                      variant="secondary"
                      onPress={() => {
                        setEditingId(person.id);
                        setEditingName(person.name);
                        setConfirmingDeleteId(null);
                      }}
                      style={styles.action}
                    />
                    <ActionButton
                      label={isConfirming ? 'Confirmar' : 'Eliminar'}
                      variant={isConfirming ? 'danger' : 'secondary'}
                      onPress={() => handleRemove(person.id)}
                      style={styles.action}
                    />
                  </View>
                  {isConfirming ? (
                    <ThemedText style={[styles.hint, { color: muted }]}>
                      {count === 1 ? 'Su gasto queda' : 'Sus gastos quedan'} sin esa persona, no se
                      borran.
                    </ThemedText>
                  ) : null}
                </>
              )}
            </Card>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  addField: {
    flex: 1,
  },
  addButton: {
    minWidth: 120,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  personName: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  action: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
