/* ============================================================================
   The nine Anna Magdalena pieces nobody can claim.

   tools/fix-anna-magdalena-attributions.mjs corrected the three notebook entries
   where a source names a composer (Anh. 127 -> C. P. E. Bach, Anh. 131 -> J. C.
   Bach, and the non-existent "BWV Anh. 691" -> BWV 691) and left nine alone,
   because no source names anyone for them.

   But "leave it alone" meant leaving them credited to J. S. Bach, and that is
   not a neutral act — it is the site asserting something every source contradicts.
   Bach Digital files all nine under "unbekannter Komponist", and the BWV puts
   them in Anhang II, which means precisely "the attribution to J. S. Bach is
   doubtful and no other composer is known":

     m-bach-anna-magdalena-03   Menuet (BWV Anh. 113)              BDW 1423
     m-bach-anna-magdalena-07   Menuet (BWV Anh. 116)              BDW 1426
     m-bach-bwv-117a            Polonaise in F major (Anh. 117a)   BDW 1427
     m-bach-bwv-117b            Polonaise in F major (Anh. 117b)   BDW 1428
     m-bach-bwv-119             Polonaise in G minor (Anh. 119)    BDW 1430
     m-bach-bwv-120             Minuet in A minor (Anh. 120)       BDW 1431
     m-bach-bwv-121             Minuet in C minor (Anh. 121)       BDW 1432
     m-bach-anna-magdalena-22   Musette (BWV Anh. 126)             BDW 1437
     m-bach-bwv-128             Polonaise in D minor (Anh. 128)    BDW 1439

   "Anonymous" is not a guess — it is what the source says, in the word the
   catalogue already uses for music with no known author. It follows the house
   pattern set by "Traditional" (tag = composer's last word, blurb reads "by X").

   Source: https://en.wikipedia.org/wiki/Notebook_for_Anna_Magdalena_Bach
           and the Bach Digital work record listed against each id above.

   -- The piece counts in the biographies --

   Moving nine pieces off J. S. Bach makes his bio's "you can play 374 of his
   pieces" wrong. It was already wrong (368) before this script ran, and two
   other bios had drifted the same way, so the count is fixed at its source for
   every composer rather than patched for one:

     marketing/content-drafts/composer-bios.md is the source of truth;
     worker/composer-bios.js is AUTO-GENERATED from it and says so at the top.

   Editing only the generated .js would be the same class of bug as editing only
   js/data.js — the next `node tools/build-content-data.mjs` would put the stale
   number straight back. This rewrites the .md; run build-content-data.mjs after.

   Every bio carries exactly one <strong>N</strong>, always a piece count, so the
   rewrite is unambiguous. The count appears twice per section — in the heading
   ("## J. S. Bach  — 374 pieces", which the generator strips at the em dash and
   never publishes) and in the body ("**374**", which readers see). Both move,
   so the human label and the published fact cannot disagree.

   Run:  node tools/fix-anna-magdalena-anonymous.mjs
         node tools/build-content-data.mjs
   ========================================================================== */
import fs from 'fs';

// Derive the repo root from this file's own location, so running from a git
// worktree does not read and rewrite the main checkout.
const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');

const ANON = 'Anonymous';
const IDS = [
  'm-bach-anna-magdalena-03', 'm-bach-anna-magdalena-07', 'm-bach-anna-magdalena-22',
  'm-bach-bwv-117a', 'm-bach-bwv-117b', 'm-bach-bwv-119',
  'm-bach-bwv-120', 'm-bach-bwv-121', 'm-bach-bwv-128'
];

const fail = [];

/* ---- 1. js/data.js — the shipped catalogue ----------------------------- */
const DATA = ROOT + '/js/data.js';
let t = fs.readFileSync(DATA, 'utf8');
let done = 0;

