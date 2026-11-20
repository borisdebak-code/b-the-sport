// Unit tests for the ingest logic. Run: npm run test:backend
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifySport, isTransfer, sportFromText, sportFromUrl, transferStage } from '../functions/_shared/classify.ts';
import { discoverFeeds, parseFeed, shortSummary, youtubeFeedFromChannelPage } from '../functions/_shared/feed.ts';
import { needsTranslation } from '../functions/_shared/translate.ts';

test('sport from portal URL sections', () => {
  assert.equal(sportFromUrl('https://www.index.hr/sport/clanak/x/123.aspx'), null);
  assert.equal(sportFromUrl('https://www.example.hr/sport/nogomet/dinamo-hajduk/123'), 'nogomet');
  assert.equal(sportFromUrl('https://www.example.hr/sport/rukomet/kauboji/1'), 'rukomet');
  assert.equal(sportFromUrl('https://www.bbc.com/sport/tennis/articles/abc'), 'tenis');
  assert.equal(sportFromUrl('https://www.marca.com/baloncesto/nba/2026/11/20/x.html'), 'kosarka');
  assert.equal(sportFromUrl('https://www.example.com/sport/formula-1/news'), 'f1moto');
  // a sport word deep in the slug does not count as a section
  assert.equal(sportFromUrl('https://www.example.hr/vijesti/a/b/rukometni-trener'), null);
});

test('sport from text keywords', () => {
  assert.equal(sportFromText('Dalić objavio popis Vatrenih za Ligu nacija'), 'nogomet');
  assert.equal(sportFromText('Zubac ubacio 20 poena u pobjedi Clippersa, NBA'), 'kosarka');
  assert.equal(sportFromText('Kauboji svladali Island, Duvnjak najbolji'), 'rukomet');
  assert.equal(sportFromText('Čilić prošao u drugo kolo ATP turnira'), 'tenis');
  assert.equal(sportFromText('Barakude osvojile zlato, vaterpolo reprezentacija slavi'), 'vaterpolo');
  assert.equal(sportFromText('Verstappen osvojio pole position za Veliku nagradu'), 'f1moto');
  assert.equal(sportFromText('UFC 320: nokaut u prvoj rundi'), 'borilacki');
  assert.equal(sportFromText('Zrinka Ljutić pobijedila u slalomu'), 'zimski');
  assert.equal(sportFromText('Atletičarka oborila nacionalni rekord'), null);
  // regressions from the first real ingest
  assert.equal(sportFromText('Lokomotiva dovela bivšeg veznjaka Inter Miamija'), 'nogomet');
  assert.equal(sportFromText('Pašalićev Orlando ispao iz play-offa MLS-a'), 'nogomet');
  assert.equal(sportFromText('Niko Pulić i Ivica Kostelić zvijezde Rallyja Santa Domenica'), 'f1moto');
  assert.equal(sportFromText('Odbojkaši Mladosti uvjerljivi u Mađarskoj'), null);
});

test('classifySport precedence', () => {
  assert.equal(classifySport({ url: 'https://x.hr/a', title: 'Hajduk slavio', feedSport: 'kosarka' }), 'kosarka');
  assert.equal(classifySport({ url: 'https://x.hr/sport/tenis/1', title: 'Hajduk slavio' }), 'tenis');
  assert.equal(classifySport({ url: 'https://x.hr/a/1', title: 'Novi rekord', categories: ['Rukomet'] }), 'rukomet');
  assert.equal(classifySport({ url: 'https://x.hr/a/1', title: 'Hajduk slavio u derbiju HNL-a' }), 'nogomet');
  assert.equal(classifySport({ url: 'https://x.hr/a/1', title: 'Veslači osvojili srebro' }), 'ostalo');
});

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Test</title>
<item>
  <title><![CDATA[Dinamo &amp; Hajduk: derbi]]></title>
  <link>https://portal.hr/sport/nogomet/derbi/1</link>
  <description><![CDATA[<p>Prvi odlomak <b>derbija</b>. Drugi odlomak.</p>]]></description>
  <pubDate>Thu, 19 Nov 2026 18:30:00 +0100</pubDate>
  <category>Nogomet</category>
  <media:content url="https://img.portal.hr/1.jpg" medium="image"/>
</item>
<item>
  <title>Bez linka</title>
</item>
<item>
  <title>Slika u opisu</title>
  <link>/sport/rukomet/2</link>
  <description>&lt;img src="https://img.portal.hr/2.jpg"&gt; Tekst</description>
  <pubDate>Thu, 19 Nov 2026 17:00:00 +0100</pubDate>
