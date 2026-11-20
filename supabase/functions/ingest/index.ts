// Edge Function: pulls every enabled RSS/YouTube feed, classifies, translates,
// stores new items and clusters them into stories.
// Scheduled every 5 minutes with pg_cron (see supabase/cron.sql).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { classifySport, isTransfer, transferStage } from '../_shared/classify.ts';
import { discoverFeeds, parseFeed, youtubeFeedFromChannelPage, type FeedItem } from '../_shared/feed.ts';
import { needsTranslation, translatorFromEnv } from '../_shared/translate.ts';

const USER_AGENT = 'Mozilla/5.0 (compatible; BTheSport/1.0; personal news reader)';
const MAX_ITEMS_PER_FEED = 40;

interface FeedRow {
  feed_url: string;
  sport: string | null;
  source: { id: number; lang: string; kind: string; network: string; default_sport: string | null; item_url_filter: string | null };
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const translator = translatorFromEnv((k) => Deno.env.get(k));

async function loadFeeds(): Promise<FeedRow[]> {
  const feeds: FeedRow[] = [];
  const { data: sources, error } = await supabase
    .from('sources')
    .select('id, lang, kind, network, default_sport, item_url_filter, feed_url, source_feeds(feed_url, sport)')
    .eq('enabled', true)
    .in('network', ['rss', 'youtube']);
  if (error) throw error;
  for (const s of sources ?? []) {
    const source = { id: s.id, lang: s.lang, kind: s.kind, network: s.network, default_sport: s.default_sport, item_url_filter: s.item_url_filter };
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
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8' },
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
  const filter = feed.source.item_url_filter;
  const parsed = parseFeed(xml, feed.feed_url)
    .filter((i) => !filter || i.url.toLowerCase().includes(filter))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_ITEMS_PER_FEED);
  const fresh = (await newOnly(parsed)).filter((i) => i.publishedAt.getTime() > Date.now() - 30 * 864e5);
  if (fresh.length === 0) return 0;

  // Classify on the original text first; only sport items are worth translation budget.
  const sports = fresh.map((i) =>
    classifySport({
      url: i.url,
      title: i.title,
      summary: i.summary,
      categories: i.categories,
      feedSport: feed.sport ?? feed.source.default_sport,
    }),
  );

  // Titles only: summaries would exceed the free translation quota.
  const titlesHr: (string | null)[] = fresh.map(() => null);
  if (translator && needsTranslation(feed.source.lang)) {
    const todo = fresh.map((i, idx) => [idx, i.title] as const).filter(([idx]) => sports[idx] !== 'ostalo');
    const chars = todo.reduce((n, [, t]) => n + t.length, 0);
    if (todo.length > 0) {
      const { data: allowed } = await supabase.rpc('reserve_translation_chars', { p_chars: chars });
      if (allowed) {
        try {
          const out = await translator.translate(todo.map(([, t]) => t), feed.source.lang);
          todo.forEach(([idx], k) => (titlesHr[idx] = out[k] ?? null));
        } catch (e) {
          console.error('translation failed', feed.feed_url, e);
        }
      }
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
    summary_hr: null,
    sport: sports[idx],
    ...transferFields(`${i.title} ${titlesHr[idx] ?? ''} ${i.summary ?? ''}`),
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

function transferFields(text: string): { is_transfer: boolean; transfer_stage: string | null } {
  const is = isTransfer(text);
  return { is_transfer: is, transfer_stage: is ? transferStage(text) : null };
}

const SPORT_FEED = /sport|telesport|futbol|calcio|fussball/i;

function guessFeedUrls(homepage: string): string[] {
  const u = new URL(homepage);
  const base = homepage.replace(/\/$/, '');
  return [
    `${base}/rss`, `${base}/feed`, `${base}/rss.xml`, `${base}/feed/`,
    `${u.origin}/rss/sport`, `${u.origin}/sport/rss`, `${u.origin}/feed/sport`, `${u.origin}/rss/sport.xml`,
    `${u.origin}/feeds/sport.xml`, `${u.origin}/sport/feed`, `${u.origin}/rss`, `${u.origin}/feed`,
    `${u.origin}/rss.xml`, `${u.origin}/feed/`,
  ];
}

/** A general feed on a portal whose sports section lives under a path gets a URL filter. */
function urlFilterFor(homepage: string | null, feedUrl: string): string | null {
  if (!homepage || SPORT_FEED.test(feedUrl)) return null;
  const path = new URL(homepage).pathname.replace(/\/$/, '');
  return path && path !== '' ? `${path.toLowerCase()}/` : null;
}

// Translate-backfill mode: translate recent sport titles that arrived without a translation.
async function translateBackfill(): Promise<Record<string, number | string>> {
  if (!translator) return { error: 'no translator configured' };
  const { data, error } = await supabase
    .from('items')
    .select('id, title, lang')
    .is('title_hr', null)
    .not('lang', 'in', '(hr,sr,bs,cnr)')
    .neq('sport', 'ostalo')
    .gt('published_at', new Date(Date.now() - 2 * 864e5).toISOString())
    .limit(1000);
  if (error) throw error;
  const byLang = new Map<string, { id: number; title: string }[]>();
  for (const r of data ?? []) byLang.set(r.lang, [...(byLang.get(r.lang) ?? []), r]);
  const out: Record<string, number | string> = {};
  for (const [lang, rows] of byLang) {
    for (let k = 0; k < rows.length; k += 50) {
      const batch = rows.slice(k, k + 50);
      const chars = batch.reduce((n, r) => n + r.title.length, 0);
      const { data: allowed } = await supabase.rpc('reserve_translation_chars', { p_chars: chars });
      if (!allowed) {
        out[lang] = 'budget reached';
        break;
      }
      const tr = await translator.translate(batch.map((r) => r.title), lang);
      for (let j = 0; j < batch.length; j++) {
        await supabase.from('items').update({ title_hr: tr[j] }).eq('id', batch[j].id);
      }
      out[lang] = ((out[lang] as number) || 0) + batch.length;
    }
  }
  return out;
}

// Reclassify mode: re-run sport classification over stored items (after keyword changes).
async function reclassifyAll(): Promise<{ checked: number; changed: number }> {
  let checked = 0;
  let changed = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('items')
      .select('id, url, title, summary, title_hr, summary_hr, sport, is_transfer, transfer_stage, sources(default_sport)')
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const it of data) {
      checked++;
      const src = it.sources as unknown as { default_sport: string | null } | null;
      const sport = classifySport({
        url: it.url,
        title: it.title_hr ?? it.title,
        summary: it.summary_hr ?? it.summary,
        feedSport: src?.default_sport ?? null,
      });
      const t = transferFields(`${it.title} ${it.title_hr ?? ''} ${it.summary ?? ''}`);
      if (sport !== it.sport || t.is_transfer !== it.is_transfer || t.transfer_stage !== it.transfer_stage) {
        changed++;
        await supabase.from('items').update({ sport, ...t }).eq('id', it.id);
      }
    }
  }
  return { checked, changed };
}

// Verify mode: find a working feed for every source (known URL, RSS autodiscovery
// on the homepage, or the YouTube channel feed) and store it.
async function verifySources(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('sources')
    .select('id, slug, network, homepage, feed_url')
    .in('network', ['rss', 'youtube']);
  if (error) throw error;
  const report: Record<string, string> = {};
  const queue = [...(data ?? [])];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const s = queue.shift()!;
      const candidates: string[] = s.feed_url ? [s.feed_url] : [];
      const guesses = s.network === 'rss' && s.homepage ? guessFeedUrls(s.homepage) : [];
      try {
        if (s.homepage) {
          const html = await fetchFeed(s.homepage);
          if (s.network === 'youtube') {
            const yt = youtubeFeedFromChannelPage(html);
            if (yt) candidates.push(yt);
          } else {
            candidates.push(...discoverFeeds(html, s.homepage));
          }
        }
      } catch (e) {
        report[s.slug] = `homepage: ${e}`;
      }
      let found: string | null = null;
      for (const c of [...new Set([...candidates, ...guesses])]) {
        try {
          if (parseFeed(await fetchFeed(c), c).length > 0) {
            found = c;
            break;
          }
        } catch {
          /* try next candidate */
        }
      }
      if (found) {
        const filter = s.network === 'rss' ? urlFilterFor(s.homepage, found) : null;
        report[s.slug] = `ok ${found}${filter ? ` (filter ${filter})` : ''}`;
        await supabase
          .from('sources')
          .update({ feed_url: found, item_url_filter: filter, verified: true, last_error: null })
          .eq('id', s.id);
      } else {
        report[s.slug] ??= candidates.length ? 'no working feed' : 'no feed found';
        await supabase.from('sources').update({ verified: false, last_error: `verify: ${report[s.slug]}`.slice(0, 500) }).eq('id', s.id);
      }
    }
  });
  await Promise.all(workers);
  return report;
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const secret = Deno.env.get('INGEST_SECRET');
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.mode === 'verify') {
    return Response.json(await verifySources());
  }
  if (body?.mode === 'translate-backfill') {
    return Response.json(await translateBackfill());
  }
  if (body?.mode === 'reclassify') {
    return Response.json(await reclassifyAll());
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
