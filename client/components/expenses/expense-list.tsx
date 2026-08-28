import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ExpenseRow } from '@/components/expenses/expense-row';
import { Spacing } from '@/constants/layout';
import type { Expense, Person } from '@/lib/types';

type ExpenseListProps = {
  expenses: Expense[];
  people: Person[];
  /** Lo que va arriba de la lista: el título, el total, los filtros. */
  header: React.ReactNode;
  /** Qué mostrar cuando no hay ningún gasto que listar. */
  empty: React.ReactNode;
  onPressExpense: (expense: Expense) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * La lista de gastos, compartida por la pantalla del mes actual y la del
 * historial. Las dos muestran lo mismo; lo que cambia es el encabezado.
 */
export function ExpenseList({
  expenses,
  people,
  header,
  empty,
  onPressExpense,
  contentContainerStyle,
}: ExpenseListProps) {
  // Por nombre y no por búsqueda en la lista: si no, cada fila recorre todas
  // las personas por cada quien pagó.
  const nameById = useMemo(
    () => new Map(people.map((person) => [person.id, person.name])),
    [people]
  );

  const payerNames = useCallback(
    (personIds: string[]) =>
      personIds
        .map((id) => nameById.get(id))
        .filter(Boolean)
        .join(', '),
    [nameById]
  );

  return (
    <FlatList
      data={expenses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={<>{header}</>}
      renderItem={({ item }) => (
        <ExpenseRow
          expense={item}
          personName={payerNames(item.personIds)}
          onPress={onPressExpense}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<>{empty}</>}
    />
  );
}

const styles = StyleSheet.create({
  separator: {
    height: Spacing.sm,
  },
});
