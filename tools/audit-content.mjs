/* ============================================================================
   Content audit — the checks that catch the mistakes this project actually makes.

   Written after two of them shipped: the lament bass was published as a separate
   progression while holding note-for-note the same chords as the Andalusian
   cadence, and a "one octave" article was drafted that was 10/12 the same pieces
   as the no-black-keys one. Both are the same failure — the same thing twice,
   under two names — and neither was visible by reading the code.

   Run:  node tools/audit-content.mjs
   Exits non-zero if anything is wrong, so it can gate a release.
   ========================================================================== */
import fs from 'fs';
import { createRequire } from 'module';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const require2 = createRequire(import.meta.url);
const problems = [];
const warn = [];
const P = (cat, msg) => problems.push(cat + ': ' + msg);
const W = (cat, msg) => warn.push(cat + ': ' + msg);

global.window = {};
require2(ROOT + '/js/data.js');
const SONGS = global.window.DRD.SONGS;
const ids = new Set(SONGS.map((s) => s.id));
const titles = new Set(SONGS.map((s) => s.title));

const html = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const LISTS = JSON.parse(fs.readFileSync(ROOT + '/js/article-lists.js', 'utf8')
  .match(/D\.ARTICLE_LISTS = (\{[\s\S]*?\});/)[1]);

/* ---- 1. two datasets holding the same thing under different names -------- */
function dupes(label, items, keyOf, nameOf) {
  const seen = new Map();
  for (const it of items) {
    const k = keyOf(it);
    if (seen.has(k)) P('duplicate', label + ' "' + nameOf(it) + '" is identical to "' + seen.get(k) + '"');
    else seen.set(k, nameOf(it));
  }
}
// chord progressions: parse the steps array with balanced brackets, not a regex
const circle = fs.readFileSync(ROOT + '/js/circle.js', 'utf8');
const progs = [...circle.matchAll(/\{ id: '([a-z]+)', name: '([^']+)'/g)].map((m) => {
  const at = circle.indexOf("id: '" + m[1] + "'");
  const s = circle.indexOf('steps:', at);
  let d = 0, j = circle.indexOf('[', s), k = j;
  for (; k < circle.length; k++) { if (circle[k] === '[') d++; else if (circle[k] === ']') { d--; if (!d) { k++; break; } } }
  return { id: m[1], name: m[2], steps: circle.slice(j, k).replace(/\s/g, '') };
});
dupes('chord progression', progs, (p) => p.steps, (p) => p.name);

const chords = fs.readFileSync(ROOT + '/js/chords.js', 'utf8');
const types = [...chords.matchAll(/id: '([a-z0-9b#]+)', *label: '([^']+)'[^\n]*?iv: (\[[^\]]*\])/g)]
  .map((m) => ({ id: m[1], name: m[2], iv: m[3].replace(/\s/g, '') }));
dupes('chord type', types, (t) => t.iv, (t) => t.name);

/* ---- 2. two article lists holding the same pieces ------------------------ */
const keys = Object.keys(LISTS);
for (let i = 0; i < keys.length; i++) {
  for (let j = i + 1; j < keys.length; j++) {
    const A = new Set(LISTS[keys[i]]), B = new Set(LISTS[keys[j]]);
    let inter = 0; A.forEach((x) => { if (B.has(x)) inter++; });
    const jac = inter / (A.size + B.size - inter);
    if (jac > 0.75) P('duplicate', 'lists "' + keys[i] + '" and "' + keys[j] + '" overlap ' + Math.round(jac * 100) + '% — one page, not two');
    else if (jac > 0.5) W('overlap', '"' + keys[i] + '" and "' + keys[j] + '" overlap ' + Math.round(jac * 100) + '%');
  }
}

/* ---- 3. lists nothing uses, and pages using lists that do not exist ------ */
const used = new Set();
for (const f of html) for (const m of fs.readFileSync(ROOT + '/' + f, 'utf8').matchAll(/data-list="([a-z0-9-]+)"/g)) {
  used.add(m[1]);
  if (!LISTS[m[1]]) P('broken', f + ' references list "' + m[1] + '" which does not exist');
  else if (!LISTS[m[1]].length) P('broken', f + ' references list "' + m[1] + '" which is empty');
}
for (const k of keys) if (!used.has(k)) P('dead', 'list "' + k + '" is generated but no page uses it');

