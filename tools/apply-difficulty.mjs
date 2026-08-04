/* ============================================================================
   Correct the difficulty labels that mislead a beginner.

   tools/audit-difficulty.mjs measures every transcription; this applies only the
   two changes that matter, and deliberately leaves the rest alone:

     · anything labelled EASY that the measurements put well outside easy
       (score > 40) — a beginner who opens First Steps and meets a Lied at 14
       notes a second with six-note chords simply stops;
     · anything clearly easy (score <= 25) that is hidden behind a harder label —
       mostly single-line Bach chorales and Mozart Klavierstücke.

   The large medium/hard churn in between is NOT applied. Those labels are
   arguable either way and re-rating a thousand pieces on an unverified metric
   would be exactly the bulk edit this catalogue has always avoided.

   Run:  node tools/apply-difficulty.mjs <scored.json> [--write]
   ========================================================================== */
import fs from 'fs';
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
const scored = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const WRITE = process.argv.includes('--write');

const band = (s) => (s <= 32 ? 'easy' : s <= 64 ? 'medium' : 'hard');
const changes = [];
for (const r of scored) {
  if (r.diff === 'easy' && r.s > 40) changes.push({ ...r, to: band(r.s), why: 'not easy to play' });
  else if (r.diff !== 'easy' && r.s <= 25) changes.push({ ...r, to: 'easy', why: 'genuinely easy' });
}

let data = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
let applied = 0, missed = [];
for (const c of changes) {
  const re = new RegExp('(\\{\\s*\\n\\s*id: "' + c.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '",[\\s\\S]*?\\n  \\})');
  const m = data.match(re);
  if (!m) { missed.push(c.id); continue; }
  const block = m[1];
  const next = block.replace(/difficulty: "[a-z]+"/, 'difficulty: "' + c.to + '"');
  if (next === block) { missed.push(c.id); continue; }
  data = data.replace(block, next);
  applied++;
}
if (WRITE) fs.writeFileSync(ROOT + '/js/data.js', data);

const tally = {};
for (const c of changes) { const k = c.diff + ' -> ' + c.to; tally[k] = (tally[k] || 0) + 1; }
console.log((WRITE ? '' : '[dry run] ') + 'label corrections: ' + applied + ' / ' + changes.length);
console.log(JSON.stringify(tally, null, 1));
if (missed.length) console.log('could not patch: ' + missed.join(', '));
const counts = {};
for (const m of data.matchAll(/difficulty: "([a-z]+)"/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;
console.log('catalogue after: ' + JSON.stringify(counts));
