// Edge Function: match results from API-Sports (football, basketball, handball).
// One request per sport per date. Free plan: 100 requests/day per sport, so the
// cron calls "today" every 15 minutes and yesterday/tomorrow a few times a day.
//
// Body:
//   {}                                   refresh today for all sports
//   { "days": [-1, 0, 1] }               refresh these day offsets
//   { "mode": "discover", "sport": "football", "day": 0 }
//                                         list competitions on that date (to choose result_leagues)
import { createClient } from 'npm:@supabase/supabase-js@2';

type Sport = 'football' | 'basketball' | 'handball';
const SPORT_ID: Record<Sport, string> = { football: 'nogomet', basketball: 'kosarka', handball: 'rukomet' };
const HOST: Record<Sport, string> = {
  football: 'https://v3.football.api-sports.io/fixtures',
  basketball: 'https://v1.basketball.api-sports.io/games',
  handball: 'https://v1.handball.api-sports.io/games',
};
const TZ = 'Europe/Zagreb';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

interface Match {
  id: string;
  sport: string;
  league_id: number;
  league_name: string;
  country: string | null;
  league_logo: string | null;
  round: string | null;
  home: string;
  away: string;
  home_logo: string | null;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  status_long: string | null;
  elapsed: number | null;
  starts_at: string;
  updated_at: string;
}

function zagrebDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

async function callApi(sport: Sport, date: string): Promise<any[]> {
  const res = await fetch(`${HOST[sport]}?date=${date}&timezone=${encodeURIComponent(TZ)}`, {
    headers: { 'x-apisports-key': Deno.env.get('API_SPORTS_KEY') ?? '' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${sport} HTTP ${res.status}`);
  const json = await res.json();
  const errors = json.errors && (Array.isArray(json.errors) ? json.errors : Object.values(json.errors));
  if (errors && errors.length) throw new Error(`${sport}: ${JSON.stringify(json.errors)}`);
  return json.response ?? [];
}

const num = (v: unknown): number | null => (typeof v === 'number' ? v : v == null ? null : Number(v) || null);
const now = () => new Date().toISOString();

function toMatch(sport: Sport, r: any): Match {
  if (sport === 'football') {
    return {
      id: `football:${r.fixture.id}`,
      sport: SPORT_ID[sport],
      league_id: r.league.id,
      league_name: r.league.name,
      country: r.league.country ?? null,
      league_logo: r.league.logo ?? null,
      round: r.league.round ?? null,
      home: r.teams.home.name,
      away: r.teams.away.name,
      home_logo: r.teams.home.logo ?? null,
      away_logo: r.teams.away.logo ?? null,
      home_score: num(r.goals.home),
      away_score: num(r.goals.away),
      status: r.fixture.status.short,
      status_long: r.fixture.status.long ?? null,
      elapsed: num(r.fixture.status.elapsed),
      starts_at: r.fixture.date,
      updated_at: now(),
    };
  }
  const score = (side: any) => (side == null ? null : typeof side === 'object' ? num(side.total) : num(side));
  return {
    id: `${sport}:${r.id}`,
    sport: SPORT_ID[sport],
    league_id: r.league.id,
    league_name: r.league.name,
    country: r.country?.name ?? null,
    league_logo: r.league.logo ?? null,
    round: r.week ?? r.stage ?? null,
    home: r.teams.home.name,
    away: r.teams.away.name,
    home_logo: r.teams.home.logo ?? null,
    away_logo: r.teams.away.logo ?? null,
    home_score: score(r.scores?.home),
    away_score: score(r.scores?.away),
    status: r.status.short,
    status_long: r.status.long ?? null,
    elapsed: num(r.status.timer ?? r.status.elapsed),
    starts_at: r.date,
    updated_at: now(),
  };
}

async function refresh(days: number[]): Promise<Record<string, number | string>> {
  const { data: leagues, error } = await supabase.from('result_leagues').select('sport, league_id');
  if (error) throw error;
  const wanted = new Set((leagues ?? []).map((l) => `${l.sport}:${l.league_id}`));
  const out: Record<string, number | string> = {};
  for (const sport of Object.keys(HOST) as Sport[]) {
    if (![...wanted].some((k) => k.startsWith(`${SPORT_ID[sport]}:`))) continue; // no competitions chosen
    for (const day of days) {
      const date = zagrebDate(day);
      try {
        const rows = (await callApi(sport, date))
          .map((r) => toMatch(sport, r))
          .filter((m) => wanted.has(`${m.sport}:${m.league_id}`));
        if (rows.length) {
          const { error: e } = await supabase.from('matches').upsert(rows, { onConflict: 'id' });
          if (e) throw e;
        }
        out[`${sport} ${date}`] = rows.length;
      } catch (e) {
        out[`${sport} ${date}`] = String(e).slice(0, 300);
      }
    }
  }
  // keep one week of history
  await supabase.from('matches').delete().lt('starts_at', new Date(Date.now() - 7 * 864e5).toISOString());
  return out;
}

async function discover(sport: Sport, day: number) {
  const rows = (await callApi(sport, zagrebDate(day))).map((r) => toMatch(sport, r));
  const byLeague = new Map<number, { league_id: number; name: string; country: string | null; matches: number }>();
  for (const m of rows) {
    const cur = byLeague.get(m.league_id) ?? { league_id: m.league_id, name: m.league_name, country: m.country, matches: 0 };
    cur.matches++;
    byLeague.set(m.league_id, cur);
  }
  return [...byLeague.values()].sort((a, b) => (a.country ?? '').localeCompare(b.country ?? ''));
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('INGEST_SECRET');
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    if (body?.mode === 'discover') {
      return Response.json(await discover((body.sport ?? 'football') as Sport, Number(body.day ?? 0)));
    }
    const days: number[] = Array.isArray(body?.days) ? body.days.map(Number) : [0];
    return Response.json(await refresh(days));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
