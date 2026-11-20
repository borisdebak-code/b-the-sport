import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { fetchActiveSeasonal, type FeedEntry } from '@/lib/feed';
import { useSession } from '@/lib/auth';
import { isWinterSeason, type SportId } from '@/lib/sports';
import { mergeState, pullUserData, pushLocal, remoteFavorite, remoteHidden, remoteSaved } from '@/lib/sync';

interface AppState {
  /** Selected sport tab, shared by Portali and Mreže. null = "Sve". */
  sport: SportId | null;
  setSport: (s: SportId | null) => void;
  /** Seasonal sports whose tab is visible today. */
  activeSeasonal: Set<string>;
  /** Sources the user switched off (stored on the device). */
  hiddenSources: number[];
  toggleSource: (id: number) => void;
  /** Followed clubs, national teams and athletes (stored on the device). */
  favorites: Favorite[];
  isFavorite: (id: number) => boolean;
  toggleFavorite: (f: Favorite) => void;
  /** Saved articles (stored on the device, never pruned). */
  saved: FeedEntry[];
  isSaved: (clusterId: number) => boolean;
  toggleSaved: (e: FeedEntry) => void;
  /** Signed-in e-mail, when the optional sign-in is used. */
  userEmail: string | null;
  syncError: string | null;
}

export interface Favorite {
  id: number;
  name: string;
  sport: string;
  kind: string;
}

const Ctx = createContext<AppState | null>(null);
const HIDDEN_KEY = 'bts.hiddenSources';
const FAVORITES_KEY = 'bts.favorites';
const SAVED_KEY = 'bts.saved';

function persist(key: string, value: unknown) {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selectedSport, setSport] = useState<SportId | null>(null);
  const [activeSeasonal, setActiveSeasonal] = useState<Set<string>>(
    () => new Set(isWinterSeason() ? ['zimski'] : []),
  );
  const [hiddenSources, setHiddenSources] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [saved, setSaved] = useState<FeedEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const session = useSession();
  const userId = session?.user.id ?? null;
  const signedIn = useRef(false);
  useEffect(() => {
    signedIn.current = !!userId;
  }, [userId]);

  useEffect(() => {
    fetchActiveSeasonal()
      .then((s) => setActiveSeasonal(new Set(s)))
      .catch(() => {
        /* keep the local winter-season fallback */
      });
    AsyncStorage.multiGet([HIDDEN_KEY, FAVORITES_KEY, SAVED_KEY])
      .then((pairs) => {
        const get = (k: string) => pairs.find(([key]) => key === k)?.[1];
        const h = get(HIDDEN_KEY);
        const f = get(FAVORITES_KEY);
        const sv = get(SAVED_KEY);
        if (h) setHiddenSources(JSON.parse(h));
        if (f) setFavorites(JSON.parse(f));
        if (sv) setSaved(JSON.parse(sv));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // On sign-in: merge what is on this device with what the account already has.
  const local = useRef({ favorites, saved, hiddenSources });
  useEffect(() => {
    local.current = { favorites, saved, hiddenSources };
  }, [favorites, saved, hiddenSources]);
  useEffect(() => {
    if (!userId || !loaded) return;
    let cancelled = false;
    pullUserData()
      .then(async (remote) => {
        if (cancelled) return;
        await pushLocal(local.current, remote);
        const merged = mergeState(local.current, remote);
        setFavorites(merged.favorites);
        setSaved(merged.saved);
        setHiddenSources(merged.hiddenSources);
        persist(FAVORITES_KEY, merged.favorites);
        persist(SAVED_KEY, merged.saved);
        persist(HIDDEN_KEY, merged.hiddenSources);
        setSyncError(null);
      })
      .catch((e: unknown) => !cancelled && setSyncError(String((e as Error).message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [userId, loaded]);

  // A seasonal tab that disappears must not stay selected.
  const effectiveSport =
    (selectedSport === 'zimski' || selectedSport === 'vaterpolo') && !activeSeasonal.has(selectedSport)
      ? null
      : selectedSport;

  const toggleSource = useCallback((id: number) => {
    setHiddenSources((prev) => {
      const hide = !prev.includes(id);
      const next = hide ? [...prev, id] : prev.filter((x) => x !== id);
      persist(HIDDEN_KEY, next);
      if (signedIn.current) remoteHidden(id, hide);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((f: Favorite) => {
    setFavorites((prev) => {
      const on = !prev.some((x) => x.id === f.id);
      const next = on ? [...prev, f] : prev.filter((x) => x.id !== f.id);
      persist(FAVORITES_KEY, next);
      if (signedIn.current) remoteFavorite(f.id, on);
      return next;
    });
  }, []);
  const isFavorite = useCallback((id: number) => favorites.some((f) => f.id === id), [favorites]);

  const toggleSaved = useCallback((e: FeedEntry) => {
    setSaved((prev) => {
      const on = !prev.some((x) => x.cluster_id === e.cluster_id);
      const next = on ? [e, ...prev] : prev.filter((x) => x.cluster_id !== e.cluster_id);
      persist(SAVED_KEY, next);
      if (signedIn.current) remoteSaved(e, on);
      return next;
    });
  }, []);
  const isSaved = useCallback((clusterId: number) => saved.some((x) => x.cluster_id === clusterId), [saved]);

  const value = useMemo(
    () => ({
      sport: effectiveSport,
      setSport,
      activeSeasonal,
      hiddenSources,
      toggleSource,
      favorites,
      isFavorite,
      toggleFavorite,
      saved,
      isSaved,
      toggleSaved,
      userEmail: session?.user.email ?? null,
      syncError,
    }),
    [session, syncError, effectiveSport, activeSeasonal, hiddenSources, toggleSource, favorites, isFavorite, toggleFavorite, saved, isSaved, toggleSaved],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside AppStateProvider');
  return v;
}
