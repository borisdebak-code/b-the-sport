import { supabase } from './supabase';
import type { SportId } from './sports';

export type Region = 'hr' | 'regija' | 'svijet';

export interface FeedOther {
  name: string;
  url: string;
  title: string;
}

export interface FeedEntry {
  cluster_id: number;
  sport: SportId;
  item_id: number;
  title: string;
  summary: string | null;
  translated: boolean;
  original_title: string;
  url: string;
  image_url: string | null;
  published_at: string;
  source_name: string;
  source_network: string;
  source_count: number;
  others: FeedOther[];
}

export interface FeedQuery {
  kind: 'portal' | 'social';
  region?: Region | null;
  sports?: SportId[] | null;
  croatsAbroad?: boolean;
  network?: string | null;
  hiddenSources?: number[];
  before?: string | null;
  limit?: number;
}

export class NotConfiguredError extends Error {}

export async function fetchFeed(q: FeedQuery): Promise<FeedEntry[]> {
  if (!supabase) throw new NotConfiguredError('Supabase nije povezan');
  const { data, error } = await supabase.rpc('get_feed', {
    p_kind: q.kind,
    p_region: q.region ?? null,
    p_sports: q.sports ?? null,
    p_croats_abroad: q.croatsAbroad ?? false,
    p_network: q.network ?? null,
    p_hidden_sources: q.hiddenSources ?? [],
    p_before: q.before ?? null,
    p_limit: q.limit ?? 30,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedEntry[];
}

export async function fetchActiveSeasonal(): Promise<string[]> {
  if (!supabase) throw new NotConfiguredError('Supabase nije povezan');
  const { data, error } = await supabase.rpc('active_seasonal_sports');
  if (error) throw new Error(error.message);
  return (data ?? []) as string[];
}

export interface SourceRow {
  id: number;
  name: string;
  kind: 'portal' | 'social';
  network: string;
  region: Region;
  country: string;
  verified: boolean;
  last_error: string | null;
}

export async function fetchSources(): Promise<SourceRow[]> {
  if (!supabase) throw new NotConfiguredError('Supabase nije povezan');
  const { data, error } = await supabase
    .from('sources')
    .select('id, name, kind, network, region, country, verified, last_error')
    .eq('enabled', true)
    .order('region')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as SourceRow[];
}

/** "prije 5 min", "prije 3 h", "jučer u 18:30", "19. 11. u 18:30" */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'upravo';
  if (mins < 60) return `prije ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 6) return `prije ${hours} h`;
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startOfToday) return `danas u ${hhmm}`;
  if (d.getTime() >= startOfToday - 864e5) return `jučer u ${hhmm}`;
  return `${d.getDate()}. ${d.getMonth() + 1}. u ${hhmm}`;
}