for (const id of IDS) {
  const start = t.indexOf('id: "' + id + '"');
  const end = start < 0 ? -1 : t.indexOf('\n  },', start);
  if (start < 0 || end < 0) { fail.push(id + ' (not in data.js)'); continue; }
  let block = t.slice(start, end);
  const was = (block.match(/composer:\s*"([^"]*)"/) || [])[1];
  if (!was) { fail.push(id + ' (no composer)'); continue; }
  if (was === ANON) continue;                                  // idempotent re-run

  // Blurb before the composer field, for the same reason the title is rewritten
  // before the title field in the sibling script: substitute the long form first,
  // so a later narrow replacement cannot match text this one just wrote.
  block = block.split('by ' + was).join('by ' + ANON);
  block = block.replace(/composer:\s*"[^"]*"/, 'composer: ' + JSON.stringify(ANON));
  // convert.js derives the first tag as the composer's last word, lowercased,
  // so replacing the leading tag keeps data.js identical to a fresh rebuild.
  block = block.replace(/tags:\s*\[([^\]]*)\]/, (m, inner) =>
    'tags: [' + inner.replace(/"[^"]*"/, JSON.stringify(ANON.toLowerCase())) + ']');

  t = t.slice(0, start) + block + t.slice(end);
  done++;
  console.log('  data.js  ' + id + ': ' + was + ' -> ' + ANON);
}

/* ---- 2. tools/convert.js — where composer actually comes from ----------- */
const CONV = ROOT + '/tools/convert.js';
let c = fs.readFileSync(CONV, 'utf8');
let convDone = 0;

for (const id of IDS) {
  const key = "'" + id + ".csv':";
  const start = c.indexOf(key);
  const end = start < 0 ? -1 : c.indexOf('\n', start);
  if (start < 0 || end < 0) { fail.push(id + ' (not in convert.js)'); continue; }
  const row = c.slice(start, end);
  const was = (row.match(/composer:\s*'([^']*)'/) || [])[1];
  if (!was) { fail.push(id + ' (no composer in convert.js row)'); continue; }
  if (was === ANON) continue;
  c = c.slice(0, start) + row.replace(/composer:\s*'[^']*'/, "composer: '" + ANON + "'") + c.slice(end);
  convDone++;
}

if (fail.length) { console.error('FAILED: ' + fail.join(', ')); process.exit(1); }

fs.writeFileSync(DATA, t);
fs.writeFileSync(CONV, c);
console.log('  convert  ' + convDone + ' rows -> ' + ANON);

/* ---- 3. bio piece counts, at their source ------------------------------ */
// Recount from the catalogue we just wrote, so the numbers cannot be stale.
const counts = {};
for (const m of t.matchAll(/composer:\s*"([^"]*)"/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;

const MD = ROOT + '/marketing/content-drafts/composer-bios.md';
let md = fs.readFileSync(MD, 'utf8');
const moved = [];

md = md.replace(/^## (.+)$/gm, (line, heading) => {
  const name = heading.split('—')[0].trim();
  const actual = counts[name];
  if (actual === undefined) return line;                       // bio for a composer we no longer carry
  const m = heading.match(/—\s*(\d+)\s*pieces?/);
  if (!m || +m[1] === actual) return line;
  moved.push([name, +m[1], actual]);
  return '## ' + heading.replace(/—\s*\d+\s*pieces?/, '— ' + actual + ' piece' + (actual === 1 ? '' : 's'));
});

// The published number: one **N** per section, always the piece count.
md = md.split(/^(?=## )/m).map((sec) => {
  const h = sec.match(/^## (.+)$/m);
  if (!h) return sec;
  const name = h[1].split('—')[0].trim();
  const actual = counts[name];
  if (actual === undefined) return sec;
  return sec.replace(/\*\*(\d+)\*\*/, (mm, n) => (+n === actual ? mm : '**' + actual + '**'));
}).join('');

fs.writeFileSync(MD, md);
for (const [name, was, now] of moved) console.log('  bio      ' + name + ': ' + was + ' -> ' + now + ' pieces');

console.log('\n' + done + ' pieces re-credited to ' + ANON + '; ' + moved.length + ' bio counts corrected');
console.log('now run: node tools/build-content-data.mjs');
