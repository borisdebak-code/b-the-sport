// Edge Function: pulls every enabled RSS/YouTube feed, classifies, translates,
// stores new items and clusters them into stories.
// Scheduled every 5 minutes with pg_cron (see supabase/cron.sql).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { classifySport } from '../_shared/classify.ts';
import { parseFeed, type FeedItem } from '../_shared/feed.ts';
import { needsTranslation, translatorFromEnv } from '../_shared/translate.ts';

const USER_AGENT = 'BTheSport/1.0 (personal news reader)';
const MAX_ITEMS_PER_FEED = 40;

interface FeedRow {
  feed_url: string;
  sport: string | null;
  source: { id: number; lang: string; kind: string; network: string; default_sport: string | null };
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const translator = translatorFromEnv((k) => Deno.env.get(k));

async function loadFeeds(): Promise<FeedRow[]> {
  const feeds: FeedRow[] = [];
  const { data: sources, error } = await supabase
    .from('sources')
    .select('id, lang, kind, network, default_sport, feed_url, source_feeds(feed_url, sport)')
    .eq('enabled', true)
    .in('network', ['rss', 'youtube']);
  if (error) throw error;
  for (const s of sources ?? []) {
    const source = { id: s.id, lang: s.lang, kind: s.kind, network: s.network, default_sport: s.default_sport };
    const extra = (s.source_feeds as { feed_url: string; sport: string | null }[]) ?? [];
    if (extra.length > 0) {
      for (const f of extra) feeds.push({ feed_url: f.feed_url, sport: f.sport, source });
    } else if (s.feed_url) {
      feeds.push({ feed_url: s.feed_url, sport: s.default_sport, source });
    }
  }
  return feeds;
}

async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function newOnly(items: FeedItem[]): Promise<FeedItem[]> {
  if (items.length === 0) return [];
  const { data, error } = await supabase.from('items').select('url').in('url', items.map((i) => i.url));
  if (error) throw error;
  const known = new Set((data ?? []).map((r) => r.url));
  return items.filter((i) => !known.has(i.url));
}

async function processFeed(feed: FeedRow): Promise<number> {
  const xml = await fetchFeed(feed.feed_url);
  const parsed = parseFeed(xml, feed.feed_url)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_ITEMS_PER_FEED);
  const fresh = (await newOnly(parsed)).filter((i) => i.publishedAt.getTime() > Date.now() - 30 * 864e5);
  if (fresh.length === 0) return 0;

  let titlesHr: (string | null)[] = fresh.map(() => null);
  let summariesHr: (string | null)[] = fresh.map(() => null);
  if (translator && needsTranslation(feed.source.lang)) {
    try {
      titlesHr = await translator.translate(fresh.map((i) => i.title), feed.source.lang);
      const withSummary = fresh.map((i, idx) => [idx, i.summary] as const).filter(([, s]) => !!s);
      const translated = await translator.translate(withSummary.map(([, s]) => s!), feed.source.lang);
      withSummary.forEach(([idx], k) => (summariesHr[idx] = translated[k]));
    } catch (e) {
      console.error('translation failed', feed.feed_url, e);
    }
  }

  const rows = fresh.map((i, idx) => ({
    source_id: feed.source.id,
    url: i.url,
    title: i.title,
    summary: i.summary,
    image_url: i.imageUrl,
    published_at: i.publishedAt.toISOString(),
    lang: feed.source.lang,
    title_hr: titlesHr[idx],
    summary_hr: summariesHr[idx],
    sport: classifySport({
      url: i.url,
      title: titlesHr[idx] ?? i.title,
      summary: summariesHr[idx] ?? i.summary,
      categories: i.categories,
      feedSport: feed.sport ?? feed.source.default_sport,
    }),
  }));

  const { data: inserted, error } = await supabase
    .from('items')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;

  for (const { id } of inserted ?? []) {
    await supabase.rpc('finalize_item', { p_item_id: id });
  }
  return inserted?.length ?? 0;
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const secret = Deno.env.get('INGEST_SECRET');
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const feeds = await loadFeeds();
  const results: Record<string, number | string> = {};
  // Small concurrency so one slow portal does not block the rest.
  const queue = [...feeds];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const feed = queue.shift()!;
      try {
        results[feed.feed_url] = await processFeed(feed);
        await supabase.from('sources').update({ last_fetched_at: new Date().toISOString(), last_error: null }).eq('id', feed.source.id);
      } catch (e) {
        results[feed.feed_url] = String(e);
        await supabase.from('sources').update({ last_error: String(e).slice(0, 500) }).eq('id', feed.source.id);
      }
    }
  });
  await Promise.all(workers);
  await supabase.rpc('prune_old_items');

  return Response.json({ feeds: feeds.length, results });
});
