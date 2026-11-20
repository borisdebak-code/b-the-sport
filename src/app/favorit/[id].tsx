import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { FeedList } from '@/components/feed-list';
import { usePalette } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

/** Everything about one favourite: portals and social posts together. */
export default function FavoritScreen() {
  const p = usePalette();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { hiddenSources } = useAppState();
  const query = useMemo(
    () => ({ kind: null, entityIds: [Number(id)], hiddenSources }),
    [id, hiddenSources],
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <Stack.Screen options={{ title: name ?? 'Favorit' }} />
      <FeedList
        query={query}
        showSport
        emptyText="U zadnjih 30 dana nema vijesti o ovom favoritu."
        header={<View style={{ height: 12 }} />}
      />
    </View>
  );
}
