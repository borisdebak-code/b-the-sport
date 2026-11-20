export type SportId =
  | 'nogomet'
  | 'kosarka'
  | 'rukomet'
  | 'tenis'
  | 'vaterpolo'
  | 'f1moto'
  | 'borilacki'
  | 'zimski'
  | 'ostalo';

export interface SportTab {
  id: SportId | null; // null = "Sve"
  label: string;
  seasonal?: boolean;
}

// Order follows the usual layout of Croatian sports portals.
export const SPORT_TABS: SportTab[] = [
  { id: null, label: 'Sve' },
  { id: 'nogomet', label: 'Nogomet' },
  { id: 'kosarka', label: 'Košarka' },
  { id: 'rukomet', label: 'Rukomet' },
  { id: 'tenis', label: 'Tenis' },
  { id: 'vaterpolo', label: 'Vaterpolo', seasonal: true },
  { id: 'f1moto', label: 'F1/Moto' },
  { id: 'borilacki', label: 'Borilački' },
  { id: 'zimski', label: 'Zimski sportovi', seasonal: true },
  { id: 'ostalo', label: 'Ostali sportovi' },
];

export const SPORT_LABEL: Record<SportId, string> = Object.fromEntries(
  SPORT_TABS.filter((t) => t.id).map((t) => [t.id, t.label]),
) as Record<SportId, string>;

/** Winter sports season: 1 November – 31 March. */
export function isWinterSeason(day: Date = new Date()): boolean {
  const m = day.getMonth() + 1;
  return m >= 11 || m <= 3;
}

/** Tabs visible today, given the seasonal sports the database reports as active. */
export function visibleTabs(activeSeasonal: Set<string>): SportTab[] {
  return SPORT_TABS.filter((t) => !t.seasonal || (t.id && activeSeasonal.has(t.id)));
}

/**
 * When a seasonal tab is hidden, its articles belong to "Ostali sportovi".
 * Returns the sport ids the feed should request for a selected tab.
 */
export function sportsForTab(tab: SportId | null, activeSeasonal: Set<string>): SportId[] | null {
  if (tab === null) return null;
  if (tab !== 'ostalo') return [tab];
  const hidden = SPORT_TABS.filter((t) => t.seasonal && t.id && !activeSeasonal.has(t.id)).map((t) => t.id!) as SportId[];
  return ['ostalo', ...hidden];
}
