import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Spacing, usePalette } from '@/constants/theme';

export interface ChipOption<T> {
  value: T;
  label: string;
}

/** Secondary filter row (Hrvatska / Regija / Svijet, networks, …). */
export function Chips<T>({
  options,
  value,
  onChange,
  compact,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** second row directly under another row */
  compact?: boolean;
}) {
  const p = usePalette();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, compact && styles.compact]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: selected ? p.text : p.chip },
              pressed && { opacity: 0.75 },
            ]}>
            <Text style={[styles.label, { color: selected ? p.surface : p.chipText }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  compact: {
    paddingTop: 0,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
