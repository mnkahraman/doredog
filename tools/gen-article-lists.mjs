/* ============================================================================
   Freeze the piece lists that the data-backed articles are built on.

   Each list is the result of actually parsing all 2,433 transcriptions with the
   site's own parser — not a hand-picked selection and not a guess. That is the
   whole point of these pages: "the pieces with no black keys" is a claim only
   worth publishing if something checked every piece.

   Output: js/article-lists.js  ->  DRD.ARTICLE_LISTS[key] = [id, id, ...]

   Run:  node tools/gen-article-lists.mjs      (after any catalogue change)
   ========================================================================== */
import fs from 'fs';
import { createRequire } from 'module';

// Derive the repo root from this file's own location. It used to be an absolute path,
// so running a tool from a git worktree silently read and rewrote the MAIN checkout.
const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const require = createRequire(import.meta.url);

// player.js is browser code but the parser half of it is pure — give it a stub DOM
global.window = { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
global.document = {
  addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [] }),
  documentElement: { style: { setProperty() {} } }, body: { appendChild() {} }
};
// node 26 exposes navigator as a getter-only global — define over it
Object.defineProperty(global, 'navigator', { value: { userAgent: 'node' }, configurable: true });

require(ROOT + '/js/data.js');
require(ROOT + '/js/player.js');
const DRD = global.window.DRD;
const SONGS = DRD.SONGS;

