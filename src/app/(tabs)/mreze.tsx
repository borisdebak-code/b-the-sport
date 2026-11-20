import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chips, type ChipOption } from '@/components/chips';
import { FeedList } from '@/components/feed-list';
import { Spacing, usePalette } from '@/constants/theme';
import { sportsForTab } from '@/lib/sports';
import { useAppState } from '@/state/app-state';

type Network = 'sve' | 'youtube' | 'bluesky' | 'instagram' | 'x' | 'facebook';

const NETWORKS: ChipOption<Network>[] = [
  { value: 'sve', label: 'Sve' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X' },
  { value: 'facebook', label: 'Facebook' },
];

const COMING: Partial<Record<Network, string>> = {
  bluesky: 'Na Blueskyju pratimo samo račune potvrđene vlastitom domenom: The Athletic, Guardian Sport i Bloody Elbow.',
  instagram: 'Instagram stiže u fazi 2, kad se tvoj profil prebaci u Creator tip i poveže.',
  x: 'X je planiran za fazu 3 jer besplatni API ne omogućuje čitanje tuđih objava.',
  facebook: 'Facebook je planiran za fazu 3, nakon Metinog odobrenja.',
};

export default function MrezeScreen() {
  const p = usePalette();
  const { sport, activeSeasonal, hiddenSources } = useAppState();
  const [network, setNetwork] = useState<Network>('sve');

  const query = useMemo(
    () => ({
      kind: 'social' as const,
      network: network === 'sve' ? null : network,
      sports: sportsForTab(sport, activeSeasonal),
      hiddenSources,
    }),
    [network, sport, activeSeasonal, hiddenSources],
  );

  const note = COMING[network];

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <AppHeader title="Društvene mreže" />
      <FeedList
        query={query}
        showSport={sport === null}
        emptyText={note ?? 'Za ovaj odabir trenutno nema objava.'}
        header={
          <View>
            <Chips options={NETWORKS} value={network} onChange={setNetwork} />
            {note ? <Text style={[styles.note, { color: p.textSecondary }]}>{note}</Text> : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
});
