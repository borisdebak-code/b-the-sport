// ESPN public scoreboard (site.api.espn.com) → rows of public.matches.
// Unofficial but keyless; used only for the competitions it covers.

export interface EspnLeague {
  sport: string;       // our sport id: 'nogomet' | 'kosarka'
  league_id: number;   // our id for the competition (API-Sports numbering, keeps priorities)
  name: string;
  espn_code: string;   // 'eng.1', 'uefa.champions', 'nba' ...
}

export function espnUrl(l: EspnLeague, yyyymmdd: string): string {
  const path = l.sport === 'kosarka' ? `basketball/${l.espn_code}` : `soccer/${l.espn_code}`;
  return `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${yyyymmdd}`;
}

/** ESPN status → the short API-Sports style codes the app already understands. */
export function espnStatus(type: { state?: string; name?: string; completed?: boolean }, clock?: string, period?: number) {
  const name = type.name ?? '';
  if (name.includes('POSTPONED')) return { status: 'PST', elapsed: null };
  if (name.includes('CANCELED') || name.includes('CANCELLED')) return { status: 'CANC', elapsed: null };
  if (name.includes('HALFTIME')) return { status: 'HT', elapsed: null };
  if (type.state === 'pre') return { status: 'NS', elapsed: null };
  if (type.state === 'post' || type.completed) return { status: 'FT', elapsed: null };
  const minute = clock ? parseInt(clock, 10) : NaN;
  return { status: period && period > 2 ? 'ET' : 'LIVE', elapsed: Number.isFinite(minute) ? minute : null };
}

const num = (s: unknown) => (s === undefined || s === null || s === '' ? null : Number(s));

export function espnMatches(l: EspnLeague, json: any, now: string = new Date().toISOString()) {
  const out = [];
  for (const ev of json?.events ?? []) {
    const comp = ev.competitions?.[0];
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;
    const st = espnStatus(ev.status?.type ?? comp?.status?.type ?? {}, ev.status?.displayClock, ev.status?.period);
    const pre = st.status === 'NS';
    out.push({
      id: `espn:${l.espn_code}:${ev.id}`,
      sport: l.sport,
      league_id: l.league_id,
      league_name: l.name,
      country: null,
      league_logo: null,
      round: null,
      home: home.team?.displayName ?? home.team?.name ?? '?',
      away: away.team?.displayName ?? away.team?.name ?? '?',
      home_logo: home.team?.logo ?? null,
      away_logo: away.team?.logo ?? null,
      home_score: pre ? null : num(home.score),
      away_score: pre ? null : num(away.score),
      status: st.status,
      status_long: ev.status?.type?.description ?? null,
      elapsed: st.elapsed,
      starts_at: new Date(ev.date).toISOString(),
      updated_at: now,
    });
  }
  return out;
}
