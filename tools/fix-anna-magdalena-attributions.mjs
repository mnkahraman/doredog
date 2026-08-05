/* ============================================================================
   The rest of the Anna Magdalena notebook, checked against a source.

   tools/fix-petzold-minuets.mjs corrected BWV Anh. 114 and 115 to Christian
   Petzold. It stopped there. But the 1725 Notebook for Anna Magdalena Bach is a
   compilation of music by Bach AND other composers, so every other entry we
   carry from it was resting on the same untested assumption. This checks all
   sixteen.

   Sources: https://en.wikipedia.org/wiki/Notebook_for_Anna_Magdalena_Bach
            and the Bach Digital work record (BDW) for each catalogue number.

   The BWV Anhang is the deciding fact, and it has two halves that the site was
   collapsing into one:

     Anh. II  — attribution to J. S. Bach is DOUBTFUL, no other composer known.
     Anh. III — attribution to J. S. Bach is SPURIOUS; the real composer is known.

   Only Anh. III can be corrected. Anh. II is left alone, because "not Bach" is
   not an attribution and this catalogue does not publish guesses.

   CORRECTED (3):

     m-bach-bwv-127  March in E-flat major (BWV Anh. 127)   -> C. P. E. Bach
       Bach Digital BDW 1438 files it under "Bach, Carl Philipp Emanuel
       (1714-1788)" as BR-CPEB A-Juv 6.3, an alternative version of Wq 116.1 /
       H 171 (Lit.: Leisinger/Wollny, Bach-Jahrbuch 1993, pp. 142f.). Note that
       the Wikipedia contents list still groups Anh. 127 with the doubtful
       Anh. II pieces — that reflects BWV(1998); Bach Digital is the later word,
       and it names a composer, so it is the one that can be acted on.

     m-bach-air      Air (BWV Anh. 131)                     -> Johann Christian Bach
       Bach Digital BDW 1442 files it under "Bach, Johann Christian
       (1735-1782)" as Warb A 22, dated "um 1745?", with Gottfried Heinrich Bach
       recorded only as a former attribution. Wikipedia agrees: "Anh. III 131 -
       No. 32: [March] in F major attributed to Johann Christian Bach (W A22)".
       The year moves 1725 -> 1745 with it: J. C. Bach was born in 1735, so the
       notebook's own start year is impossible for him and tools/audit-content.mjs
       checks exactly that. It stays an estimate (circa) — the source's own date
       carries a question mark.

       The identification was worth testing too, since Mutopia only called the
       file "Air". It holds: the notebook's No. 32 is in F major, common time,
       with a one-quarter anacrusis rising a fourth into two half notes, the
       second trilled. Our extraction opens C5 quarter, F5 half, E5 half, in F
       major, 4/4 — the same piece.

     m-bach-bwv-691  Chorale prelude "Wer nur den lieben Gott lasst walten"
       Composer was already right; the catalogue NUMBER was not. There is no
       BWV Anh. 691. Bach Digital BDW 0808 has it as plain BWV 691, by J. S.
       Bach. The stray "Anh." is dropped from the title.

   LEFT ALONE — Anh. II, "unbekannter Komponist" on Bach Digital (9):

     Anh. 113 (BDW 1423), 116 (1426), 117a (1427), 117b (1428), 119 (1430),
     120 (1431), 121 (1432), 126 (1437), 128 (1439).

     These are all still credited to J. S. Bach on the site and no source
     supports that, but none names anyone else either. Reported as unresolved
     rather than guessed at.

   ALREADY CORRECT (4): Anh. 114 and 115 (Petzold, x3 entries) and BWV 515
   (J. S. Bach, confirmed at BDW 0586).

   -- Two bugs in fix-petzold-minuets.mjs that this script does not repeat --

   1. It wrote only js/data.js. But js/data.js is GENERATED: tools/convert.js
      builds each entry from its own MUTOPIA table and takes `composer` straight
      from there (`m.composer`), and tools/enrich.json cannot override composer
      at all — it only carries title/year/yearEst/genre/cpsMul. So convert.js
      still said 'J. S. Bach' for all three minuets and the next `node
      tools/convert` would have silently undone the Petzold fix. This script
      writes composer into tools/convert.js, title/year into tools/enrich.json,
      and js/data.js, and repairs the three Petzold rows on the way past.

   2. It rewrote the blurb AFTER swapping the title, and the old title can be a
      prefix of the new one ("Menuet in G" -> "Menuet in G major, BWV Anh. 114"),
      so the replacement re-entered itself. Blurb first, then the title field.

   Run:  node tools/fix-anna-magdalena-attributions.mjs
   ========================================================================== */
