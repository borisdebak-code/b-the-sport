import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chips, type ChipOption } from '@/components/chips';
import { FeedList } from '@/components/feed-list';
import { ResultsList } from '@/components/results-list';
import { Spacing, usePalette } from '@/constants/theme';
import { isTransferWindow, type FeedQuery, type Region } from '@/lib/feed';
import { sportsForTab, type SportId } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

type RegionFilter = Region | 'sve';
type HrMode = 'portali' | 'hrvati-u-svijetu';
type Mode = 'vijesti' | 'transferi' | 'rezultati';
type Trust = 'svi' | 'pouzdani';

const REGIONS: ChipOption<RegionFilter>[] = [
  { value: 'sve', label: 'Sve' },
  { value: 'hr', label: 'Hrvatska' },
  { value: 'regija', label: 'Regija' },
  { value: 'svijet', label: 'Svijet' },
];

const HR_MODES: ChipOption<HrMode>[] = [
  { value: 'portali', label: 'Hrvatski portali' },
  { value: 'hrvati-u-svijetu', label: 'Hrvati u svijetu' },
];

const TRUST: ChipOption<Trust>[] = [
  { value: 'svi', label: 'Svi izvori' },
  { value: 'pouzdani', label: 'Samo pouzdani izvori' },
];

/** Sports with results (API-Sports): football, basketball, handball. */
const WITH_RESULTS: SportId[] = ['nogomet', 'kosarka', 'rukomet'];

function modesFor(sport: SportId | null): ChipOption<Mode>[] {
  if (sport === null || !WITH_RESULTS.includes(sport)) return [];
  const modes: ChipOption<Mode>[] = [{ value: 'vijesti', label: 'Vijesti' }];
  if (sport === 'nogomet') modes.push({ value: 'transferi', label: 'Transfer centar' });
  modes.push({ value: 'rezultati', label: 'Rezultati' });
  return modes;
}

export default function PortaliScreen() {
  const p = usePalette();
  const { sport, setSport, activeSeasonal, hiddenSources } = useAppState();
  const [selectedMode, setMode] = useState<Mode>('vijesti');
  const [region, setRegion] = useState<RegionFilter>('sve');
  const [hrMode, setHrMode] = useState<HrMode>('portali');
  const [trust, setTrust] = useState<Trust>('svi');

  const modes = modesFor(sport);
  // a mode the current sport does not offer falls back to news
  const mode: Mode = modes.some((m) => m.value === selectedMode) ? selectedMode : 'vijesti';
  const transfers = mode === 'transferi';
  const inWindow = isTransferWindow();
  const abroad = region === 'hr' && hrMode === 'hrvati-u-svijetu';

  const query = useMemo<Omit<FeedQuery, 'before' | 'limit'>>(
    () =>
      transfers
        ? // Transfer centar: portals and social posts (Romano & co.) together
          {
            kind: null,
            transfers: true,
            sports: ['nogomet'],
            minReliability: trust === 'pouzdani' ? 2 : null,
            hiddenSources,
          }
        : {
            kind: 'portal',
            // "Hrvati u svijetu" = regional and world sources mentioning Croatian athletes
            region: abroad ? null : region === 'sve' ? null : region,
            croatsAbroad: abroad,
            sports: sportsForTab(sport, activeSeasonal),
            hiddenSources,
          },
    [transfers, trust, abroad, region, sport, activeSeasonal, hiddenSources],
  );

  const header = (
    <View>
      {inWindow && !transfers && (sport === null || sport === 'nogomet') ? (
        <Pressable
          onPress={() => {
            setSport('nogomet');
            setMode('transferi');
          }}
          style={({ pressed }) => [styles.banner, { backgroundColor: p.accent }, pressed && { opacity: 0.85 }]}>
          <Ionicons name="swap-horizontal" size={18} color={p.accentText} />
          <Text style={[styles.bannerText, { color: p.accentText }]}>Prijelazni rok je otvoren · Transfer centar</Text>
        </Pressable>
      ) : null}
      {modes.length ? <Chips options={modes} value={mode} onChange={setMode} /> : null}
      {mode === 'vijesti' ? (
        <>
          <Chips options={REGIONS} value={region} onChange={setRegion} compact={modes.length > 0} />
          {region === 'hr' ? <Chips options={HR_MODES} value={hrMode} onChange={setHrMode} compact /> : null}
        </>
      ) : null}
      {transfers ? (
        <>
          <Chips options={TRUST} value={trust} onChange={setTrust} compact />
          <Text style={[styles.legend, { color: p.textSecondary }]}>
            ●●● vrlo pouzdan (Romano, službeni računi) · ●●○ pouzdan (BBC, Sky, Guardian, Kicker…) · ●○○ ostali mediji
          </Text>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <AppHeader title="Portali" />
      {mode === 'rezultati' && sport ? (
        <ResultsList sport={sport} header={header} />
      ) : (
        <FeedList
          query={query}
          showSport={sport === null}
          showTransfer={transfers}
          emptyText={transfers ? 'Trenutno nema transfernih vijesti za ovaj odabir.' : 'Za ovaj odabir trenutno nema vijesti.'}
          header={header}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 10,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  legend: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
});
