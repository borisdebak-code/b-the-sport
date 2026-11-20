import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, usePalette } from '@/constants/theme';
import { relativeTime, type FeedEntry } from '@/lib/feed';
import { SPORT_LABEL } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

function open(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

export const NewsCard = memo(function NewsCard({ entry, showSport }: { entry: FeedEntry; showSport: boolean }) {
  const p = usePalette();
  const [expanded, setExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const extra = entry.source_count - 1;
  const title = showOriginal ? entry.original_title : entry.title;
  const { isSaved, toggleSaved } = useAppState();
  const saved = isSaved(entry.cluster_id);

  return (
    <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Pressable onPress={() => open(entry.url)} style={({ pressed }) => [styles.main, pressed && { opacity: 0.8 }]}>
        <View style={styles.textCol}>
          <View style={styles.metaRow}>
            {showSport && entry.sport !== 'ostalo' ? (
              <Text style={[styles.sport, { color: p.accent }]}>{SPORT_LABEL[entry.sport] ?? ''}</Text>
            ) : null}
            <Text style={[styles.meta, { color: p.textSecondary }]} numberOfLines={1}>
              {entry.source_name} · {relativeTime(entry.published_at)}
            </Text>
            <Pressable
              onPress={() => toggleSaved(entry)}
              hitSlop={12}
              style={styles.save}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Ukloni iz spremljenih' : 'Spremi'}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={saved ? p.accent : p.textSecondary} />
            </Pressable>
          </View>
          <Text style={[styles.title, { color: p.text }]} numberOfLines={4}>
            {title}
          </Text>
          {/* foreign summaries are not translated (quota), so they are hidden next to a translated title */}
          {entry.summary && !entry.translated ? (
            <Text style={[styles.summary, { color: p.textSecondary }]} numberOfLines={2}>
              {entry.summary}
            </Text>
          ) : null}
        </View>
        {entry.image_url ? (
          <Image source={{ uri: entry.image_url }} style={styles.image} contentFit="cover" transition={150} />
        ) : null}
      </Pressable>

      {extra > 0 || entry.translated ? (
      <View style={[styles.footer, { borderTopColor: p.border }]}>
        {extra > 0 ? (
          <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
            <Text style={[styles.footerLink, { color: p.text }]}>
              {expanded ? 'Sakrij izvore' : `+${extra} ${extra % 10 === 1 && extra % 100 !== 11 ? 'izvor' : 'izvora'}`}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={styles.footerRight}>
          {entry.translated ? (
            <Pressable onPress={() => setShowOriginal((v) => !v)} hitSlop={8}>
              <Text style={[styles.footerMuted, { color: p.textSecondary }]}>
                {showOriginal ? 'Prikaži prijevod' : 'Prevedeno · original'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      ) : null}

      {expanded ? (
        <View style={styles.others}>
          {entry.others.map((o) => (
            <Pressable key={o.url} onPress={() => open(o.url)} style={({ pressed }) => [styles.other, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.otherSource, { color: p.text }]}>{o.name}</Text>
              <Text style={[styles.otherTitle, { color: p.textSecondary }]} numberOfLines={2}>
                {o.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  textCol: {
    flex: 1,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sport: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  meta: {
    fontSize: 12,
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  summary: {
    fontSize: 14,
    lineHeight: 19,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  save: {
    marginLeft: 'auto',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerMuted: {
    fontSize: 12,
  },
  others: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  other: {
    gap: 2,
  },
  otherSource: {
    fontSize: 13,
    fontWeight: '700',
  },
  otherTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
});
