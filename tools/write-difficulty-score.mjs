/* ============================================================================
   Store the measured difficulty score on every catalogue entry as `ds` (0-100).

   The label (easy / medium / hard) is three buckets; the score is the underlying
   number, and having it in the catalogue lets the site do things three buckets
   cannot: order First Steps genuinely gentlest-first, and tell someone what the
   next small step up from the piece they just learned is.

   Run:  node tools/write-difficulty-score.mjs <scored.json> [--write]
   ========================================================================== */
import fs from 'fs';
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
const scored = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const WRITE = process.argv.includes('--write');

let data = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
let set = 0, updated = 0, missed = [];
for (const r of scored) {
  const re = new RegExp('(\\{\\s*\\n\\s*id: "' + r.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '",[\\s\\S]*?\\n  \\})');
  const m = data.match(re);
  if (!m) { missed.push(r.id); continue; }
  const block = m[1];
  let next;
  if (/\bds:\s*\d+/.test(block)) { next = block.replace(/\bds:\s*\d+/, 'ds: ' + r.s); updated++; }
  else { next = block.replace(/(\n    difficulty: "[a-z]+",)/, '$1\n    ds: ' + r.s + ','); set++; }
  if (next === block) { missed.push(r.id); continue; }
  data = data.replace(block, next);
}
if (WRITE) fs.writeFileSync(ROOT + '/js/data.js', data);
console.log((WRITE ? '' : '[dry run] ') + 'scores added: ' + set + ', refreshed: ' + updated + ', not patched: ' + missed.length);
if (missed.length) console.log('  ' + missed.slice(0, 6).join(', '));
