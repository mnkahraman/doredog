/* ============================================================================
   Nineteen pieces were filed as "Baroque" although their composers died before
   the Baroque began, and one — a Cantiga de Santa Maria from the court of
   Alfonso X — was filed as "Classical" despite being thirteenth-century.

   Found while building the measured era pages: "the easiest Baroque pieces"
   would have opened with Dufay (d. 1474) and "the easiest Classical pieces"
   with a medieval Cantiga.

   The era boundary used here is the conventional one: the Baroque starts around
   1600. Every composer below is dated from Wikidata via js/composer-dates.js,
   except Alfonso X, whose dates are added here (reigned 1252–1284; the Cantigas
   codices were compiled in the 1270s–1284).

   Run:  node tools/fix-pre-baroque-genre.mjs
   ========================================================================== */
import fs from 'fs';
import { createRequire } from 'module';

const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
const require = createRequire(import.meta.url);

global.window = {};
require(ROOT + '/js/data.js');
global.DRD = global.window.DRD;
require(ROOT + '/js/composer-dates.js');

const SONGS = global.window.DRD.SONGS;
const DATES = global.DRD.COMPOSER_DATES;

const MEDIEVAL = { 'Alfonso X of Castile': 1284 };      // no Wikidata record in composer-dates.js
const BAROQUE_BEGINS = 1600;
const MEDIEVAL_ENDS = 1400;

const plan = [];
for (const s of SONGS) {
  const died = (DATES[s.composer] && DATES[s.composer].d) || MEDIEVAL[s.composer];
  if (!died || died >= BAROQUE_BEGINS) continue;
  const want = died < MEDIEVAL_ENDS ? 'Medieval' : 'Renaissance';
  if (s.genre === want) continue;
  plan.push({ id: s.id, from: s.genre, to: want, composer: s.composer, died });
}

let t = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
let done = 0;
const missed = [];
for (const p of plan) {
  const start = t.indexOf('id: "' + p.id + '"');
  const end = start < 0 ? -1 : t.indexOf('\n  },', start);
  if (start < 0 || end < 0) { missed.push(p.id); continue; }
  let block = t.slice(start, end);
  if (!/genre:\s*"[^"]*"/.test(block)) { missed.push(p.id + ' (no genre)'); continue; }
  block = block.replace(/genre:\s*"[^"]*"/, 'genre: "' + p.to + '"');
  t = t.slice(0, start) + block + t.slice(end);
  done++;
}

if (missed.length) { console.error('FAILED:', missed.join(', ')); process.exit(1); }
fs.writeFileSync(ROOT + '/js/data.js', t);

const agg = {};
for (const p of plan) agg[p.from + ' -> ' + p.to] = (agg[p.from + ' -> ' + p.to] || 0) + 1;
console.log('reclassified', done, 'pieces');
for (const [k, n] of Object.entries(agg)) console.log('  ' + String(n).padStart(3) + '  ' + k);
for (const p of plan) console.log('     ' + p.composer + ' (d. ' + p.died + ') -> ' + p.to);
