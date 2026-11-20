import type { FeedEntry } from './feed';
import { supabase } from './supabase';

export interface FavoriteRef {
  id: number;
  name: string;
  sport: string;
  kind: string;
}

export interface RemoteState {
  favorites: FavoriteRef[];
  saved: FeedEntry[];
  hiddenSources: number[];
}

/** Everything the signed-in user has stored on the server (RLS returns only their rows). */
export async function pullUserData(): Promise<RemoteState> {
  if (!supabase) throw new Error('Baza nije povezana');
  const [fav, saved, hidden] = await Promise.all([
    supabase.from('user_favorites').select('entity_id, entities(id, name, sport, kind)'),
    supabase.from('user_saved').select('entry, saved_at').order('saved_at', { ascending: false }),
    supabase.from('user_hidden_sources').select('source_id'),
  ]);
  for (const r of [fav, saved, hidden]) if (r.error) throw new Error(r.error.message);
  return {
    favorites: (fav.data ?? [])
      .map((r) => r.entities as unknown as FavoriteRef | null)
      .filter((e): e is FavoriteRef => !!e),
    saved: (saved.data ?? []).map((r) => r.entry as FeedEntry),
    hiddenSources: (hidden.data ?? []).map((r) => r.source_id as number),
  };
}

/** Uploads local items the server does not have yet (first sign-in on this device). */
export async function pushLocal(local: RemoteState, remote: RemoteState): Promise<void> {
  if (!supabase) return;
  const favIds = new Set(remote.favorites.map((f) => f.id));
  const savedIds = new Set(remote.saved.map((e) => e.cluster_id));
  const hiddenIds = new Set(remote.hiddenSources);
  const newFav = local.favorites.filter((f) => !favIds.has(f.id)).map((f) => ({ entity_id: f.id }));
  const newSaved = local.saved.filter((e) => !savedIds.has(e.cluster_id)).map((e) => ({ cluster_id: e.cluster_id, entry: e }));
  const newHidden = local.hiddenSources.filter((id) => !hiddenIds.has(id)).map((id) => ({ source_id: id }));
  await Promise.all([
    newFav.length ? supabase.from('user_favorites').upsert(newFav) : null,
    newSaved.length ? supabase.from('user_saved').upsert(newSaved) : null,
    newHidden.length ? supabase.from('user_hidden_sources').upsert(newHidden) : null,
  ]);
}

export function mergeState(local: RemoteState, remote: RemoteState): RemoteState {
  const favorites = [...remote.favorites];
  for (const f of local.favorites) if (!favorites.some((x) => x.id === f.id)) favorites.push(f);
  const saved = [...remote.saved];
  for (const e of local.saved) if (!saved.some((x) => x.cluster_id === e.cluster_id)) saved.push(e);
  const hiddenSources = [...new Set([...remote.hiddenSources, ...local.hiddenSources])];
  return { favorites, saved, hiddenSources };
}

// Single-row changes while signed in. Failures are ignored: the device copy stays
// correct and the next sign-in merge uploads what is missing.
export function remoteFavorite(entityId: number, on: boolean) {
  if (!supabase) return;
  const q = on
    ? supabase.from('user_favorites').upsert({ entity_id: entityId })
    : supabase.from('user_favorites').delete().eq('entity_id', entityId);
  void q.then(() => undefined);
}

export function remoteSaved(entry: FeedEntry, on: boolean) {
  if (!supabase) return;
  const q = on
    ? supabase.from('user_saved').upsert({ cluster_id: entry.cluster_id, entry })
    : supabase.from('user_saved').delete().eq('cluster_id', entry.cluster_id);
  void q.then(() => undefined);
}

export function remoteHidden(sourceId: number, hidden: boolean) {
  if (!supabase) return;
  const q = hidden
    ? supabase.from('user_hidden_sources').upsert({ source_id: sourceId })
    : supabase.from('user_hidden_sources').delete().eq('source_id', sourceId);
  void q.then(() => undefined);
}
