// Sport classification for articles and posts.
// Order of evidence: feed sport > URL path > RSS categories > keyword score > 'ostalo'.

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

export const SPORT_IDS: SportId[] = [
  'nogomet', 'kosarka', 'rukomet', 'tenis', 'vaterpolo', 'f1moto', 'borilacki', 'zimski', 'ostalo',
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/ß/g, 'ss');
}

// URL path / RSS category words (normalized) that name a sport directly.
const SECTION_WORDS: Record<Exclude<SportId, 'ostalo'>, string[]> = {
  nogomet: ['nogomet', 'fudbal', 'football', 'soccer', 'futbol', 'calcio', 'fussball', 'futebol', 'nogomet-hnl', 'hnl', 'premier-league', 'serie-a', 'laliga', 'bundesliga', 'ligue-1', 'champions-league', 'liga-prvaka'],
  kosarka: ['kosarka', 'basketball', 'baloncesto', 'basket', 'nba', 'wnba', 'euroleague', 'euroliga', 'aba-liga', 'mens-college-basketball', 'womens-college-basketball'],
  rukomet: ['rukomet', 'handball', 'balonmano', 'pallamano', 'rokomet'],
  tenis: ['tenis', 'tennis'],
  vaterpolo: ['vaterpolo', 'waterpolo', 'water-polo', 'pallanuoto'],
  f1moto: ['formula-1', 'formula1', 'f1', 'motogp', 'moto-gp', 'motorsport', 'motosport', 'automobilizam', 'auto-moto', 'motor'],
  borilacki: ['borilacki', 'borilacki-sportovi', 'mma', 'ufc', 'boks', 'boxing', 'boxeo', 'boxe', 'kickboxing', 'judo', 'taekwondo', 'karate', 'hrvanje', 'wrestling'],
  zimski: ['zimski-sportovi', 'skijanje', 'skiing', 'esqui', 'sci', 'ski', 'biathlon', 'biatlon', 'hokej', 'hockey', 'nhl', 'snowboard', 'klizanje'],
};

