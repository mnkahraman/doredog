/* ============================================================================
   One-off: five Mozart Lieder were filed as "Klavierstück, K. …" with the wrong
   year. They are art songs for voice and piano, all written in Vienna in 1787 —
   not piano pieces, and not 1785. Found while building the measured "easiest
   Mozart" list, which would otherwise have published the wrong titles.

   Verified against Wikipedia / IMSLP / the Mozart Portal:
     K. 517  Die Alte                                            18 May  1787
     K. 518  Die Verschweigung                                   20 May  1787
     K. 519  Das Lied der Trennung                                       1787
     K. 520  Als Luise die Briefe ihres ungetreuen Liebhabers…   26 May  1787
     K. 523  Abendempfindung an Laura                            24 June 1787

   Run:  node tools/fix-mozart-lieder.mjs
   ========================================================================== */
import fs from 'fs';

const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
const P = ROOT + '/js/data.js';

const FIX = {
  'm-mozart-k517': { title: 'Die Alte, K. 517', year: 1787 },
  'm-mozart-k518': { title: 'Die Verschweigung, K. 518', year: 1787 },
  'm-mozart-k519': { title: 'Das Lied der Trennung, K. 519', year: 1787 },
  'm-mozart-k520': { title: 'Als Luise die Briefe ihres ungetreuen Liebhabers verbrannte, K. 520', year: 1787 },
  'm-mozart-k523': { title: 'Abendempfindung an Laura, K. 523', year: 1787 }
};

let t = fs.readFileSync(P, 'utf8');
let done = 0;
const missed = [];

for (const [id, fix] of Object.entries(FIX)) {
  // Operate on this entry's own block only. The year line comes in two shapes in
  // data.js — a bare `year: N,` and an already-verified `year: N, yv: 1, yk: "p",` —
  // so slice the entry out and rewrite it rather than pattern-match the whole file.
  const start = t.indexOf('id: "' + id + '"');
  if (start < 0) { missed.push(id + ' (not found)'); continue; }
  const end = t.indexOf('\n  },', start);
  if (end < 0) { missed.push(id + ' (unterminated)'); continue; }

  let block = t.slice(start, end);
  const oldTitle = (block.match(/title:\s*"([^"]*)"/) || [])[1];
  if (!oldTitle) { missed.push(id + ' (no title)'); continue; }

  block = block.replace(/title:\s*"[^"]*"/, 'title: ' + JSON.stringify(fix.title));
  if (!/year:\s*\d+/.test(block)) { missed.push(id + ' (no year)'); continue; }
  block = block.replace(/year:\s*\d+,(\s*yv:\s*\d+,)?(\s*yk:\s*"[^"]*",)?/, 'year: ' + fix.year + ', yv: 1,');
  block = block.replace(/\n\s*circa:\s*true,/, '');          // a verified year is not approximate
  // the blurb was generated from the wrong title, and calls a song a "piece"
  block = block.split(oldTitle).join(fix.title);

  t = t.slice(0, start) + block + t.slice(end);
  done++;
}

if (missed.length) { console.error('FAILED:', missed.join(', ')); process.exit(1); }
fs.writeFileSync(P, t);
console.log('corrected', done, 'Mozart Lieder (title + year 1787 + yv:1)');
