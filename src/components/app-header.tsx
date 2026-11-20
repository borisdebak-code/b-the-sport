import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { visibleTabs } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

const C = Colors.light; // header is always dark navy, in both themes

/** Brand bar + sport tabs. Shown at the top of every section. */
export function AppHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { sport, setSport, activeSeasonal } = useAppState();
  const tabs = useMemo(() => visibleTabs(activeSeasonal), [activeSeasonal]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>
          B <Text style={styles.brandAccent}>The</Text> Sport
        </Text>
        <Text style={styles.section}>{title}</Text>
      </View>
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  brand: {
    color: C.headerText,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: C.accent,
  },
  section: {
    color: C.headerMuted,
    fontSize: 14,
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
