/* ============================================================================
   Harvest sourced biographies for the composers that have none.

   435 composers have a page; 177 had a bio. The rest opened with the About
   section simply absent — Berlioz, Byrd, Dowland, Bartok, Tallis, Dufay and
   Johann Christian Bach among them.

   Every fact here comes from Wikipedia, reached through the Wikidata id already
   stored in js/composer-dates.js, so nothing is written from memory. What gets
   written is a restatement of facts — dates, nationality, what they were known
   for — plus the piece count from our own catalogue and a link to the source.
   The lead sentence is trimmed to the factual clause rather than copied whole.

   Only composers WITH a Wikidata id are eligible: without one there is nothing
   to check against, and an unsourced bio is worse than no bio.

   Run:  node tools/harvest-composer-bios.mjs [limit]
   Appends to marketing/content-drafts/composer-bios.md; run build-content-data
   afterwards to regenerate worker/composer-bios.js.
   ========================================================================== */
import fs from 'fs';
import { createRequire } from 'module';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const require2 = createRequire(import.meta.url);
const LIMIT = +process.argv[2] || 40;

global.window = {};
require2(ROOT + '/js/data.js');
global.DRD = global.window.DRD;
require2(ROOT + '/js/composer-dates.js');
const SONGS = global.window.DRD.SONGS;
const DATES = global.DRD.COMPOSER_DATES;

const mdPath = ROOT + '/marketing/content-drafts/composer-bios.md';
const md = fs.readFileSync(mdPath, 'utf8');
const have = new Set([...md.matchAll(/^## (.+?)\s+—/gm)].map((m) => m[1].trim()));

const count = {};
for (const s of SONGS) count[s.composer] = (count[s.composer] || 0) + 1;

/* Sorting by piece count puts the bulk-import Neapolitan song composers first —
   nine pieces each and no English Wikipedia article, so they burn the run and
   produce nothing. Work through everyone eligible instead; the ones without an
   article are skipped in a few hundred milliseconds each. */
const todo = [...new Set(SONGS.map((s) => s.composer))]
  .filter((n) => !have.has(n) && DATES[n] && DATES[n].wd)
  .sort((a, b) => a.localeCompare(b))
  .slice(0, LIMIT);

console.log('composers needing a bio (with a Wikidata id): ' + todo.length + ' this run');

/* Wikipedia answers 429 well before 145 sequential requests are through, so:
   sitelinks are fetched 50 ids at a time (wbgetentities takes a pipe-joined list),
   and every call backs off and retries rather than dropping the composer. */
async function api(url, tries) {
  tries = tries || 0;
  const r = await fetch(url, { headers: { 'User-Agent': 'DoReDog/1.0 (doredog.com; catalogue enrichment)' } });
  if (r.status === 429 || r.status === 503) {
    if (tries >= 5) throw new Error('rate limited after 5 tries');
    await sleep(2000 * Math.pow(2, tries));
    return api(url, tries + 1);
  }
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// one request per 50 composers: Wikidata id -> English Wikipedia title
async function sitelinks(ids) {
  const map = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const ent = await api('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' +
      batch.join('|') + '&props=sitelinks&sitefilter=enwiki&format=json');
    for (const id of batch) {
      const t = ent.entities?.[id]?.sitelinks?.enwiki?.title;
      if (t) map[id] = t;
    }
    await sleep(600);
  }
  return map;
}

async function summary(title) {
  const sum = await api('https://en.wikipedia.org/api/rest_v1/page/summary/' +
    encodeURIComponent(title.replace(/ /g, '_')));
  return { title, extract: sum.extract || '' };
}

/* Splitting on /[.!?]\s/ cut "succeeded Palestrina at St." and "professor John E."
   off mid-abbreviation, because a full stop after an initial or a title is not a
   sentence end. Require the next word to start a new sentence (capital letter or
   quote) and refuse to break after a known abbreviation or a single initial. */
const ABBR = /(?:^|\s)(?:[A-Z]|St|Mr|Mrs|Ms|Dr|Prof|Jr|Sr|Op|No|Nos|Vol|c|ca|approx|fl|b|d|Ste|Sta)\.$/;
function sentences(text) {
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!/[.!?]/.test(text[i])) continue;
    const head = text.slice(start, i + 1);
    const after = text.slice(i + 1);
    if (after && !/^\s+["'\u201c(]?[A-Z0-9]/.test(after)) continue;   // not a sentence boundary
    if (ABBR.test(head)) continue;                                     // initial or title, keep going
    out.push(head.trim());
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

const esc = (s) => s.replace(/\|/g, '\\|');
const out = [];
let done = 0, skipped = [];

const titles = await sitelinks(todo.map((n) => DATES[n].wd));
console.log('with an English Wikipedia article: ' + Object.keys(titles).length);

for (const name of todo) {
  const d = DATES[name];
  try {
    if (!titles[d.wd]) { skipped.push(name + ' (no en article)'); continue; }
    const info = await summary(titles[d.wd]);
    if (!info.extract) { skipped.push(name + ' (no extract)'); continue; }

    const sent = sentences(info.extract);
    const first = sent[0] || '';                 // the factual "X was a ... composer" clause
    const second = sent[1] || '';                // when it exists and says something about the work

    const n = count[name];
    // the extract's opening sentence usually carries the dates already; add them only if not
    const hasDates = new RegExp('\\b' + d.b + '\\b').test(first) && new RegExp('\\b' + d.d + '\\b').test(first);
    const life = hasDates ? '' : ' (' + d.b + '–' + d.d + ')';

    const p1 = esc(first) + (second && second.length > 40 ? ' ' + esc(second) : '');
    const p2 = 'DoReDog has **' + n + '** ' + (n === 1 ? 'piece' : 'pieces') + ' by ' +
      esc(name) + life + ' in colour-coded letter notes.';

    out.push('## ' + name + '  — ' + n + (n === 1 ? ' piece' : ' pieces') + '\n' +
      p1 + '\n\n' + p2 + '\n' +
      '*Source: [Wikipedia](https://en.wikipedia.org/wiki/' + encodeURIComponent(info.title.replace(/ /g, '_')) + ')*\n');
    done++;
    process.stdout.write('.');
    await sleep(400);                                       // be polite to the API
  } catch (e) {
    skipped.push(name + ' (' + e.message + ')');
  }
}

if (out.length) fs.appendFileSync(mdPath, '\n' + out.join('\n'));
console.log('\nwrote ' + done + ' bios');
if (skipped.length) console.log('skipped ' + skipped.length + ': ' + skipped.slice(0, 6).join(', '));
