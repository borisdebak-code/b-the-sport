import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { MaxContentWidth, Spacing, usePalette } from '@/constants/theme';
import {
  fetchMatches,
  matchPhase,
  matchStatusText,
  NotConfiguredError,
  type LeagueGroup,
  type MatchRow,
} from '@/lib/feed';
import type { SportId } from '@/lib/sports';

import { Chips, type ChipOption } from './chips';

const DAYS: ChipOption<number>[] = [
  { value: -1, label: 'Jučer' },
  { value: 0, label: 'Danas' },
  { value: 1, label: 'Sutra' },
];

/** Results for one sport. Rendered under the sport's "Rezultati" sub-tab. */
export function ResultsList({ sport, header }: { sport: SportId; header?: ReactElement }) {
  const [day, setDay] = useState(0);
  return <ResultsDay key={`${sport}:${day}`} sport={sport} day={day} setDay={setDay} header={header} />;
}

function ResultsDay({
  sport,
  day,
  setDay,
  header,
}: {
  sport: SportId;
  day: number;
  setDay: (d: number) => void;
  header?: ReactElement;
}) {
  const p = usePalette();
  const [groups, setGroups] = useState<LeagueGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const req = useRef(0);

  useEffect(() => {
    const id = ++req.current;
    fetchMatches(sport, day)
      .then((g) => id === req.current && setGroups(g))
      .catch((e: unknown) => {
        if (id !== req.current) return;
        setError(e instanceof NotConfiguredError ? 'Baza još nije povezana.' : String((e as Error).message ?? e));
        setGroups([]);
      });
  }, [sport, day]);

  const refresh = useCallback(async () => {
    const id = ++req.current;
    setRefreshing(true);
    try {
      const g = await fetchMatches(sport, day);
      if (id === req.current) {
        setGroups(g);
        setError(null);
      }
    } catch (e) {
      if (id === req.current) setError(String((e as Error).message ?? e));
    } finally {
      setRefreshing(false);
    }
  }, [sport, day]);

  return (
    <SectionList
      sections={groups ?? []}
      keyExtractor={(m) => m.id}
      stickySectionHeadersEnabled={false}
      style={{ backgroundColor: p.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View>
          {header}
          <Chips options={DAYS} value={day} onChange={setDay} compact />
        </View>
      }
      ListEmptyComponent={
        groups === null ? (
          <ActivityIndicator style={styles.spinner} color={p.textSecondary} />
        ) : (
          <Text style={[styles.empty, { color: p.textSecondary }]}>
            {error ?? 'Nema utakmica u praćenim natjecanjima za taj dan.'}
          </Text>
        )
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.league, { color: p.textSecondary }]}>{section.title}</Text>
      )}
      renderItem={({ item, index, section }) => (
        <MatchItem match={item} first={index === 0} last={index === section.data.length - 1} />
      )}
    />
  );
}

function MatchItem({ match, first, last }: { match: MatchRow; first: boolean; last: boolean }) {
  const p = usePalette();
  const phase = matchPhase(match.status);
  const live = phase === 'live';
  const showScore = phase === 'live' || phase === 'finished';
  const homeWon = phase === 'finished' && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWon = phase === 'finished' && (match.away_score ?? 0) > (match.home_score ?? 0);

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: p.surface, borderColor: p.border },
        first && styles.rowFirst,
        last && styles.rowLast,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth },
      ]}>
      <Text style={[styles.status, { color: live ? p.accent : p.textSecondary }, live && styles.statusLive]}>
        {matchStatusText(match)}
      </Text>
      <View style={styles.teams}>
        <Text style={[styles.team, { color: p.text }, homeWon && styles.winner]} numberOfLines={1}>
          {match.home}
        </Text>
        <Text style={[styles.team, { color: p.text }, awayWon && styles.winner]} numberOfLines={1}>
          {match.away}
        </Text>
      </View>
      {showScore ? (
        <View style={styles.scores}>
          <Text style={[styles.score, { color: live ? p.accent : p.text }, homeWon && styles.winner]}>
            {match.home_score ?? '-'}
          </Text>
          <Text style={[styles.score, { color: live ? p.accent : p.text }, awayWon && styles.winner]}>
            {match.away_score ?? '-'}
          </Text>
        </View>
      ) : null}
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
  spinner: {
    marginTop: Spacing.six * 2,
  },
  empty: {
    marginTop: Spacing.six,
    paddingHorizontal: Spacing.six,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  league: {
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
    gap: Spacing.three,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  rowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  rowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  status: {
    width: 52,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statusLive: {
    fontWeight: '800',
  },
  teams: {
    flex: 1,
    gap: 4,
  },
  team: {
    fontSize: 15,
  },
  winner: {
    fontWeight: '800',
  },
  scores: {
    alignItems: 'flex-end',
    gap: 4,
  },
  score: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
