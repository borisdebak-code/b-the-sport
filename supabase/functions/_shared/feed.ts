// RSS 2.0 / Atom / YouTube feed parsing into a common item shape.
import { XMLParser } from 'fast-xml-parser';

export interface FeedItem {
  url: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  categories: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: '#cdata',
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => ['item', 'entry', 'category', 'link', 'media:content', 'media:thumbnail', 'enclosure'].includes(name),
});

type Node = Record<string, unknown> | string | number | undefined | null;

function text(node: Node): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  const n = node as Record<string, unknown>;
  if (n['#cdata'] != null) return text(n['#cdata'] as Node);
  if (n['#text'] != null) return text(n['#text'] as Node);
  return '';
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITY[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

export function shortSummary(raw: string, maxChars = 280): string | null {
  const plain = stripHtml(raw);
  if (!plain) return null;
  if (plain.length <= maxChars) return plain;
  const cut = plain.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
}

function firstImage(entry: Record<string, unknown>, html: string): string | null {
  const media = (entry['media:content'] as Record<string, unknown>[] | undefined) ?? [];
  for (const m of media) {
    const url = m['@_url'] as string | undefined;
    const medium = (m['@_medium'] as string | undefined) ?? '';
    const type = (m['@_type'] as string | undefined) ?? '';
    if (url && (medium === 'image' || type.startsWith('image') || /\.(jpe?g|png|webp)(\?|$)/i.test(url))) return url;
  }
  const thumbs = (entry['media:thumbnail'] as Record<string, unknown>[] | undefined) ?? [];
  if (thumbs[0]?.['@_url']) return thumbs[0]['@_url'] as string;
  const group = entry['media:group'] as Record<string, unknown> | undefined;
  const groupThumbs = (group?.['media:thumbnail'] as Record<string, unknown>[] | undefined) ?? [];
  if (groupThumbs[0]?.['@_url']) return groupThumbs[0]['@_url'] as string;
  const enclosures = (entry['enclosure'] as Record<string, unknown>[] | undefined) ?? [];
  for (const e of enclosures) {
    if (String(e['@_type'] ?? '').startsWith('image') && e['@_url']) return e['@_url'] as string;
  }
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? img[1] : null;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function absolutize(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

export function parseFeed(xml: string, feedUrl: string, now: Date = new Date()): FeedItem[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const out: FeedItem[] = [];

  const rssItems: Record<string, unknown>[] = doc?.rss?.channel?.item ?? doc?.['rdf:RDF']?.item ?? [];
  for (const it of rssItems) {
    const links = (it['link'] as Node[] | undefined) ?? [];
    const link = text(links[0]) || text(it['guid'] as Node);
    const title = stripHtml(text(it['title'] as Node));
    if (!link || !title) continue;
    const html = text(it['content:encoded'] as Node) || text(it['description'] as Node);
    const date = parseDate(text(it['pubDate'] as Node) || text(it['dc:date'] as Node)) ?? now;
    const categories = ((it['category'] as Node[] | undefined) ?? []).map(text).filter(Boolean);
    out.push({
      url: absolutize(link.trim(), feedUrl),
      title,
      summary: shortSummary(text(it['description'] as Node) || html),
      imageUrl: firstImage(it, html),
      publishedAt: date > now ? now : date,
      categories,
    });
  }

  const entries: Record<string, unknown>[] = doc?.feed?.entry ?? [];
  for (const e of entries) {
    const links = (e['link'] as Record<string, unknown>[] | undefined) ?? [];
    const alt = links.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate') ?? links[0];
    const link = (alt?.['@_href'] as string | undefined) ?? '';
    const title = stripHtml(text(e['title'] as Node));
    if (!link || !title) continue;
    const group = e['media:group'] as Record<string, unknown> | undefined;
    const html = text(e['content'] as Node) || text(e['summary'] as Node) || text(group?.['media:description'] as Node);
    const date = parseDate(text(e['published'] as Node) || text(e['updated'] as Node)) ?? now;
    const categories = ((e['category'] as Record<string, unknown>[] | undefined) ?? [])
      .map((c) => String(c['@_term'] ?? c['@_label'] ?? ''))
      .filter(Boolean);
    out.push({
      url: absolutize(link, feedUrl),
      title,
      summary: shortSummary(html),
      imageUrl: firstImage(e, html),
      publishedAt: date > now ? now : date,
      categories,
    });
  }

  return out;
}

// Find RSS/Atom links advertised in a homepage's <head>.
export function discoverFeeds(html: string, pageUrl: string): string[] {
  const found: string[] = [];
  const re = /<link\b[^>]*>/gi;
  for (const tag of html.match(re) ?? []) {
    if (!/rel=["']?alternate/i.test(tag)) continue;
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i);
    if (href) found.push(absolutize(href[1].replace(/&amp;/g, '&'), pageUrl));
  }
  return [...new Set(found)];
}

// YouTube: channel page → channel ID → RSS feed.
// The page mentions many channels (recommendations), so only the channel's own
// identifiers count: canonical link, og:url, itemprop identifier, then externalId.
export function youtubeFeedFromChannelPage(html: string): string | null {
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]{22})"/,
    /<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]{22})"/,
    /<meta itemprop="identifier" content="(UC[0-9A-Za-z_-]{22})"/,
    /"externalId":"(UC[0-9A-Za-z_-]{22})"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return `https://www.youtube.com/feeds/videos.xml?channel_id=${m[1]}`;
  }
  return null;
}

// Bluesky: public AppView API, no key needed.
export const BSKY_API = 'https://public.api.bsky.app/xrpc';

interface BskyPost {
  post: {
    uri: string;
    author: { handle: string };
    record: { text?: string; createdAt?: string };
    embed?: {
      $type?: string;
      images?: { thumb?: string }[];
      external?: { uri?: string; title?: string; description?: string; thumb?: string };
      media?: { images?: { thumb?: string }[]; external?: { thumb?: string } };
    };
  };
  reason?: { $type?: string };
}

/** Own posts (no reposts or replies) of one account as feed items. */
export function blueskyItems(feed: { feed?: BskyPost[] }, now: Date = new Date()): FeedItem[] {
  const out: FeedItem[] = [];
  for (const f of feed.feed ?? []) {
    if (f.reason) continue; // repost
    const p = f.post;
    const text = (p.record.text ?? '').replace(/\s+/g, ' ').trim();
    const ext = p.embed?.external;
    const title = text || ext?.title || '';
    if (!title) continue;
    const rkey = p.uri.split('/').pop();
    const date = p.record.createdAt ? new Date(p.record.createdAt) : now;
    out.push({
      url: `https://bsky.app/profile/${p.author.handle}/post/${rkey}`,
      title: title.length > 220 ? title.slice(0, 217).replace(/\s+\S*$/, '') + '…' : title,
      summary: ext?.title && ext.title !== title ? ext.title : null,
      imageUrl: p.embed?.images?.[0]?.thumb ?? ext?.thumb ?? p.embed?.media?.images?.[0]?.thumb ?? p.embed?.media?.external?.thumb ?? null,
      publishedAt: Number.isNaN(date.getTime()) || date > now ? now : date,
      categories: [],
    });
  }
  return out;
}
