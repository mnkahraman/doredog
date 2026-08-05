/* ============================================================================
   Measure how hard every piece in the catalogue actually is to play.

   The difficulty label describes the transcription we hold, so the transcription
   is the right thing to measure — not the piece's reputation. For each song we
   read its notation and compute:

     nps       notes per second (how fast your hands have to move)
     melNps    melody notes per second — the top voice only
     span      the stretch one hand is asked to cover, in semitones (p90)
     maxChord  most simultaneous notes in one hand
     leap      how far the melody jumps between notes, in semitones (p90)
     range     total keyboard range used
     acc       share of notes that are black keys
     hands     1 or 2

   The thresholds are then calibrated against the pieces already rated easy —
   whatever "easy" has meant on this site so far, that set defines it.

   Run:  node tools/audit-difficulty.mjs [--json out.json]
   ========================================================================== */
import fs from 'fs';
import vm from 'vm';
// Derive the repo root from this file's own location. It used to be an absolute path,
// so running a tool from a git worktree silently read and rewrote the MAIN checkout.
const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');

const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11, C: 1, D: 3, F: 6, G: 8, A: 10 };
const isNote = (ch) => ch != null && NOTE[ch] != null;

function catalogue() {
  const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(ROOT + '/js/data.js', 'utf8'), ctx);
  return ctx.DRD.SONGS;
}
function notationOf(id) {
  const p = ROOT + '/songs/' + id + '.js';
  if (!fs.existsSync(p)) return null;
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx); } catch (e) { return null; }
  return (ctx.DRD && ctx.DRD.NOTATIONS && ctx.DRD.NOTATIONS[id]) || null;
}
function parse(notation) {
  const blocks = []; let cur = [];
  for (const raw of String(notation).split('\n')) {
    const t = raw.trim();
    if (t === '' || /^\d+$/.test(t)) { if (cur.length) { blocks.push(cur); cur = []; } continue; }
    const m = raw.match(/^\s*(RH|LH|R|L)?\s*(\d+)\s*\|(.*)$/i);
    if (m) cur.push({ hand: m[1] ? m[1][0].toUpperCase() : null, oct: +m[2], body: m[3].replace(/\|\s*$/, '') });
  }
  if (cur.length) blocks.push(cur);
  return blocks;
}
const pct = (arr, p) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };

function measure(song) {
  const nota = notationOf(song.id);
  if (!nota) return null;
  const blocks = parse(nota);
  const cps = song.cps || 6;
  let total = 0, accidentals = 0, cols = 0;
  const spans = [], chords = [], leaps = [], melody = [];
  let lo = 127, hi = 0, hands = new Set();
  for (const b of blocks) {
    const w = Math.max(...b.map((l) => l.body.length));
    for (let c = 0; c < w; c++) {
      cols++;
      const byHand = { R: [], L: [], N: [] };
      for (const l of b) {
        const ch = l.body[c];
        if (!isNote(ch)) continue;
        const midi = (l.oct + 1) * 12 + NOTE[ch];
        byHand[l.hand || 'N'].push(midi);
        total++;
        if (ch === ch.toUpperCase() && /[A-G]/.test(ch)) accidentals++;
        if (midi < lo) lo = midi; if (midi > hi) hi = midi;
        if (l.hand) hands.add(l.hand);
      }
      for (const k of ['R', 'L', 'N']) {
        const g = byHand[k];
        if (g.length > 1) { spans.push(Math.max(...g) - Math.min(...g)); chords.push(g.length); }
        else if (g.length === 1) chords.push(1);
      }
      // The melody is the top sounding note, whatever hand it was tagged with. Some
      // transcriptions have their hand tags skewed (one file had 2,279 notes tagged LH
      // and 117 RH), so trusting the RH tag would badly mismeasure them.
      const all = [...byHand.R, ...byHand.L, ...byHand.N];
      if (all.length) melody.push(Math.max(...all));
    }
  }
  for (let i = 1; i < melody.length; i++) leaps.push(Math.abs(melody[i] - melody[i - 1]));
  const dur = cols / cps;
  if (!total || !dur) return null;
  return {
    id: song.id, title: song.title, composer: song.composer, diff: song.difficulty, dur: Math.round(dur),
    nps: +(total / dur).toFixed(2),
    onset: +(melody.length / dur).toFixed(2),      // how often the hands have to do something
    span: pct(spans, 0.9),
    maxChord: chords.length ? Math.max(...chords) : 0,
    leap: pct(leaps, 0.9),
    range: hi - lo,
    acc: +(accidentals / total).toFixed(3),
    hands: hands.size || 1
  };
}

const songs = catalogue();
const rows = [];
for (const s of songs) { const m = measure(s); if (m) rows.push(m); }

const easy = rows.filter((r) => r.diff === 'easy');
const med = rows.filter((r) => r.diff === 'medium');
const hard = rows.filter((r) => r.diff === 'hard');
const stat = (set, k) => ({ p50: pct(set.map((r) => r[k]), 0.5), p90: pct(set.map((r) => r[k]), 0.9) });

console.log('measured ' + rows.length + ' / ' + songs.length + ' pieces');
console.log('\n            easy(' + easy.length + ')        medium(' + med.length + ')      hard(' + hard.length + ')');
for (const k of ['nps', 'onset', 'span', 'maxChord', 'leap', 'range', 'acc']) {
  const f = (s) => (s.p50 + ' / ' + s.p90).padEnd(16);
  console.log(k.padEnd(10) + f(stat(easy, k)) + f(stat(med, k)) + f(stat(hard, k)));
}
console.log('\n(p50 / p90 for each label)');

if (process.argv.includes('--json')) {
  const out = process.argv[process.argv.indexOf('--json') + 1];
  fs.writeFileSync(out, JSON.stringify(rows));
  console.log('\nwrote ' + out);
}
