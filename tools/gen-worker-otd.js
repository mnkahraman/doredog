/* Mirror js/on-this-day.js into an ES module the edge Worker can import, so the
   calendar can be rendered server-side instead of living only in the browser.
   Run:  node tools/gen-worker-otd.js   (after regenerating the calendar) */
const fs = require('fs');
// Derive the repo root from this file's own location — see the note in the .mjs tools:
// an absolute path meant a tool run from a worktree wrote to the main checkout instead.
const ROOT = require('path').resolve(__dirname, '..');
const src = fs.readFileSync(ROOT + '/js/on-this-day.js', 'utf8');
const body = src.split(/DRD\.ONTHISDAY\s*=\s*/)[1];
if (!body) throw new Error('DRD.ONTHISDAY assignment not found');
const obj = JSON.parse(body.replace(/;\s*$/, '').trim());
fs.writeFileSync(ROOT + '/worker/on-this-day-data.js',
  '// AUTO-GENERATED from js/on-this-day.js by tools/gen-worker-otd.js — do not hand-edit.\n' +
  'export const OTD = ' + JSON.stringify(obj) + ';\n');
const days = Object.keys(obj).length;
const events = Object.values(obj).reduce((a, b) => a + b.length, 0);
console.log('worker/on-this-day-data.js — ' + days + ' days, ' + events + ' events, ' +
  Math.round(fs.statSync(ROOT + '/worker/on-this-day-data.js').size / 1024) + ' KB');