/* ---- read every transcription and measure what we actually need ---------- */
function notationOf(id) {
  const f = ROOT + '/songs/' + id + '.js';
  if (!fs.existsSync(f)) return null;
  const src = fs.readFileSync(f, 'utf8');
  // songs/<id>.js is a single assignment of a quoted string
  const m = src.match(/=\s*(["'`])([\s\S]*)\1\s*;?\s*$/);
  if (!m) return null;
  return m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

const measured = [];
let unreadable = 0;

for (const s of SONGS) {
  const nota = notationOf(s.id);
  if (!nota) { unreadable++; continue; }
  let blocks, cols;
  try { blocks = DRD.parseNotation(nota); cols = DRD.buildTimeline(blocks).cols; } catch (e) { unreadable++; continue; }

  let lo = Infinity, hi = -Infinity, notes = 0, sharps = 0;
  for (const col of cols) {
    for (const ev of col.events) {
      notes++;
      if (ev.midi < lo) lo = ev.midi;
      if (ev.midi > hi) hi = ev.midi;
      if (/[A-G]/.test(ev.letter)) sharps++;
    }
  }
  if (!notes) { unreadable++; continue; }
  const dur = s.dur || 0;
  measured.push({ id: s.id, ds: s.ds, dur, notes, sharps, span: hi - lo, nps: dur ? notes / dur : Infinity });
}

const by = (k) => (a, b) => a[k] - b[k];
const idsOf = (arr) => arr.map((m) => m.id);

/* ---- the four lists ------------------------------------------------------ */

// 1. No black keys at all — every note is a white key, start to finish.
const noBlackKeys = measured.filter((m) => m.sharps === 0).sort(by('ds'));

// 2. Learnable in one sitting — genuinely easy AND genuinely short.
const oneSitting = measured.filter((m) => m.ds < 35 && m.dur > 0 && m.dur < 60).sort(by('ds'));

// 3. Small-keyboard tiers. A piece fits a keyboard if its whole pitch span does:
//    25 keys = 2 octaves = 24 semitones, 37 keys = 36, 49 keys = 48. This is the
//    question every beginner with a cheap keyboard actually has.
const keys25 = measured.filter((m) => m.span <= 24).sort(by('ds'));
const keys37 = measured.filter((m) => m.span <= 36).sort(by('ds'));
const keys49 = measured.filter((m) => m.span <= 48).sort(by('ds'));

// 4. The slowest music in the library — under two notes a second, and within
//    reach. Not the same as "easy" and not the same as "short": this is the
//    music that gives you time to find the next key.
//    NOTE: a piece can only qualify if we know its duration (nps is Infinity
//    otherwise), so the filter is safe against missing dur.
const slowest = measured.filter((m) => m.nps < 2 && m.ds < 45).sort(by('nps'));

// 5. The hardest transcriptions in the library, unfiltered. Deliberately NOT
//    "hardest piano pieces": the score measures the transcription, and an art
//    song folds the singer's line into the piano part, so Lieder rank far above
//    where a pianist would put them. The article says so rather than hiding it
//    behind a filter — every attempt at a clean "solo keyboard only" rule leaked
//    (O Mio Babbino Caro, Ariettes oubliées and a dozen Lieder have titles no
//    pattern catches), and a list we cannot stand behind is worse than none.
const hardest = measured.slice().sort((a, b) => b.ds - a.ds);

// 6. Easiest-first, per composer. `ds` exists for all 2,433 pieces, so "the
//    easiest Mozart" is a measurement rather than an opinion.
// No Joplin entry: his 19 pieces are 18 of the 20 in the ragtime era list, so a
// separate page would be the same page twice. tools/audit-content.mjs enforces this.
const EASIEST_FOR = ['W. A. Mozart', 'Franz Schubert', 'Johannes Brahms', 'G. F. Handel',
  'Robert Schumann', 'Erik Satie', 'Friedrich Burgmüller'];

// 7. Easiest-first inside an era. `genre` records the period, so these are the
//    era pages: the same measurement, sliced the other way.
const EASIEST_ERA = ['Baroque', 'Romantic', 'Classical', 'Ragtime'];
const composerOf = {};
for (const s of SONGS) composerOf[s.id] = s.composer;
// fold diacritics first — without this "Burgmüller" slugs to "burgm-ller"
const slug = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

/* 8. The composers we hold exactly one piece by. 242 of 435 names in the library
      are represented by a single piece, which is most of the catalogue's breadth
      and none of its visibility — those composers are unreachable by browsing.
      Listing their one piece, easiest first, is the whole collection made
      findable. Keyed by piece, not by composer, so the existing card renderer
      shows it with no new machinery. */
const pieceCount = {};
for (const s of SONGS) pieceCount[s.composer] = (pieceCount[s.composer] || 0) + 1;
const onePiece = measured
  .filter((m) => pieceCount[composerOf[m.id]] === 1)
  .sort(by('ds'));

const LISTS = {
  'no-black-keys': idsOf(noBlackKeys),
  'one-piece-composers': idsOf(onePiece),
  'one-sitting': idsOf(oneSitting),
  'keys-25': idsOf(keys25),
  'keys-37': idsOf(keys37),
  'keys-49': idsOf(keys49),
  'slowest': idsOf(slowest),
  'hardest': idsOf(hardest.slice(0, 40))
};
for (const name of EASIEST_FOR) {
  const list = measured.filter((m) => composerOf[m.id] === name).sort(by('ds'));
  if (!list.length) throw new Error('gen-article-lists: no pieces for composer "' + name + '"');
  LISTS['easiest-' + slug(name)] = idsOf(list);
}
const genreOf = {};
for (const s of SONGS) genreOf[s.id] = s.genre;
for (const era of EASIEST_ERA) {
  const list = measured.filter((m) => genreOf[m.id] === era).sort(by('ds'));
  if (!list.length) throw new Error('gen-article-lists: no pieces for era "' + era + '"');
  LISTS['easiest-era-' + slug(era)] = idsOf(list);
}

fs.writeFileSync(ROOT + '/js/article-lists.js',
  '/* AUTO-GENERATED by tools/gen-article-lists.mjs — do not hand-edit.\n' +
  '   Each list is the result of parsing every transcription in the catalogue. */\n' +
  '(function(){ var D = window.DRD = window.DRD || {};\n  D.ARTICLE_LISTS = ' +
  JSON.stringify(LISTS) + ';\n})();\n');

console.log('measured', measured.length, 'transcriptions (' + unreadable + ' unreadable)');
for (const [k, v] of Object.entries(LISTS)) console.log('  ' + k.padEnd(15), v.length);
