import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { Logo } from '@/components/logo';
import { visibleTabs } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

const C = Colors.light; // header is always dark navy, in both themes

/** Brand bar, favourites and sport tabs. Shown at the top of every section. */
export function AppHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { sport, setSport, activeSeasonal, favorites } = useAppState();
  const tabs = useMemo(() => visibleTabs(activeSeasonal), [activeSeasonal]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.brandRow}>
        <Logo size={30} />
        <View style={styles.brandRight}>
          <Text style={styles.section}>{title}</Text>
          <Pressable
            onPress={() => router.push('/favoriti')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Uredi favorite"
            style={({ pressed }) => pressed && styles.pressed}>
            <Ionicons name={favorites.length ? 'star' : 'star-outline'} size={20} color={C.headerText} />
          </Pressable>
        </View>
      </View>

      {favorites.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favs}>
          {favorites.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => router.push({ pathname: '/favorit/[id]', params: { id: String(f.id), name: f.name } })}
              style={({ pressed }) => [styles.fav, pressed && styles.pressed]}>
              <Ionicons name="star" size={12} color={C.accent} />
              <Text style={styles.favText}>{f.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        accessibilityRole="tablist">
        {tabs.map((t) => {
          const selected = sport === t.id;
          return (
            <Pressable
              key={t.label}
              onPress={() => setSport(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}>
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.header,
    paddingBottom: Spacing.three,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  section: {
    color: C.headerMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  favs: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  fav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  favText: {
    color: C.headerText,
    fontSize: 13,
    fontWeight: '600',
  },
  tabs: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabSelected: {
    backgroundColor: C.accent,
  },
  tabText: {
    color: C.headerMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: C.accentText,
  },
  pressed: {
    opacity: 0.75,
  },
});
