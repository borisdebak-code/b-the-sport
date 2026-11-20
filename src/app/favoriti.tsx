import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { MaxContentWidth, Spacing, usePalette } from '@/constants/theme';
import { fetchEntities, NotConfiguredError, type EntityRow } from '@/lib/feed';
import { SPORT_LABEL } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

const GROUPS: { kind: EntityRow['kind']; title: string }[] = [
  { kind: 'national_team', title: 'Reprezentacije' },
  { kind: 'club', title: 'Klubovi' },
  { kind: 'athlete', title: 'Sportaši' },
];

function fold(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

export default function FavoritiScreen() {
  const p = usePalette();
  const { isFavorite, toggleFavorite } = useAppState();
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>('Učitavanje…');

  useEffect(() => {
    fetchEntities()
      .then((rows) => {
        setEntities(rows);
        setMessage(null);
      })
      .catch((e) => setMessage(e instanceof NotConfiguredError ? 'Baza još nije povezana.' : String(e.message ?? e)));
  }, []);

  const sections = useMemo(() => {
    const q = fold(query.trim());
    const match = (e: EntityRow) => !q || fold(e.name).includes(q);
    return GROUPS.map((g) => ({
      key: g.kind,
      title: g.title,
      data: entities.filter((e) => e.kind === g.kind && match(e)),
    })).filter((s) => s.data.length > 0);
  }, [entities, query]);

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={[styles.introBody, { color: p.textSecondary }]}>
              Označeni favoriti pojavljuju se na vrhu aplikacije. Dodir na favorit otvara sve vijesti o njemu.
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Traži klub, reprezentaciju ili sportaša"
              placeholderTextColor={p.textSecondary}
              style={[styles.search, { backgroundColor: p.surface, borderColor: p.border, color: p.text }]}
              autoCorrect={false}
            />
            {message ? <Text style={[styles.introBody, { color: p.textSecondary }]}>{message}</Text> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: p.textSecondary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const on = isFavorite(item.id);
          return (
            <Pressable
              onPress={() => toggleFavorite({ id: item.id, name: item.name, sport: item.sport, kind: item.kind })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: p.surface, borderColor: p.border },
                pressed && { opacity: 0.8 },
              ]}>
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: p.text }]}>{item.name}</Text>
                <Text style={[styles.sub, { color: p.textSecondary }]}>{SPORT_LABEL[item.sport] ?? item.sport}</Text>
              </View>
              <Ionicons name={on ? 'star' : 'star-outline'} size={22} color={on ? p.accent : p.textSecondary} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.six * 3,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  intro: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  introBody: {
    fontSize: 14,
    lineHeight: 19,
  },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  sub: {
    fontSize: 12,
  },
});
