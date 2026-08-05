/* ============================================================================
   Harvest "On This Day in Music" from Wikipedia's 366 day pages.

   Each day page (e.g. "August 3") lists Births and Deaths as referenced entries:
     *[[1823]] &ndash; [[Francisco Asenjo Barbieri]], Spanish composer (died 1894)
   We keep only music people, so every entry is a sourced Wikipedia statement
   rather than something written from memory.

   Input : /tmp/days/<Month>_<D>.txt   (raw wikitext, fetched separately)
   Output: js/on-this-day.js           DRD.ONTHISDAY["MM-DD"] = [{y,t,c?,s?,w?}]
           w = Wikipedia article title, so entries can link to a source.

   Entries derived from OUR OWN verified composer bios / song notes are merged in
   first and keep their c/s fields, so they still deep-link into the site.

   Run:  node tools/harvest-on-this-day.mjs
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));  // repo root, so this also works from a git worktree
const DAYS = '/tmp/days';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LEN = [31,29,31,30,31,30,31,31,30,31,30,31];

// who counts as "music"? composers first, then performers/conductors.
const MUSIC = /\b(composer|componist|pianist|violinist|cellist|organist|conductor|harpsichordist|lutenist|flautist|flutist|clarinettist|clarinetist|oboist|bassoonist|trumpeter|trombonist|violist|guitarist|harpist|percussionist|bandleader|songwriter|lyricist|librettist|musicologist|opera singer|soprano|mezzo-soprano|contralto|tenor|baritone|bass-baritone|musician)\b/i;
const STRONG = /\bcomposer\b/i;
// things that are music-adjacent but not what this feature is about
const SKIP = /\b(rapper|DJ|disc jockey|drummer of|guitarist of|bassist of|record producer)\b/i;

const clean = (s) => s
  .replace(/<ref[^>]*\/>/g, ' ')
  .replace(/<ref[\s\S]*?<\/ref>/g, ' ')
  .replace(/\{\{[^{}]*\}\}/g, ' ')
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  .replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/'''?/g, '')
  .replace(/&ndash;|&mdash;/g, '–')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// the linked article title (first wiki-link that isn't the year) — used for the source link
function articleOf(line) {
  const links = [...line.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]);
  return links.find((l) => !/^\d{1,4}$/.test(l)) || null;
}

const EVENTS = {};
const add = (k, ev) => { (EVENTS[k] = EVENTS[k] || []).push(ev); };

// ---- 1) keep everything we already verified ourselves (they link into the site)
const prevPath = ROOT + '/js/on-this-day.js';
let ours = {};
if (fs.existsSync(prevPath)) {
  const txt = fs.readFileSync(prevPath, 'utf8');
  const m = txt.match(/DRD\.ONTHISDAY=([\s\S]*?);\s*$/);
  if (m) { try { ours = JSON.parse(m[1]); } catch (e) { ours = {}; } }
}
let kept = 0;
for (const [k, list] of Object.entries(ours)) {
  for (const ev of list) { if (ev.c || ev.s) { add(k, ev); kept++; } }
}

// ---- 2) harvest the day pages
let scanned = 0, harvested = 0;
for (let mi = 0; mi < 12; mi++) {
  for (let d = 1; d <= LEN[mi]; d++) {
    const file = `${DAYS}/${MONTHS[mi]}_${d}.txt`;
    if (!fs.existsSync(file)) continue;
    scanned++;
    const raw = fs.readFileSync(file, 'utf8');
    const key = String(mi + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');

    for (const section of ['Births', 'Deaths']) {
      const re = new RegExp('==+\\s*' + section + '\\s*==+([\\s\\S]*?)(?=\\n==[^=]|$)');
      const block = raw.match(re);
      if (!block) continue;
      for (const line of block[1].split('\n')) {
        if (!/^\*/.test(line)) continue;
        if (!MUSIC.test(line) || SKIP.test(line)) continue;
        const yearM = line.match(/^\*\s*\[?\[?(\d{3,4})\]?\]?\s*(?:&ndash;|–|-)/);
        if (!yearM) continue;
        const year = +yearM[1];
        const art = articleOf(line);
        let body = clean(line.replace(/^\*\s*\[?\[?\d{3,4}\]?\]?\s*(?:&ndash;|–|-)\s*/, ''));
        body = body.replace(/\s*\((?:born|died)\s+\d{3,4}\)\s*$/i, '').trim();
        if (!body || body.length > 150) continue;
        const name = body.split(',')[0].trim();
        const what = body.slice(name.length).replace(/^,\s*/, '').trim();
        if (!name) continue;
        add(key, {
          y: year,
          t: name + (section === 'Births' ? ' was born' : ' died') + (what ? ' — ' + what : '') + '.',
          w: art || undefined,
          p: STRONG.test(line) ? 1 : 0            // composers rank above performers
        });
        harvested++;
      }
    }
  }
}

