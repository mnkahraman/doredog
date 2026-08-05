/* ============================================================================
   Dufay's lament for the fall of Constantinople: title, date, composer year.

   The catalogue held it as "Lamentio Sanctae matris ecclesiae Constantinopolitanae"
   dated 1560 — a spelling slip (Lamentatio) and a year 86 years after Dufay died.
   The motet was written around February 1454, for the Feast of the Pheasant held
   at Lille on 17 February 1454, in response to the fall of Constantinople in 1453.

   Source: https://en.wikipedia.org/wiki/Lamentatio_sanctae_matris_ecclesiae_Constantinopolitanae

   Run:  node tools/fix-dufay-lament.mjs
   ========================================================================== */
import fs from 'fs';
const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const P = ROOT + '/js/data.js';
const ID = 'h-dufay-lamentio-sanctae-matris-ecclesiae-constantinop';
const TITLE = 'Lamentatio sanctae matris ecclesiae Constantinopolitanae';

let t = fs.readFileSync(P, 'utf8');
const start = t.indexOf('id: "' + ID + '"');
const end = start < 0 ? -1 : t.indexOf('\n  },', start);
if (start < 0 || end < 0) { console.error('entry not found'); process.exit(1); }

let block = t.slice(start, end);
const oldTitle = block.match(/title:\s*"([^"]*)"/)[1];
// blurb first — the old title is a near-prefix of the new one
block = block.split(oldTitle).join(TITLE);
block = block.replace(/title:\s*"[^"]*"/, 'title: ' + JSON.stringify(TITLE));
block = block.replace(/year:\s*\d+,(\s*yv:\s*\d+,)?(\s*yk:\s*"[^"]*",)?/, 'year: 1454, yv: 1,');
block = block.replace(/\n\s*circa:\s*true,/, '');

fs.writeFileSync(P, t.slice(0, start) + block + t.slice(end));
console.log('"' + oldTitle + '" -> "' + TITLE + '", 1560 -> 1454 (verified)');
