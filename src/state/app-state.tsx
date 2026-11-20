import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchActiveSeasonal } from '@/lib/feed';
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
}

const Ctx = createContext<AppState | null>(null);
const HIDDEN_KEY = 'bts.hiddenSources';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [sport, setSport] = useState<SportId | null>(null);
  const [activeSeasonal, setActiveSeasonal] = useState<Set<string>>(
    () => new Set(isWinterSeason() ? ['zimski'] : []),
  );
  const [hiddenSources, setHiddenSources] = useState<number[]>([]);

  useEffect(() => {
    fetchActiveSeasonal()
      .then((s) => setActiveSeasonal(new Set(s)))
      .catch(() => {
        /* keep the local winter-season fallback */
      });
    AsyncStorage.getItem(HIDDEN_KEY)
      .then((v) => v && setHiddenSources(JSON.parse(v)))
      .catch(() => {});
  }, []);

  // A seasonal tab that disappears must not stay selected.
  useEffect(() => {
    if ((sport === 'zimski' || sport === 'vaterpolo') && !activeSeasonal.has(sport)) setSport(null);
  }, [sport, activeSeasonal]);

  const toggleSource = useCallback((id: number) => {
    setHiddenSources((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ sport, setSport, activeSeasonal, hiddenSources, toggleSource }),
    [sport, activeSeasonal, hiddenSources, toggleSource],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside AppStateProvider');
  return v;
}