// ---- 3) de-duplicate, rank, cap
const CAP = 8;
let total = 0;
for (const k of Object.keys(EVENTS)) {
  // Our own entries name people differently from Wikipedia ("J. S. Bach" vs
  // "Johann Sebastian Bach"), so match on year + SURNAME and let ours win —
  // ours deep-link into the site.
  const seen = new Map();
  const sigOf = (e) => {
    const name = e.t.split(' was born')[0].split(' died')[0].replace(/[^\p{L}\s.]/gu, '').trim();
    const surname = name.split(/\s+/).filter((w) => !/^\p{Lu}\.$/u.test(w)).pop() || name;
    return e.y + '|' + surname.toLowerCase();
  };
  EVENTS[k].forEach((e) => {
    const sig = sigOf(e), prev = seen.get(sig);
    if (!prev) { seen.set(sig, e); return; }
    const mine = (e.c || e.s) ? 1 : 0, theirs = (prev.c || prev.s) ? 1 : 0;
    if (mine > theirs) seen.set(sig, e);
    else if (mine === theirs && e.t.length > prev.t.length) seen.set(sig, e);
  });
  let list = [...seen.values()];
  // ours (c/s) first, then composers, then chronological
  list.sort((a, b) => {
    const ao = (a.c || a.s) ? 2 : (a.p || 0), bo = (b.c || b.s) ? 2 : (b.p || 0);
    if (ao !== bo) return bo - ao;
    return a.y - b.y;
  });
  list = list.slice(0, CAP).sort((a, b) => a.y - b.y);
  list.forEach((e) => { delete e.p; });
  EVENTS[k] = list;
  total += list.length;
}

const days = Object.keys(EVENTS).sort();
fs.writeFileSync(ROOT + '/js/on-this-day.js',
  '/* AUTO-GENERATED by tools/harvest-on-this-day.mjs — do not hand-edit.\n' +
  '   Entries come from our own source-cited composer bios/song notes (which link into the site)\n' +
  '   and from the Births/Deaths sections of Wikipedia\'s day pages (w = the article to cite). */\n' +
  'window.DRD=window.DRD||{};DRD.ONTHISDAY=' + JSON.stringify(EVENTS) + ';\n');

console.log('day pages scanned : ' + scanned);
console.log('our verified kept : ' + kept);
console.log('harvested raw     : ' + harvested);
console.log('after dedupe/cap  : ' + total + ' events across ' + days.length + '/366 days (' +
  Math.round(100 * days.length / 366) + '%)');
const counts = days.map((k) => EVENTS[k].length);
console.log('per day           : avg ' + (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) +
  ', min ' + Math.min(...counts) + ', max ' + Math.max(...counts));
const empty = [];
for (let mi = 0; mi < 12; mi++) for (let d = 1; d <= LEN[mi]; d++) {
  const k = String(mi + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  if (!EVENTS[k] || !EVENTS[k].length) empty.push(k);
}
console.log('still empty       : ' + empty.length + (empty.length ? ' → ' + empty.join(', ') : ''));
