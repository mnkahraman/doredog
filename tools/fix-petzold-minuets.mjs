/* ============================================================================
   The Anna Magdalena minuets are Petzold's, not Bach's.

   Found by tools/audit-content.mjs, which flagged that the guides name a
   "Minuet in G major" the catalogue does not hold under that spelling. Pulling
   the thread turned up three entries still credited to J. S. Bach:

     m-bach-anna-magdalena-04   Menuet in G                     -> BWV Anh. 114
     m-bach-minuet-xpose        Menuet in G major, BWV Anh. 114 -> BWV Anh. 114
     m-bach-anna-magdalena-05   Menuet (BWV Anh. 115)           -> BWV Anh. 115

   Anh. 114 and Anh. 115 are both usually attributed to the Dresden organist
   Christian Petzold; they sit in the 1725 Notebook for Anna Magdalena Bach,
   which is a compilation of music by Bach AND others, and that is why they were
   credited to him for two centuries. The site's own facts page has said so,
   sourced, since it was written — the catalogue simply disagreed with it.

   Source: https://en.wikipedia.org/wiki/Notebook_for_Anna_Magdalena_Bach

   The first two are the same piece: both open d–c then g–a–b, the Anh. 114 tune.
   They are different transcriptions (43s and 51s), so both are kept, but they
   are retitled so a reader can see that rather than meeting the same work twice
   under two names.

   Run:  node tools/fix-petzold-minuets.mjs
   ========================================================================== */
import fs from 'fs';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const P = ROOT + '/js/data.js';

const FIX = {
  'm-bach-anna-magdalena-04': { title: 'Menuet in G major, BWV Anh. 114', composer: 'Christian Petzold' },
  'm-bach-minuet-xpose':      { title: 'Menuet in G major, BWV Anh. 114 (second setting)', composer: 'Christian Petzold' },
  'm-bach-anna-magdalena-05': { title: 'Menuet in G minor, BWV Anh. 115', composer: 'Christian Petzold' }
};

let t = fs.readFileSync(P, 'utf8');
let done = 0;
const missed = [];

for (const [id, fix] of Object.entries(FIX)) {
  const start = t.indexOf('id: "' + id + '"');
  const end = start < 0 ? -1 : t.indexOf('\n  },', start);
  if (start < 0 || end < 0) { missed.push(id); continue; }
  let block = t.slice(start, end);
  const oldTitle = (block.match(/title:\s*"([^"]*)"/) || [])[1];
  const oldComposer = (block.match(/composer:\s*"([^"]*)"/) || [])[1];
  if (!oldTitle || !oldComposer) { missed.push(id + ' (no title/composer)'); continue; }

  // Rewrite the blurb FIRST. Doing it after the title swap substituted inside the new
  // title too — "Menuet in G" is a prefix of "Menuet in G major, BWV Anh. 114", so the
  // replacement re-entered itself and produced "...114 major, BWV Anh. 114".
  block = block.split(oldTitle).join(fix.title);
  block = block.split('by ' + oldComposer).join('by ' + fix.composer);
  block = block.replace(/title:\s*"[^"]*"/, 'title: ' + JSON.stringify(fix.title));
  block = block.replace(/composer:\s*"[^"]*"/, 'composer: ' + JSON.stringify(fix.composer));
  block = block.replace(/tags:\s*\[([^\]]*)\]/, (m, inner) =>
    'tags: [' + inner.replace(/"bach",?\s*/g, '').replace(/^,|,$/g, '').replace(/\[\s*,/, '[') + ']');

  t = t.slice(0, start) + block + t.slice(end);
  done++;
  console.log('  ' + id + ': ' + oldComposer + ' -> ' + fix.composer);
}

if (missed.length) { console.error('FAILED:', missed.join(', ')); process.exit(1); }
fs.writeFileSync(P, t);
console.log('corrected ' + done + ' minuets');