/* ---- 4. every list id must be a real piece ------------------------------- */
for (const [k, v] of Object.entries(LISTS)) {
  const gone = v.filter((id) => !ids.has(id));
  if (gone.length) P('broken', 'list "' + k + '" holds ' + gone.length + ' id(s) not in the catalogue: ' + gone.slice(0, 3).join(', '));
}

/* ---- 4b. a piece cannot be written outside its composer's lifetime ------- */
// Dufay died in 1474; his lament for the fall of Constantinople was dated 1560.
// These years are auto-estimated (none is marked yv), but they still drive the
// timeline bands and the year sort, so an impossible one puts a piece in the
// wrong century.
global.DRD = global.window.DRD;
require2(ROOT + '/js/composer-dates.js');
const DATES = global.DRD.COMPOSER_DATES;
let impossible = 0, worst = null;
for (const s of SONGS) {
  const d = DATES[s.composer];
  if (!d || !d.b || !d.d || !s.year) continue;
  if (s.year >= d.b && s.year <= d.d) continue;
  impossible++;
  const off = s.year < d.b ? d.b - s.year : s.year - d.d;
  if (!worst || off > worst.off) worst = { off, s };
  if (s.yv) P('impossible-year', s.id + ' is marked verified but dated ' + s.year +
    ', outside ' + s.composer + "'s lifetime (" + d.b + '-' + d.d + ')');
}
if (impossible) W('impossible-year', impossible + ' pieces are dated outside their composer\'s lifetime (none verified; worst is ' +
  worst.s.composer + ' by ' + worst.off + ' years)');