</item>
</channel></rss>`;

test('parse RSS 2.0', () => {
  const items = parseFeed(RSS, 'https://portal.hr/rss', new Date('2026-11-20T00:00:00Z'));
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Dinamo & Hajduk: derbi');
  assert.equal(items[0].summary, 'Prvi odlomak derbija. Drugi odlomak.');
  assert.equal(items[0].imageUrl, 'https://img.portal.hr/1.jpg');
  assert.deepEqual(items[0].categories, ['Nogomet']);
  assert.equal(items[0].publishedAt.toISOString(), '2026-11-19T17:30:00.000Z');
  assert.equal(items[1].url, 'https://portal.hr/sport/rukomet/2');
  assert.equal(items[1].imageUrl, 'https://img.portal.hr/2.jpg');
});

const YT = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Channel</title>
 <entry>
  <id>yt:video:abc</id>
  <title>Here we go! Transfer done</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=abc"/>
  <published>2026-11-19T10:00:00+00:00</published>
  <media:group>
   <media:title>Here we go</media:title>
   <media:thumbnail url="https://i.ytimg.com/vi/abc/hqdefault.jpg" width="480" height="360"/>
   <media:description>Full story of the transfer.</media:description>
  </media:group>
 </entry>
</feed>`;

test('parse YouTube Atom feed', () => {
  const items = parseFeed(YT, 'https://www.youtube.com/feeds/videos.xml?channel_id=x', new Date('2026-11-20T00:00:00Z'));
  assert.equal(items.length, 1);
  assert.equal(items[0].url, 'https://www.youtube.com/watch?v=abc');
  assert.equal(items[0].imageUrl, 'https://i.ytimg.com/vi/abc/hqdefault.jpg');
  assert.equal(items[0].summary, 'Full story of the transfer.');
});

test('future dates are clamped to now', () => {
  const xml = RSS.replace('Thu, 19 Nov 2026 18:30:00 +0100', 'Thu, 19 Nov 2030 18:30:00 +0100');
  const now = new Date('2026-11-20T00:00:00Z');
  assert.equal(parseFeed(xml, 'https://portal.hr/rss', now)[0].publishedAt.getTime(), now.getTime());
});

test('summary is shortened at a sentence', () => {
  const long = 'Prva rečenica je ovdje. ' + 'riječ '.repeat(80);
  const s = shortSummary(long, 120)!;
  assert.ok(s.length <= 121);
});

test('feed autodiscovery and YouTube channel id', () => {
  const html = `<head><link rel="alternate" type="application/rss+xml" title="Sport" href="/rss/sport">
    <link rel="stylesheet" href="/a.css"></head>`;
  assert.deepEqual(discoverFeeds(html, 'https://www.index.hr/sport'), ['https://www.index.hr/rss/sport']);
  const page = '{"externalId":"UCabcdefghijklmnopqrstuv"}';
  assert.equal(youtubeFeedFromChannelPage(page), 'https://www.youtube.com/feeds/videos.xml?channel_id=UCabcdefghijklmnopqrstuv');
});

test('translation only for languages outside hr/sr/bs/cnr', () => {
  assert.equal(needsTranslation('sr'), false);
  assert.equal(needsTranslation('sl'), true);
  assert.equal(needsTranslation('en'), true);
});

test('transfer detection', () => {
  assert.equal(isTransfer('Here we go! Gvardiol to Real Madrid'), true);
  assert.equal(isTransfer('Dinamo dovodi napadača iz Belgije'), true);
  assert.equal(isTransfer('Hajduk potpisao mladog veznjaka'), true);
  assert.equal(isTransfer('Fichaje cerrado: el Barça paga 40 millones'), true);
  assert.equal(isTransfer('Dinamo pobijedio Hajduk u derbiju'), false);
});

test('transfer stage', () => {
  assert.equal(transferStage('Here we go! Gvardiol to Real Madrid'), 'sluzbeno');
  assert.equal(transferStage('Hajduk potpisao mladog veznjaka'), 'sluzbeno');
  assert.equal(transferStage('Dinamo i Lyon postigli dogovor oko transfera'), 'dogovor');
  assert.equal(transferStage('Arsenal want World Cup winner Williams'), 'pregovori');
  assert.equal(transferStage('Mercado de fichajes: rumores del día'), 'glasina');
});
