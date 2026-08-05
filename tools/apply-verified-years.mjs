/* ============================================================================
   Write the double-checked years into js/data.js.

   A year only lands here if it cleared three gates:
     1. a Wikidata work record for the same composer, matched on catalogue code
        or exact title, with no competing year;
     2. the statement carries a reference (not a bare, unsourced claim);
     3. the year is repeated in the lead section of the work's English
        Wikipedia article.
   Anything that failed a gate stays out — the piece keeps its unverified year,
   which the site does not display.

   Run:  node tools/apply-verified-years.mjs <scratch-dir> [--dry]
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));  // repo root, so this also works from a git worktree
const SP = process.argv[2];
const DRY = process.argv.includes('--dry');

// hand-excluded after review: Wikidata's inception is when the libretto was begun,
// not when the opera was written — showing 1850 for Il trovatore would mislead.
const EXCLUDE = new Set(['h-verdi-il-trovatore']);

const confirmed = JSON.parse(fs.readFileSync(SP + '/year-confirmed.json', 'utf8'))
  .filter((h) => !EXCLUDE.has(h.id));

let src = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
let applied = 0, missing = [];

for (const h of confirmed) {
  const re = new RegExp('(\\{\\s*\\n?\\s*id:\\s*"' + h.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '",[\\s\\S]*?\\n  \\})');
  const m = src.match(re);
  if (!m) { missing.push(h.id); continue; }
  let block = m[1];
  if (/\byv:\s*1/.test(block)) continue;                 // already verified by hand
  const kindFlag = h.kind === 'published' ? ', yk: "p"' : '';
  if (/\byear:\s*-?\d+/.test(block)) {
    block = block.replace(/\byear:\s*-?\d+(,\s*yv:\s*\d+)?(,\s*yk:\s*"[a-z]")?/, 'year: ' + h.year + ', yv: 1' + kindFlag);
  } else {
    block = block.replace(/(\n    composer:[^\n]*\n)/, '$1    year: ' + h.year + ', yv: 1' + kindFlag + ',\n');
  }
  src = src.replace(m[1], block);
  applied++;
}

if (!DRY) fs.writeFileSync(ROOT + '/js/data.js', src);
console.log((DRY ? '[dry run] ' : '') + 'years written: ' + applied + ' / ' + confirmed.length);
if (missing.length) console.log('id not found in data.js: ' + missing.join(', '));
const total = (src.match(/\byv:\s*1/g) || []).length;
console.log('catalogue now carries ' + total + ' source-verified years');
