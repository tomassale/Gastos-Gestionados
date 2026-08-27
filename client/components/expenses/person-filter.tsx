import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/layout';
import type { Person } from '@/lib/types';

type PersonFilterProps = {
  people: Person[];
  /** null significa "todas las personas". */
  selected: string | null;
  onSelect: (personId: string | null) => void;
};

export function PersonFilter({ people, selected, onSelect }: PersonFilterProps) {
  if (people.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      <Chip label="Todas" selected={selected === null} onPress={() => onSelect(null)} />
      {people.map((person) => (
        <Chip
          key={person.id}
          label={person.name}
          selected={selected === person.id}
          onPress={() => onSelect(person.id)}
          accessibilityLabel={`Filtrar por ${person.name}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