import fs from 'fs';

// Derive the repo root from this file's own location, so running from a git
// worktree does not read and rewrite the main checkout.
const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');

/* Sourced corrections. `title` is always the FINAL title, even where unchanged,
   so the blurb rewrite below has something to aim at either way. */
const FIX = {
  'm-bach-bwv-127': {
    composer: 'C. P. E. Bach',
    title: 'March in E-flat major (BWV Anh. 127)'
  },
  'm-bach-air': {
    composer: 'Johann Christian Bach',
    title: 'Air (BWV Anh. 131)',
    year: 1745, yearEst: true
  },
  'm-bach-bwv-691': {
    composer: 'J. S. Bach',
    title: 'Chorale prelude “Wer nur den lieben Gott läßt walten” (BWV 691)'
  }
};

/* Composer as convert.js must hold it — including the three Petzold rows that
   fix-petzold-minuets.mjs corrected in js/data.js but not at the source. */
const CONVERT_COMPOSER = {
  'm-bach-bwv-127': 'C. P. E. Bach',
  'm-bach-air': 'Johann Christian Bach',
  'm-bach-anna-magdalena-04': 'Christian Petzold',
  'm-bach-anna-magdalena-05': 'Christian Petzold',
  'm-bach-minuet-xpose': 'Christian Petzold'
};

/* Johann Christian Bach is new to the catalogue and would arrive with no dates.
   audit-content.mjs requires every composer date to trace to a Wikidata id or a
   bio carrying a Source line; this is the Wikidata route. Q106641 gives
   1735-09-05 / 1782-01-01, matching Bach Digital's "(1735-1782)". */
const NEW_COMPOSER_DATES = {
  'Johann Christian Bach': { q: 'Q106641', b: 1735, d: 1782 }
};

const fail = [];

/* ---- 1. js/data.js — the shipped catalogue ----------------------------- */
const DATA = ROOT + '/js/data.js';
let t = fs.readFileSync(DATA, 'utf8');
let done = 0;

for (const [id, fix] of Object.entries(FIX)) {
  const start = t.indexOf('id: "' + id + '"');
  const end = start < 0 ? -1 : t.indexOf('\n  },', start);
  if (start < 0 || end < 0) { fail.push(id + ' (not in data.js)'); continue; }
  let block = t.slice(start, end);
  const oldTitle = (block.match(/title:\s*"([^"]*)"/) || [])[1];
  const oldComposer = (block.match(/composer:\s*"([^"]*)"/) || [])[1];
  if (!oldTitle || !oldComposer) { fail.push(id + ' (no title/composer)'); continue; }

  // Blurb FIRST — see bug 2 in the header. Substituting the title field first
  // would let a new title that contains the old one match itself here.
  if (oldTitle !== fix.title) block = block.split(oldTitle).join(fix.title);
  if (oldComposer !== fix.composer) block = block.split('by ' + oldComposer).join('by ' + fix.composer);

  block = block.replace(/title:\s*"[^"]*"/, 'title: ' + JSON.stringify(fix.title));
  block = block.replace(/composer:\s*"[^"]*"/, 'composer: ' + JSON.stringify(fix.composer));
  if (fix.year) {
    block = block.replace(/year:\s*-?\d+/, 'year: ' + fix.year);
    // circa mirrors yearEst; add the line if the entry did not carry one.
    if (fix.yearEst && !/circa:\s*true/.test(block)) {
      block = block.replace(/(year:\s*-?\d+,\n)/, '$1    circa: true,\n');
    } else if (!fix.yearEst) {
      block = block.replace(/\s*circa:\s*true,\n/, '\n');
    }
  }

  // The tag list is derived by convert.js as the composer's last word, so
  // "bach" stays right for both C. P. E. and Johann Christian Bach. Nothing to do.
  t = t.slice(0, start) + block + t.slice(end);
  done++;
  const what = [];
  if (oldComposer !== fix.composer) what.push(oldComposer + ' -> ' + fix.composer);
  if (oldTitle !== fix.title) what.push('title: ' + oldTitle + ' -> ' + fix.title);
  if (fix.year) what.push('year -> ' + fix.year);
  console.log('  data.js  ' + id + ': ' + what.join('; '));
}