// Words in titles/summaries, with weights. Kept specific to avoid false matches.
const KEYWORDS: Record<Exclude<SportId, 'ostalo'>, [string, number][]> = {
  nogomet: [
    ['nogomet', 3], ['fudbal', 3], ['football', 2], ['soccer', 3], ['futbol', 3], ['calcio', 3], ['fussball', 3],
    ['hnl', 3], ['supersport hnl', 3], ['dinamo', 1], ['hajduk', 3], ['rijeka', 1], ['osijek', 1],
    ['vatreni', 3], ['dalic', 3], ['premier league', 3], ['serie a', 3], ['la liga', 3], ['laliga', 3],
    ['bundesliga', 3], ['ligue 1', 3], ['liga prvaka', 3], ['champions league', 3], ['europa league', 3],
    ['konferencijska liga', 3], ['conference league', 3], ['uefa', 2], ['fifa', 2], ['golman', 2],
    ['vratar', 2], ['penal', 2], ['jedanaesterac', 3], ['transfer', 1], ['real madrid', 2], ['barcelona', 1],
    ['manchester', 2], ['liverpool', 2], ['arsenal', 2], ['chelsea', 2], ['juventus', 2], ['bayern', 2],
    ['psg', 2], ['modric', 2], ['gvardiol', 2], ['kovacic', 2], ['here we go', 3], ['gol', 1], ['goal', 1],
    ['dinamo', 1], ['lokomotiva', 2], ['gorica', 2], ['slaven belupo', 3], ['istra 1961', 3], ['varazdin', 1],
    ['vukovar 1991', 3], ['sibenik', 1], ['zvezd', 1], ['crvena zvezda', 2], ['mls', 3], ['messi', 3], ['ronaldo', 3],
    ['mbappe', 3], ['haaland', 3], ['guardiola', 3], ['ancelotti', 3], ['mourinho', 3], ['klopp', 3], ['inter ', 2],
    ['atletico', 3], ['tottenham', 3], ['newcastle', 3], ['napoli', 3], ['lazio', 3], ['benfica', 3], ['ajax', 3],
    ['psv', 3], ['galatasaray', 3], ['fenerbahce', 3], ['celtic', 2], ['borussia', 3], ['leverkusen', 3],
    ['veznjak', 3], ['vezni', 2], ['napadac', 3], ['napadaca', 3], ['branic', 3], ['stoper', 2], ['golgeter', 3],
    ['drugoligas', 3], ['prvoligas', 3], ['nogometas', 3], ['fudbaler', 3], ['footballer', 3], ['striker', 3],
    ['midfielder', 3], ['defender', 2], ['goalkeeper', 3], ['liga nacija', 3], ['nations league', 3], ['euro 2028', 3],
    ['svjetsko prvenstvo', 1], ['world cup', 2], ['selektor', 1], ['bilic', 2], ['jelavic', 2], ['leko', 2],
    ['perisic', 2], ['pasalic', 2], ['kramaric', 2], ['budimir', 2], ['suker', 2], ['planas', 2], ['stadion', 1],
    ['ircima', 1], ['irska', 1], ['ireland', 1], ['futbolista', 3], ['calciatore', 3], ['fussballer', 3], ['tor ', 1],
    ['lige nacija', 3], ['ligu nacija', 3], ['ligi nacija', 3], ['interu', 2], ['intera', 2], ['sucic', 2],
    ['gattuso', 3], ['transfer', 1], ['u-17', 1], ['u17', 1], ['reprezentativac', 1], ['utakmic', 1],
    ['futebol', 3], ['golo', 2], ['treinador', 1], ['sporting', 2], ['entrenador', 1], ['barca', 2], ['madrid', 1],
    ['dortmund', 3], ['stuttgart', 2], ['bundesliga', 3], ['mercato', 3], ['marseille', 2], ['lyon', 2],
    ['entraineur', 1], ['bleus', 2], ['premier', 1], ['fc ', 2], ['cf ', 1], ['uefa', 2],
  ],
  kosarka: [
    ['kosark', 3], ['basketball', 3], ['baloncesto', 3], ['nba', 3], ['euroleague', 3], ['euroliga', 3],
    ['aba liga', 3], ['eurocup', 3], ['cibona', 3], ['cedevita', 3], ['zadar kosarka', 3], ['trica', 2],
    ['zubac', 2], ['lakers', 3], ['celtics', 3], ['warriors', 3], ['nikola jokic', 3], ['doncic', 3], ['playoff', 1],
  ],
  rukomet: [
    ['rukomet', 3], ['rukometa', 3], ['handball', 3], ['balonmano', 3], ['pallamano', 3], ['ehf', 3], ['ihf', 3],
    ['kauboji', 3], ['ppd zagreb', 3], ['nexe', 3], ['duvnjak', 2], ['sigurdsson', 3], ['cindric', 2],
  ],
  tenis: [
    ['tenis', 3], ['tennis', 3], ['atp', 3], ['wta', 3], ['wimbledon', 3], ['roland garros', 3], ['us open', 2],
    ['australian open', 3], ['davis cup', 3], ['davisov', 3], ['djokovic', 3], ['dokovic', 3], ['alcaraz', 3],
    ['sinner', 3], ['cilic', 2], ['vekic', 2], ['prizmic', 3], ['grand slam', 2],
  ],
  vaterpolo: [
    ['vaterpolo', 3], ['waterpolo', 3], ['water polo', 3], ['pallanuoto', 3], ['barakude', 3], ['jug ', 1],
    ['mladost', 1], ['jadran split', 2],
  ],
  f1moto: [
    ['formula 1', 3], ['formule 1', 3], ['formula one', 3], ['f1', 3], ['grand prix', 2], ['velika nagrada', 2],
    ['motogp', 3], ['verstappen', 3], ['hamilton', 2], ['leclerc', 3], ['norris', 2], ['ferrari', 1],
    ['red bull racing', 3], ['mclaren', 3], ['kvalifikacij', 1], ['pole position', 3], ['reli', 1], ['rally', 3], ['wrc', 3], ['nascar', 3], ['indycar', 3],
  ],
  borilacki: [
    ['ufc', 3], ['mma', 3], ['boks', 3], ['boxing', 3], ['boxeo', 3], ['kickbox', 3], ['judo', 3],
    ['taekwondo', 3], ['karate', 3], ['hrvanje', 3], ['wrestling', 2], ['nokaut', 3], ['knockout', 3],
    ['cro cop', 3], ['pereira', 1], ['jon jones', 3],
  ],
  zimski: [
    ['skijan', 3], ['skijas', 3], ['slalom', 3], ['veleslalom', 3], ['spust', 2], ['super g', 3], ['biatlon', 3],
    ['biathlon', 3], ['hokej', 3], ['hockey', 2], ['nhl', 3], ['snowboard', 3], ['klizanj', 3], ['zrinjevac', 1],
    ['snjezna kraljica', 3], ['zubcic', 3], ['popovic', 1], ['ljutic', 3], ['kolega', 1], ['shiffrin', 3], ['odermatt', 3],
  ],
};

