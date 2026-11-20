import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { MaxContentWidth, Spacing, usePalette } from '@/constants/theme';
import { fetchSources, NotConfiguredError, type SourceRow } from '@/lib/feed';
import { useAppState } from '@/state/app-state';

const GROUPS: { key: string; title: string; match: (s: SourceRow) => boolean }[] = [
  { key: 'hr', title: 'Portali · Hrvatska', match: (s) => s.kind === 'portal' && s.region === 'hr' },
  { key: 'regija', title: 'Portali · Regija', match: (s) => s.kind === 'portal' && s.region === 'regija' },
  { key: 'svijet', title: 'Portali · Svijet', match: (s) => s.kind === 'portal' && s.region === 'svijet' },
  { key: 'social', title: 'Društvene mreže', match: (s) => s.kind === 'social' },
];

export default function PostavkeScreen() {
  const p = usePalette();
  const { hiddenSources, toggleSource } = useAppState();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [message, setMessage] = useState<string | null>('Učitavanje izvora…');

  useEffect(() => {
    fetchSources()
      .then((rows) => {
        setSources(rows);
        setMessage(null);
      })
      .catch((e) =>
        setMessage(e instanceof NotConfiguredError ? 'Baza još nije povezana, pa popis izvora nije dostupan.' : String(e.message ?? e)),
      );
  }, []);

  const sections = useMemo(
    () => GROUPS.map((g) => ({ key: g.key, title: g.title, data: sources.filter(g.match) })).filter((s) => s.data.length > 0),
    [sources],
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <AppHeader title="Postavke" />
      <SectionList
        sections={sections}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={[styles.introTitle, { color: p.text }]}>Izvori</Text>
            <Text style={[styles.introBody, { color: p.textSecondary }]}>
              Isključeni izvori ne prikazuju se u feedu. Postavka se sprema na ovom uređaju.
            </Text>
            {message ? <Text style={[styles.introBody, { color: p.textSecondary }]}>{message}</Text> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: p.textSecondary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const on = !hiddenSources.includes(item.id);
          return (
            <View style={[styles.row, { backgroundColor: p.surface, borderColor: p.border }]}>
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: p.text }]}>{item.name}</Text>
                <Text style={[styles.sub, { color: p.textSecondary }]}>
                  {item.country}
                  {item.kind === 'social' ? ` · ${item.network}` : ''}
                  {!item.verified ? ' · feed nije provjeren' : ''}
                </Text>
              </View>
              <Switch value={on} onValueChange={() => toggleSource(item.id)} accessibilityLabel={item.name} />
            </View>
          );
        }}
        stickySectionHeadersEnabled={false}
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
    gap: Spacing.one,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  introBody: {
    fontSize: 14,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
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
