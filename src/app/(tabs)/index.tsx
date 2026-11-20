import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chips, type ChipOption } from '@/components/chips';
import { FeedList } from '@/components/feed-list';
import { Spacing, usePalette } from '@/constants/theme';
import { isTransferWindow, type Region } from '@/lib/feed';
import { sportsForTab } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

type RegionFilter = Region | 'sve';
type HrMode = 'portali' | 'hrvati-u-svijetu';

const REGIONS: ChipOption<RegionFilter>[] = [
  { value: 'sve', label: 'Sve' },
  { value: 'hr', label: 'Hrvatska' },
  { value: 'regija', label: 'Regija' },
  { value: 'svijet', label: 'Svijet' },
];

type FootballMode = 'vijesti' | 'transferi';
const FOOTBALL_MODES: ChipOption<FootballMode>[] = [
  { value: 'vijesti', label: 'Vijesti' },
  { value: 'transferi', label: 'Transfer centar' },
];

const HR_MODES: ChipOption<HrMode>[] = [
  { value: 'portali', label: 'Hrvatski portali' },
  { value: 'hrvati-u-svijetu', label: 'Hrvati u svijetu' },
];

export default function PortaliScreen() {
  const p = usePalette();
  const { sport, setSport, activeSeasonal, hiddenSources } = useAppState();
  const [footballMode, setFootballMode] = useState<FootballMode>('vijesti');
  const transfers = sport === 'nogomet' && footballMode === 'transferi';
  const inWindow = isTransferWindow();
  const [region, setRegion] = useState<RegionFilter>('sve');
  const [hrMode, setHrMode] = useState<HrMode>('portali');

  const abroad = region === 'hr' && hrMode === 'hrvati-u-svijetu';
  const query = useMemo(
    () =>
      transfers
        ? // Transfer centar: portals and social posts (Romano & co.) together
          { kind: null, transfers: true, sports: ['nogomet' as const], hiddenSources }
        : {
      kind: 'portal' as const,
      // "Hrvati u svijetu" = regional and world sources mentioning Croatian athletes
      region: abroad ? null : region === 'sve' ? null : region,
      croatsAbroad: abroad,
      sports: sportsForTab(sport, activeSeasonal),
      hiddenSources,
    },
    [transfers, abroad, region, sport, activeSeasonal, hiddenSources],
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <AppHeader title="Portali" />
      <FeedList
        query={query}
        showSport={sport === null}
        emptyText="Za ovaj odabir trenutno nema vijesti."
        header={
          <View>
            {inWindow && !transfers && (sport === null || sport === 'nogomet') ? (
              <Pressable
                onPress={() => {
                  setSport('nogomet');
                  setFootballMode('transferi');
                }}
                style={({ pressed }) => [styles.banner, { backgroundColor: p.accent }, pressed && { opacity: 0.85 }]}>
                <Ionicons name="swap-horizontal" size={18} color={p.accentText} />
                <Text style={[styles.bannerText, { color: p.accentText }]}>Prijelazni rok je otvoren · Transfer centar</Text>
              </Pressable>
            ) : null}
            {sport === 'nogomet' ? <Chips options={FOOTBALL_MODES} value={footballMode} onChange={setFootballMode} /> : null}
            {transfers ? null : (
              <>
                <Chips options={REGIONS} value={region} onChange={setRegion} compact={sport === 'nogomet'} />
                {region === 'hr' ? <Chips options={HR_MODES} value={hrMode} onChange={setHrMode} compact /> : null}
              </>
            )}
          </View>
        }
      />
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
});