function hasWord(haystack: string, word: string): boolean {
  // whole-word match on letters/digits; multi-word phrases allowed; trailing prefix match for stems (no space at end)
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z0-9])${escaped}`, 'i');
  return re.test(haystack);
}

function sectionFromTokens(tokens: string[]): SportId | null {
  for (const [sport, words] of Object.entries(SECTION_WORDS) as [SportId, string[]][]) {
    for (const t of tokens) {
      if (words.includes(t)) return sport;
    }
  }
  return null;
}

export function sportFromUrl(url: string): SportId | null {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  // Only the first three path segments describe the section; deeper ones are slugs.
  const segments = normalize(path).split('/').filter(Boolean).slice(0, 3);
  return sectionFromTokens(segments);
}

export function sportFromCategories(categories: string[]): SportId | null {
  const tokens = categories.flatMap((c) => {
    const n = normalize(c).trim();
    return [n, n.replace(/\s+/g, '-')];
  });
  return sectionFromTokens(tokens);
}

export function sportFromText(text: string): SportId | null {
  const hay = normalize(text);
  let best: SportId | null = null;
  let bestScore = 0;
  for (const [sport, words] of Object.entries(KEYWORDS) as [SportId, [string, number][]][]) {
    let score = 0;
    for (const [w, weight] of words) {
      if (hasWord(hay, w)) score += weight;
    }
    if (score > bestScore) {
      best = sport;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}

export interface ClassifyInput {
  url: string;
  title: string;
  summary?: string | null;
  categories?: string[];
  feedSport?: string | null;
}

export function classifySport(input: ClassifyInput): SportId {
  if (input.feedSport && (SPORT_IDS as string[]).includes(input.feedSport)) {
    return input.feedSport as SportId;
  }
  return (
    sportFromUrl(input.url) ??
    sportFromCategories(input.categories ?? []) ??
    sportFromText(`${input.title} ${input.summary ?? ''}`) ??
    'ostalo'
  );
}

// Transfer news (Transfer centar). Stems match at the start of a word.
const TRANSFER_WORDS = [
  'transfer', 'here we go', 'potpisa', 'potpisuje', 'prelazi u', 'prelazak', 'pojacanj', 'dovodi', 'doveo', 'dovela',
  'posudb', 'otkupn', 'odstetn', 'klauzul', 'novi klub', 'napusta', 'signs for', 'signing', 'joins', 'loan move',
  'agreement reached', 'medical', 'fichaje', 'ficha por', 'traspaso', 'trasferimento', 'calciomercato', 'mercato',
  'wechsel', 'wechselt', 'transferencia', 'contratacao', 'prelaz', 'pojacanje',
];

export function isTransfer(text: string): boolean {
  const hay = normalize(text);
  return TRANSFER_WORDS.some((w) => hasWord(hay, w));
}

export type TransferStage = 'sluzbeno' | 'dogovor' | 'pregovori' | 'glasina';

const STAGE_WORDS: [TransferStage, string[]][] = [
  ['sluzbeno', ['here we go', 'sluzbeno', 'zvanicno', 'officially', 'official', 'confirmed', 'potvrdeno', 'predstavljen',
    'potpisao', 'potpisala', 'signs for', 'has signed', 'completes move', 'oficial', 'ufficiale', 'offiziell']],
  ['dogovor', ['dogovor', 'dogovoren', 'agreement', 'agreed', 'deal done', 'deal agreed', 'medical', 'lijecnicki',
    'acuerdo', 'accordo', 'einigung']],
  ['pregovori', ['pregovor', 'talks', 'negotiat', 'bid', 'ponuda', 'ponudu', 'offer', 'oferta', 'offerta', 'angebot',
    'interes', 'interest', 'zeli', 'want', 'target', 'meta', 'radar']],
];

/** How far a transfer story has progressed, from its text. */
export function transferStage(text: string): TransferStage {
  const hay = normalize(text);
  for (const [stage, words] of STAGE_WORDS) {
    if (words.some((w) => hasWord(hay, w))) return stage;
  }
  return 'glasina';
}
