// Regenerate worker/seo-data.js from js/data.js.
// SEO[id] = [title, composer, genre, year, coverImage, difficulty];  COMPOSERS[name] = pieceCount
// year is exposed ONLY for pieces with a source-verified composition year (yv flag) — otherwise ''.
// Run:  node tools/gen-seo-data.js
const fs = require('fs');
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
global.window = {};
require(ROOT + '/js/data.js');
const S = window.DRD.SONGS;
const SEO = {}, COMP = {};
for (const s of S) {
  const year = s.yv ? s.year : '';
  SEO[s.id] = [s.title, s.composer || '', s.genre || '', year, (s.cover && s.cover.image) || '', s.difficulty || ''];
  if (s.composer) COMP[s.composer] = (COMP[s.composer] || 0) + 1;
}
const out =
  '// AUTO-GENERATED from js/data.js — compact SEO metadata for the edge Worker. Run tools/gen-seo-data.js to rebuild.\n' +
  '// SEO[id] = [title, composer, genre, year, coverImage, difficulty];  COMPOSERS[name] = pieceCount\n' +
  '// year is present ONLY for pieces with a source-verified composition year; empty string otherwise.\n' +
  'export const SEO = ' + JSON.stringify(SEO) + ';\n' +
  'export const COMPOSERS = ' + JSON.stringify(COMP) + ';\n';
fs.writeFileSync(ROOT + '/worker/seo-data.js', out);
console.log('wrote worker/seo-data.js —', Object.keys(SEO).length, 'songs,', Object.keys(COMP).length, 'composers');
