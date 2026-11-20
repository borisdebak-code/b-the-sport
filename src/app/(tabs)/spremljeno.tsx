import { FlatList, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { NewsCard } from '@/components/news-card';
import { MaxContentWidth, Spacing, usePalette } from '@/constants/theme';
import { sportsForTab } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

export default function SpremljenoScreen() {
  const p = usePalette();
  const { saved, sport, activeSeasonal } = useAppState();
  const sports = sportsForTab(sport, activeSeasonal);
  const data = sports ? saved.filter((e) => sports.includes(e.sport)) : saved;

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <AppHeader title="Spremljeno" />
      <FlatList
        data={data}
        keyExtractor={(e) => String(e.cluster_id)}
        renderItem={({ item }) => <NewsCard entry={item} showSport={sport === null} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={{ height: Spacing.three }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: p.text }]}>Nema spremljenih članaka</Text>
            <Text style={[styles.emptyBody, { color: p.textSecondary }]}>
              Dodirni oznaku na kartici vijesti da je spremiš. Spremljeni članci ostaju i nakon 30 dana.
            </Text>
          </View>
        }
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
  empty: {
    marginTop: Spacing.six * 2,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
