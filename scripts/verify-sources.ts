// Checks every source's feed: fetches it, parses it, and for sources without a
// feed URL tries RSS autodiscovery on the homepage (YouTube: resolves the channel feed).
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run verify-sources            # report only
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run verify-sources -- --write # store results
//
// Needs network access to the portals.
import { createClient } from '@supabase/supabase-js';
import { discoverFeeds, parseFeed, youtubeFeedFromChannelPage } from '../supabase/functions/_shared/feed.ts';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const write = process.argv.includes('--write');
const supabase = createClient(url, key, { auth: { persistSession: false } });
const UA = 'Mozilla/5.0 (compatible; BTheSport/1.0)';

async function get(u: string): Promise<string> {
  const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function tryFeed(feedUrl: string): Promise<number> {
  return parseFeed(await get(feedUrl), feedUrl).length;
}

interface Row { id: number; slug: string; network: string; homepage: string | null; feed_url: string | null }

const { data, error } = await supabase.from('sources').select('id, slug, network, homepage, feed_url').in('network', ['rss', 'youtube']).order('id');
if (error) throw error;

const report: { slug: string; status: string; feed?: string; items?: number }[] = [];
for (const s of (data ?? []) as Row[]) {
  const candidates: string[] = [];
  try {
    if (s.feed_url) candidates.push(s.feed_url);
    if (s.homepage) {
      const html = await get(s.homepage);
      if (s.network === 'youtube') {
        const yt = youtubeFeedFromChannelPage(html);
        if (yt) candidates.push(yt);
      } else {
        candidates.push(...discoverFeeds(html, s.homepage));
      }
    }
  } catch (e) {
    if (candidates.length === 0) {
      report.push({ slug: s.slug, status: `homepage error: ${e}` });
      continue;
    }
  }

  let ok: { feed: string; items: number } | null = null;
  for (const c of [...new Set(candidates)]) {
    try {
      const n = await tryFeed(c);
      if (n > 0) { ok = { feed: c, items: n }; break; }
    } catch { /* try next */ }
  }

  if (ok) {
    report.push({ slug: s.slug, status: 'ok', ...ok });
    if (write) await supabase.from('sources').update({ feed_url: ok.feed, verified: true, last_error: null }).eq('id', s.id);
  } else {
    report.push({ slug: s.slug, status: candidates.length ? 'no working feed' : 'no feed found' });
    if (write) await supabase.from('sources').update({ verified: false, last_error: 'verify: no working feed' }).eq('id', s.id);
  }
}

console.table(report);
const good = report.filter((r) => r.status === 'ok').length;
console.log(`${good}/${report.length} sources have a working feed.${write ? ' Results saved.' : ' Run with --write to save.'}`);