/* ---- 5. internal links must resolve ------------------------------------- */
const have = new Set(html);
for (const f of html) {
  for (const m of fs.readFileSync(ROOT + '/' + f, 'utf8').matchAll(/href="([^"#?:]+\.html)(?:[#?][^"]*)?"/g)) {
    const t = m[1].replace(/^\.\//, '');
    if (!t.includes('/') && !have.has(t)) P('broken', f + ' links to ' + t + ' which does not exist');
  }
}

/* ---- 6. song notes: unique, real ids, sourced --------------------------- */
const md = fs.readFileSync(ROOT + '/marketing/content-drafts/song-notes.md', 'utf8');
const noteKeys = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
noteKeys.forEach((k, i) => {
  if (noteKeys.indexOf(k) !== i) P('duplicate', 'song-notes.md has two sections for "' + k + '"');
  if (!ids.has(k)) P('broken', 'song-notes.md keys "' + k + '" which is not a catalogue id');
});
md.split(/^## /m).slice(1).forEach((s) => {
  if (!/\*Source:/.test(s)) P('unsourced', 'song note "' + s.split('\n')[0].trim() + '" carries no Source line');
});

/* ---- 6b. every date the site shows must trace to a source --------------- */
// Three chains carry dates to a reader, and each must stay closed:
//   piece years   — published only when yv is set, so an unverified year never appears
//   composer dates— either a Wikidata id, or a bio that carries a Source line
//   on this day   — every event links out to Wikipedia, or into a page of ours that does
const bios = JSON.parse(fs.readFileSync(ROOT + '/worker/composer-bios.js', 'utf8')
  .match(/export const BIOS = ([\s\S]*);/)[1]);
const YEAR = /\b1[2-9]\d\d\b|\b20[0-4]\d\b/;

for (const [name, d] of Object.entries(DATES)) {
  if (d.wd) continue;                                  // Wikidata-sourced
  const bio = bios[name];
  if (!bio) P('unsourced-date', 'composer "' + name + '" has dates (' + d.b + '-' + d.d + ') with no Wikidata id and no bio');
  else if (!/Source:/.test(bio)) P('unsourced-date', 'composer "' + name + '" has dates from a bio that carries no Source line');
}
for (const [name, bio] of Object.entries(bios)) {
  if (YEAR.test(bio) && !/Source:/.test(bio)) P('unsourced-date', 'bio for "' + name + '" states a year with no Source line');
}
const otd = fs.readFileSync(ROOT + '/worker/on-this-day-data.js', 'utf8');
const events = otd.match(/\{[^{}]*"y":\d+[^{}]*\}/g) || [];
const bare = events.filter((e) => !/"w":|"c":|"s":/.test(e));
if (bare.length) P('unsourced-date', bare.length + ' On This Day events carry no source field (w/c/s): ' + bare.slice(0, 2).join(' '));

// the yv gate must still be applied everywhere a year reaches a reader
const gates = [
  ['js/site.js', /song\.yv/],
  ['js/pages.js', /song\.yv/],
  ['tools/gen-seo-data.js', /s\.yv \? s\.year/]
];
for (const [f, re] of gates) {
  if (!re.test(fs.readFileSync(ROOT + '/' + f, 'utf8')))
    P('unsourced-date', f + ' no longer gates the piece year on yv — unverified years would be published');
}
const shown = SONGS.filter((s) => s.yv).length;
W('dates', shown + ' piece years are source-verified and published; ' +
  SONGS.filter((s) => s.year && !s.yv).length + ' are estimates held back from display');

/* ---- 6c. the daily calendar must not move under people ------------------ */
// gen-daily-pool.js is append-only, but nothing stopped a future edit from
// reshuffling: the pool had already drifted from 92 entries to 139 with day 1
// changing from the Minute Waltz to a Chopin nocturne. Pin the opening so a
// reorder fails here instead of quietly rewriting everybody's streak.
const poolSrc = fs.readFileSync(ROOT + '/js/daily-pool.js', 'utf8');
const pool = JSON.parse(poolSrc.match(/DRD\.DAILY_POOL = (\[[\s\S]*?\]);/)[1]);
const OPENING = ['minute-waltz', 'h-mozart-die-zauberflote-k-620', 'twinkle-twinkle', 'mozart-twinkle-variations'];
OPENING.forEach((id, i) => {
  if (pool[i] !== id) P('daily-drift', 'daily pool day ' + (i + 1) + ' is "' + pool[i] +
    '", was published as "' + id + '" — the calendar moved under anyone mid-streak');
});
const dupPool = pool.filter((id, i) => pool.indexOf(id) !== i);
if (dupPool.length) P('daily-drift', 'daily pool repeats ' + dupPool.length + ' id(s): ' + dupPool.slice(0, 3).join(', '));
pool.forEach((id) => { if (!ids.has(id)) P('daily-drift', 'daily pool holds "' + id + '", not in the catalogue'); });
W('daily', pool.length + ' pieces in the daily pool (' + Math.round(pool.length / 30.4) + ' months before it repeats)');

/* ---- 7. piece titles named in the guides must still exist --------------- */
// the Mutopia audit renamed 66 titles; a guide that quotes an old one is now wrong
for (const f of fs.readdirSync(ROOT + '/marketing/content-drafts').filter((f) => /^[2-4]\d-/.test(f))) {
  const draft = fs.readFileSync(ROOT + '/marketing/content-drafts/' + f, 'utf8');
  for (const m of draft.matchAll(/\*\*([A-Z][^*]{6,60})\*\*/g)) {
    const t = m[1].replace(/[.,;:]$/, '');
    // only flag strings that look like a catalogue title we once had
    if (/^(The |La |Le |L'|El |Die |Der |Das )?[A-Z]/.test(t) && /Rag|Suite|Sonata|Prelude|Gymnop|Gnossienne|Menuet|Minuet|Impromptu|Cantiga/.test(t)) {
      if (!titles.has(t)) W('title', f + ' names "' + t + '" which is not a catalogue title (may be prose, check it)');
    }
  }
}

console.log('checked ' + SONGS.length + ' pieces, ' + keys.length + ' lists, ' + html.length + ' pages, ' + noteKeys.length + ' song notes');
if (warn.length) { console.log('\nwarnings (' + warn.length + '):'); warn.forEach((w) => console.log('  ' + w)); }
if (problems.length) {
  console.error('\nPROBLEMS (' + problems.length + '):');
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log('\nno problems.');
