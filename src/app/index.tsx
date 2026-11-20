import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chips, type ChipOption } from '@/components/chips';
import { FeedList } from '@/components/feed-list';
import { usePalette } from '@/constants/theme';
import type { Region } from '@/lib/feed';
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

const HR_MODES: ChipOption<HrMode>[] = [
  { value: 'portali', label: 'Hrvatski portali' },
  { value: 'hrvati-u-svijetu', label: 'Hrvati u svijetu' },
];

export default function PortaliScreen() {
  const p = usePalette();
  const { sport, activeSeasonal, hiddenSources } = useAppState();
  const [region, setRegion] = useState<RegionFilter>('sve');
  const [hrMode, setHrMode] = useState<HrMode>('portali');

  const abroad = region === 'hr' && hrMode === 'hrvati-u-svijetu';
  const query = useMemo(
    () => ({
      kind: 'portal' as const,
      // "Hrvati u svijetu" = regional and world sources mentioning Croatian athletes
      region: abroad ? null : region === 'sve' ? null : region,
      croatsAbroad: abroad,
      sports: sportsForTab(sport, activeSeasonal),
      hiddenSources,
    }),
    [abroad, region, sport, activeSeasonal, hiddenSources],
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
            <Chips options={REGIONS} value={region} onChange={setRegion} />
            {region === 'hr' ? <Chips options={HR_MODES} value={hrMode} onChange={setHrMode} compact /> : null}
          </View>
        }
      />
    </View>
  );
}
