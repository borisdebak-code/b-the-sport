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
  /** 1 very reliable, 2 reliable, 3 media / aggregator */
  source_reliability: number;
  transfer_stage: TransferStage | null;
}

export type TransferStage = 'sluzbeno' | 'dogovor' | 'pregovori' | 'glasina';

export const TRANSFER_STAGE_LABEL: Record<TransferStage, string> = {
  sluzbeno: 'Službeno',
  dogovor: 'Dogovoreno',
  pregovori: 'Pregovori',
  glasina: 'Glasina',
};

export const RELIABILITY_LABEL: Record<number, string> = {
  1: 'Vrlo pouzdan izvor',
  2: 'Pouzdan izvor',
  3: 'Medij',
};

export interface FeedQuery {
  kind: 'portal' | 'social' | null;
  entityIds?: number[] | null;
  transfers?: boolean;
  search?: string | null;
  minReliability?: number | null;
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
    p_entity_ids: q.entityIds ?? null,
    p_transfers: q.transfers ?? false,
    p_search: q.search ?? null,
    p_min_reliability: q.minReliability ?? null,
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

export interface EntityRow {
  id: number;
  name: string;
  kind: 'athlete' | 'club' | 'national_team';
  sport: SportId;
}

export async function fetchEntities(): Promise<EntityRow[]> {
  if (!supabase) throw new NotConfiguredError('Supabase nije povezan');
  const { data, error } = await supabase.from('followable_entities').select('id, name, kind, sport').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as EntityRow[];
}

/** Summer (1 Jun – 1 Sep) and winter (January) transfer windows of most European leagues. */
export function isTransferWindow(day: Date = new Date()): boolean {
  const m = day.getMonth() + 1;
  const d = day.getDate();
  return m === 1 || (m >= 6 && m <= 8) || (m === 9 && d === 1);
}

export interface MatchRow {
  id: string;
  sport: SportId;
  league_id: number;
  league_name: string;
  country: string | null;
  home: string;
  away: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  elapsed: number | null;
  starts_at: string;
}

export interface LeagueGroup {
  title: string;
  priority: number;
  data: MatchRow[];
}

/** Matches of one sport on a Zagreb calendar day (offset from today), grouped by competition. */
export async function fetchMatches(sport: SportId, dayOffset: number, now: Date = new Date()): Promise<LeagueGroup[]> {
  if (!supabase) throw new NotConfiguredError('Supabase nije povezan');
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  const end = new Date(start.getTime() + 864e5);
  const [m, l] = await Promise.all([
    supabase
      .from('matches')
      .select('id, sport, league_id, league_name, country, home, away, home_score, away_score, status, elapsed, starts_at')
      .eq('sport', sport)
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString())
      .order('starts_at'),
    supabase.from('result_leagues').select('league_id, name, priority').eq('sport', sport),
  ]);
  if (m.error) throw new Error(m.error.message);
  if (l.error) throw new Error(l.error.message);
  const meta = new Map((l.data ?? []).map((r) => [r.league_id as number, r as { name: string; priority: number }]));
  const groups = new Map<number, LeagueGroup>();
  for (const row of (m.data ?? []) as MatchRow[]) {
    const g = groups.get(row.league_id) ?? {
      title: meta.get(row.league_id)?.name ?? row.league_name,
      priority: meta.get(row.league_id)?.priority ?? 99,
      data: [],
    };
    g.data.push(row);
    groups.set(row.league_id, g);
  }
  return [...groups.values()].sort((a, b) => a.priority - b.priority);
}

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT']);
const DONE = new Set(['FT', 'AET', 'PEN', 'AOT', 'AP']);

export type MatchPhase = 'scheduled' | 'live' | 'finished' | 'other';

export function matchPhase(status: string): MatchPhase {
  if (status === 'NS' || status === 'TBD') return 'scheduled';
  if (LIVE.has(status)) return 'live';
  if (DONE.has(status)) return 'finished';
  return 'other';
}

/** Short status text for a result row. */
export function matchStatusText(m: Pick<MatchRow, 'status' | 'elapsed' | 'starts_at'>): string {
  const phase = matchPhase(m.status);
  if (phase === 'scheduled') {
    const d = new Date(m.starts_at);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (phase === 'finished') return 'Kraj';
  if (phase === 'live') {
    if (m.status === 'HT') return 'Poluvr.';
    return m.elapsed ? `${m.elapsed}'` : 'Uživo';
  }
  const other: Record<string, string> = { PST: 'Odgođeno', CANC: 'Otkazano', ABD: 'Prekinuto', SUSP: 'Prekinuto', AWD: 'Službeni rez.', WO: 'B.b.' };
  return other[m.status] ?? m.status;
}

/** API team names of the user's favourite clubs / national teams for one sport. */
export async function fetchFavoriteTeams(entityIds: number[], sport: SportId): Promise<string[]> {
  if (!supabase || entityIds.length === 0) return [];
  const { data, error } = await supabase
    .from('followable_entities')
    .select('team_names')
    .in('id', entityIds)
    .eq('sport', sport);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => (r.team_names as string[]) ?? []);
}

/** Puts the favourite teams' matches in their own group on top. */
export function withFavoritesFirst(groups: LeagueGroup[], teams: string[]): { groups: LeagueGroup[]; favorite: Set<string> } {
  const names = new Set(teams.map((t) => t.toLowerCase()));
  const favorite = new Set<string>();
  const mine: MatchRow[] = [];
  for (const g of groups) {
    for (const m of g.data) {
      if (names.has(m.home.toLowerCase()) || names.has(m.away.toLowerCase())) {
        favorite.add(m.id);
        mine.push(m);
      }
    }
  }
  if (mine.length === 0) return { groups, favorite };
  mine.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return { groups: [{ title: 'Moji favoriti', priority: -1, data: mine }, ...groups], favorite };
}