/* ---- 2. tools/convert.js — where composer actually comes from ----------- */
const CONV = ROOT + '/tools/convert.js';
let c = fs.readFileSync(CONV, 'utf8');
let convDone = 0;

for (const [id, composer] of Object.entries(CONVERT_COMPOSER)) {
  const key = "'" + id + ".csv':";
  const start = c.indexOf(key);
  const end = start < 0 ? -1 : c.indexOf('\n', start);
  if (start < 0 || end < 0) { fail.push(id + ' (not in convert.js)'); continue; }
  const row = c.slice(start, end);
  const was = (row.match(/composer:\s*'([^']*)'/) || [])[1];
  if (!was) { fail.push(id + ' (no composer in convert.js row)'); continue; }
  if (was === composer) continue;                      // already right, e.g. re-run
  c = c.slice(0, start) + row.replace(/composer:\s*'[^']*'/, "composer: '" + composer + "'") + c.slice(end);
  convDone++;
  console.log('  convert  ' + id + ': ' + was + ' -> ' + composer);
}

/* ---- 3. tools/enrich.json — title and year overrides -------------------- */
const ENRICH = ROOT + '/tools/enrich.json';
const e = JSON.parse(fs.readFileSync(ENRICH, 'utf8'));
let enrDone = 0;

for (const [id, fix] of Object.entries(FIX)) {
  const ov = e[id];
  if (!ov) { fail.push(id + ' (not in enrich.json)'); continue; }
  let touched = false;
  if (ov.title !== fix.title) { ov.title = fix.title; touched = true; }
  if (fix.year && ov.year !== fix.year) {
    ov.year = fix.year;
    if (fix.yearEst) ov.yearEst = true; else delete ov.yearEst;
    touched = true;
  }
  if (touched) { enrDone++; console.log('  enrich   ' + id + ': title/year synced'); }
}

/* ---- 4. tools/composer-dates-extra.json — dates for the new composer ---- */
const EXTRA = ROOT + '/tools/composer-dates-extra.json';
const x = JSON.parse(fs.readFileSync(EXTRA, 'utf8'));
let extraDone = 0;
for (const [name, d] of Object.entries(NEW_COMPOSER_DATES)) {
  if (x[name]) continue;
  x[name] = d;
  extraDone++;
  console.log('  dates    ' + name + ': ' + d.b + '-' + d.d + ' (' + d.q + ')');
}

if (fail.length) { console.error('FAILED: ' + fail.join(', ')); process.exit(1); }

fs.writeFileSync(DATA, t);
fs.writeFileSync(CONV, c);
if (enrDone) fs.writeFileSync(ENRICH, JSON.stringify(e, null, 2) + '\n');
if (extraDone) fs.writeFileSync(EXTRA, JSON.stringify(x, null, 1) + '\n');

console.log('\ncorrected ' + done + ' catalogue entries; ' + convDone + ' convert.js rows, ' +
  enrDone + ' enrich rows, ' + extraDone + ' new composer date(s)');
console.log('unresolved (Anh. II, no composer named by any source): ' +
  'Anh. 113, 116, 117a, 117b, 119, 120, 121, 126, 128');
