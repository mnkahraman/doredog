/* ============================================================================
   Match the catalogue against dated Wikidata work records.

   The rule is the one the whole site runs on: a year is only published when a
   source states it. So a match has to be unambiguous —

     1. catalogue code (BWV 846, K. 545, Op. 9 No. 2, D. 780 …) matching exactly
        one dated work by the same composer, and if our title carries a "No. n"
        the Wikidata record has to carry it too;
     2. or the normalised titles being identical, again for exactly one work.

   Anything fuzzier is dropped. The output is a review file — nothing is written
   into the catalogue by this script.

   Run:  node tools/match-wikidata-years.mjs <scratch-dir>
   ========================================================================== */
import fs from 'fs';
const SP = process.argv[2];

const catalogue = JSON.parse(fs.readFileSync(SP + '/catalogue.json', 'utf8'));
const works = JSON.parse(fs.readFileSync(SP + '/wikidata-works.json', 'utf8'));
const qids = JSON.parse(fs.readFileSync(SP + '/composer-qids.json', 'utf8'));

// sourced lifespans — the sanity gate that stops an arranger's or a film's date
// being attached to the composer (Bach did not write anything in 1871)
const datesSrc = fs.readFileSync('/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG/js/composer-dates.js', 'utf8');
const LIFE = JSON.parse(datesSrc.split('DRD.COMPOSER_DATES = ')[1].replace(/;\s*$/, ''));
const BAD_LABEL = /\b(arrangement|transcription|version|medley|remix|cover|soundtrack|film)\b/i;

const byComposer = {};
for (const [name, q] of Object.entries(qids)) byComposer[q] = name;

const flat = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// BWV 846 · K. 545 · D. 780 · HWV 430 · Hob. XVI:35 · RV 269 · S. 244 · L. 75 · WoO 59 · Op. 9 No. 2
const CODE_RE = /\b(bwv|kv|k|d|hwv|hob|rv|s|l|woo|op|opus|anh|bv|wq|zwv|tw?v)\.?\s*([ivxlcdm]+[:\-]?\s*)?(\d+[a-z]?)/gi;
const NO_RE = /\bno\.?\s*(\d+)/i;

function codes(str) {
  const out = new Set();
  const s = String(str || '');
  let m;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(s))) {
    let tag = m[1].toLowerCase();
    if (tag === 'kv') tag = 'k';
    if (tag === 'opus') tag = 'op';
    out.add(tag + ' ' + (m[2] ? m[2].replace(/[\s:\-]+/g, '') + ':' : '') + m[3].toLowerCase());
  }
  return out;
}

// index the Wikidata side
const index = {};                                   // composer name -> [{label, y, codes, flat, no}]
let rejectedLife = 0, rejectedLabel = 0;
for (const w of works) {
  const name = byComposer[w.c];
  if (!name) continue;
  if (BAD_LABEL.test(w.label)) { rejectedLabel++; continue; }
  // a composition year is the composer's own; publication counts only if they lived to see it
  const y = w.inc != null ? w.inc : w.pub;
  if (y == null) continue;
  const life = LIFE[name];
  if (life && (y < life.b || y > life.d)) { rejectedLife++; continue; }
  const bag = codes(w.label);
  if (w.cat) codes(w.cat).forEach((c) => bag.add(c));
  const noM = w.label.match(NO_RE);
  (index[name] = index[name] || []).push({
    q: w.q, label: w.label, y: y, kind: w.inc != null ? 'composed' : 'published',
    codes: bag, flat: flat(w.label), no: noM ? +noM[1] : null
  });
}

const hits = [], ambiguous = [], none = [];
for (const s of catalogue) {
  if (s.yv) continue;                               // already verified by hand — leave it alone
  const pool = index[s.composer];
  if (!pool || !pool.length) { none.push(s); continue; }

  const myCodes = codes(s.title);
  const myNo = (s.title.match(NO_RE) || [])[1];
  let cands = [];

  if (myCodes.size) {
    // a work code is only decisive when it is a real catalogue code, not a bare opus,
    // unless the opus also agrees on the "No." within the set
    cands = pool.filter((w) => {
      let shared = 0;
      myCodes.forEach((c) => { if (w.codes.has(c)) shared++; });
      if (!shared) return false;
      if (myNo != null && w.no != null && +myNo !== w.no) return false;
      if (myNo != null && w.no == null && [...myCodes].every((c) => c.startsWith('op '))) return false;
      return true;
    });
  }
  if (!cands.length) {
    const f = flat(s.title);
    cands = pool.filter((w) => w.flat === f);
  }

  // prefer a composition date over a publication date when both are on offer
  if (cands.some((c) => c.kind === 'composed')) cands = cands.filter((c) => c.kind === 'composed');
  const years = [...new Set(cands.map((c) => c.y))];
  if (cands.length && years.length === 1) {
    hits.push({ id: s.id, title: s.title, composer: s.composer, year: years[0], kind: cands[0].kind,
                was: s.year, via: cands[0].label, q: cands[0].q });
  } else if (cands.length) {
    ambiguous.push({ id: s.id, title: s.title, composer: s.composer, options: cands.slice(0, 4).map((c) => c.label + ' → ' + c.y) });
  } else none.push(s);
}

fs.writeFileSync(SP + '/year-matches.json', JSON.stringify(hits, null, 1));
fs.writeFileSync(SP + '/year-ambiguous.json', JSON.stringify(ambiguous, null, 1));
console.log('catalogue: ' + catalogue.length);
console.log('wikidata rows dropped — outside the composer\'s lifetime: ' + rejectedLife + ', arrangement/film labels: ' + rejectedLabel);
console.log('unambiguous matches: ' + hits.length + '  (composed ' + hits.filter((h) => h.kind === 'composed').length + ' / published ' + hits.filter((h) => h.kind === 'published').length + ')');
console.log('ambiguous (dropped):  ' + ambiguous.length);
console.log('no dated record:      ' + none.length);
const changed = hits.filter((h) => String(h.was) !== String(h.year));
console.log('of the matches, years that differ from what we hold: ' + changed.length);
console.log('\nsample:');
hits.slice(0, 14).forEach((h) => console.log(`  ${h.composer} — ${h.title}  [${h.was} → ${h.year} ${h.kind}]  via "${h.via}"`));
