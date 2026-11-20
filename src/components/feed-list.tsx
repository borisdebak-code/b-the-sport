import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { MaxContentWidth, Spacing, usePalette } from '@/constants/theme';
import { fetchFeed, NotConfiguredError, type FeedEntry, type FeedQuery } from '@/lib/feed';

import { NewsCard } from './news-card';

const PAGE = 30;

type Status = 'loading' | 'ready' | 'error' | 'not-configured';

type FeedListProps = {
  query: Omit<FeedQuery, 'before' | 'limit'>;
  header?: ReactElement;
  showSport: boolean;
  showTransfer?: boolean;
  emptyText: string;
};

/** Remounts per query, so a new filter starts from a clean loading state. */
export function FeedList(props: FeedListProps) {
  return <FeedListInner key={JSON.stringify(props.query)} {...props} />;
}

function FeedListInner({
  query,
  header,
  showSport,
  showTransfer,
  emptyText,
}: FeedListProps) {
  const p = usePalette();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const key = JSON.stringify(query);
  const reqId = useRef(0);

  const load = useCallback(
    async () => {
      const id = ++reqId.current;
      setRefreshing(true);
      try {
        const rows = await fetchFeed({ ...JSON.parse(key), limit: PAGE });
        if (id !== reqId.current) return;
        setEntries(rows);
        setDone(rows.length < PAGE);
        setStatus('ready');
        setError(null);
      } catch (e) {
        if (id !== reqId.current) return;
        setStatus(e instanceof NotConfiguredError ? 'not-configured' : 'error');
        setError(String((e as Error).message ?? e));
      } finally {
        if (id === reqId.current) setRefreshing(false);
      }
    },
    [key],
  );

  useEffect(() => {
    // initial status is 'loading'; state is only set when the fetch settles
    const id = ++reqId.current;
    fetchFeed({ ...JSON.parse(key), limit: PAGE })
      .then((rows) => {
        if (id !== reqId.current) return;
        setEntries(rows);
        setDone(rows.length < PAGE);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (id !== reqId.current) return;
        setStatus(e instanceof NotConfiguredError ? 'not-configured' : 'error');
        setError(String((e as Error).message ?? e));
      });
  }, [key]);

  const loadMore = useCallback(async () => {
    if (loadingMore || done || status !== 'ready' || entries.length === 0) return;
    const id = reqId.current;
    setLoadingMore(true);
    try {
      const before = entries[entries.length - 1].published_at;
      const rows = await fetchFeed({ ...JSON.parse(key), before, limit: PAGE });
      if (id !== reqId.current) return;
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.cluster_id));
        return [...prev, ...rows.filter((r) => !seen.has(r.cluster_id))];
      });
      setDone(rows.length < PAGE);
    } catch {
      /* keep what we have; user can pull to refresh */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, done, status, entries, key]);

  let empty: ReactElement | null = null;
  if (status === 'loading') {
    empty = <ActivityIndicator style={styles.spinner} color={p.textSecondary} />;
  } else if (status === 'not-configured') {
    empty = (
      <Message
        title="Baza još nije povezana"
        body="Upiši EXPO_PUBLIC_SUPABASE_URL i EXPO_PUBLIC_SUPABASE_ANON_KEY u datoteku .env i ponovno pokreni aplikaciju."
      />
    );
  } else if (status === 'error') {
    empty = <Message title="Vijesti se nisu učitale" body={`${error ?? ''}\nPovuci prema dolje za ponovni pokušaj.`} />;
  } else {
    empty = <Message title="Nema vijesti" body={emptyText} />;
  }

  return (
    <FlatList
      data={status === 'ready' ? entries : []}
      keyExtractor={(e) => String(e.cluster_id)}
      renderItem={({ item }) => <NewsCard entry={item} showSport={showSport} showTransfer={showTransfer} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.more} color={p.textSecondary} /> : undefined}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      contentContainerStyle={styles.content}
      style={{ backgroundColor: p.background }}
    />
  );
}

function Message({ title, body }: { title: string; body: string }) {
  const p = usePalette();
  return (
    <View style={styles.message}>
      <Text style={[styles.messageTitle, { color: p.text }]}>{title}</Text>
      <Text style={[styles.messageBody, { color: p.textSecondary }]}>{body}</Text>
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
  more: {
    marginVertical: Spacing.five,
  },
  message: {
    marginTop: Spacing.six * 2,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  messageTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
