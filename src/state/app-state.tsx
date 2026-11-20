import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchActiveSeasonal, type FeedEntry } from '@/lib/feed';
import { isWinterSeason, type SportId } from '@/lib/sports';

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
      .catch(() => {});
  }, []);

  // A seasonal tab that disappears must not stay selected.
  const effectiveSport =
    (selectedSport === 'zimski' || selectedSport === 'vaterpolo') && !activeSeasonal.has(selectedSport)
      ? null
      : selectedSport;

  const toggleSource = useCallback((id: number) => {
    setHiddenSources((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      persist(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((f: Favorite) => {
    setFavorites((prev) => {
      const next = prev.some((x) => x.id === f.id) ? prev.filter((x) => x.id !== f.id) : [...prev, f];
      persist(FAVORITES_KEY, next);
      return next;
    });
  }, []);
  const isFavorite = useCallback((id: number) => favorites.some((f) => f.id === id), [favorites]);

  const toggleSaved = useCallback((e: FeedEntry) => {
    setSaved((prev) => {
      const next = prev.some((x) => x.cluster_id === e.cluster_id)
        ? prev.filter((x) => x.cluster_id !== e.cluster_id)
        : [e, ...prev];
      persist(SAVED_KEY, next);
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
    }),
    [effectiveSport, activeSeasonal, hiddenSources, toggleSource, favorites, isFavorite, toggleFavorite, saved, isSaved, toggleSaved],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside AppStateProvider');
  return v;
}
