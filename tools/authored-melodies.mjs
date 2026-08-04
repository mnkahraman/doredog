/* ============================================================================
   Authored beginner melodies — traditional, public-domain tunes written out by
   hand in DoReDog letter notes (NOT extracted from a MIDI, unlike notes_csv/).
   Provenance is deliberately explicit: these are simple, universally known
   melodies, and each one is verified by ear in the site player before release.

   Run:  node tools/authored-melodies.mjs           (dry run, prints notation)
         node tools/authored-melodies.mjs --write    (writes songs/*.js + data.js)
   ========================================================================== */
import fs from 'fs';
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';

// ---- melody DSL -------------------------------------------------------------
// note: "<letter><octave>" — lowercase letter = white key, UPPERCASE = sharp.
//       "r" = rest. beats are in quarter-notes.
const SUB = 4;                                    // grid columns per beat (16th-note resolution)

const MELODIES = [
  {
    id: 'twinkle-twinkle', title: 'Twinkle, Twinkle, Little Star', composer: 'Traditional · France',
    genre: 'Folk', tsNum: 4, bpm: 100,
    cover: { from: '#101a33', mid: '#7fc4ff', to: '#080d1a', glyph: '✦' },
    // "Ah! vous dirai-je, maman" — the melody Jane Taylor's 1806 poem is sung to.
    // Two phrases, then the middle strain, then the two phrases again: the whole tune
    // sits inside one five-finger position plus a step, which is why it is the first
    // melody most people ever play.
    notes: [['c4',1],['c4',1],['g4',1],['g4',1],['a4',1],['a4',1],['g4',2],
            ['f4',1],['f4',1],['e4',1],['e4',1],['d4',1],['d4',1],['c4',2],
            ['g4',1],['g4',1],['f4',1],['f4',1],['e4',1],['e4',1],['d4',2],
            ['g4',1],['g4',1],['f4',1],['f4',1],['e4',1],['e4',1],['d4',2],
            ['c4',1],['c4',1],['g4',1],['g4',1],['a4',1],['a4',1],['g4',2],
            ['f4',1],['f4',1],['e4',1],['e4',1],['d4',1],['d4',1],['c4',2]]
  },
  {
    id: 'happy-birthday', title: 'Happy Birthday to You', composer: 'Traditional',
    genre: 'Folk', tsNum: 3, bpm: 116,
    cover: { from: '#3d1a2e', mid: '#ff54b2', to: '#140a10', glyph: '✿' },
    notes: [['g4',.5],['g4',.5],['a4',1],['g4',1],['c5',1],['b4',2],
            ['g4',.5],['g4',.5],['a4',1],['g4',1],['d5',1],['c5',2],
            ['g4',.5],['g4',.5],['g5',1],['e5',1],['c5',1],['b4',1],['a4',2],
            ['f5',.5],['f5',.5],['e5',1],['c5',1],['d5',1],['c5',2]]
  },
  {
    id: 'jingle-bells', title: 'Jingle Bells', composer: 'James Lord Pierpont',
    genre: 'Folk', tsNum: 4, bpm: 120,
    cover: { from: '#0d2233', mid: '#7fc4ff', to: '#07121c', glyph: '❄' },
    notes: [['e4',1],['e4',1],['e4',2],
            ['e4',1],['e4',1],['e4',2],
            ['e4',1],['g4',1],['c4',1.5],['d4',.5],['e4',4],
            ['f4',1],['f4',1],['f4',1.5],['f4',.5],
            ['f4',1],['e4',1],['e4',1],['e4',.5],['e4',.5],
            ['e4',1],['d4',1],['d4',1],['e4',1],
            ['d4',2],['g4',2]]
  },
  {
    id: 'mary-had-a-little-lamb', title: 'Mary Had a Little Lamb', composer: 'Traditional',
    genre: 'Folk', tsNum: 4, bpm: 108,
    cover: { from: '#26301a', mid: '#8fd4a8', to: '#101609', glyph: '❊' },
    notes: [['e4',1],['d4',1],['c4',1],['d4',1],
            ['e4',1],['e4',1],['e4',2],
            ['d4',1],['d4',1],['d4',2],
            ['e4',1],['g4',1],['g4',2],
            ['e4',1],['d4',1],['c4',1],['d4',1],
            ['e4',1],['e4',1],['e4',1],['e4',1],
            ['d4',1],['d4',1],['e4',1],['d4',1],
            ['c4',4]]
  },
  {
    id: 'frere-jacques', title: 'Frère Jacques', composer: 'Traditional',
    genre: 'Folk', tsNum: 4, bpm: 112,
    cover: { from: '#2b2140', mid: '#a99bff', to: '#120e1c', glyph: '☾' },
    notes: [['c4',1],['d4',1],['e4',1],['c4',1],
            ['c4',1],['d4',1],['e4',1],['c4',1],
            ['e4',1],['f4',1],['g4',2],
            ['e4',1],['f4',1],['g4',2],
            ['g4',.5],['a4',.5],['g4',.5],['f4',.5],['e4',1],['c4',1],
            ['g4',.5],['a4',.5],['g4',.5],['f4',.5],['e4',1],['c4',1],
            ['c4',1],['g3',1],['c4',2],
            ['c4',1],['g3',1],['c4',2]]
  },
  {
    id: 'old-macdonald', title: 'Old MacDonald Had a Farm', composer: 'Traditional',
    genre: 'Folk', tsNum: 4, bpm: 116,
    cover: { from: '#33270f', mid: '#f6b73f', to: '#171105', glyph: '❋' },
    notes: [['c4',1],['c4',1],['c4',1],['g3',1],
            ['a3',1],['a3',1],['g3',2],
            ['e4',1],['e4',1],['d4',1],['d4',1],
            ['c4',2],['r',2],
            ['g3',1],['c4',1],['c4',1],['c4',1],
            ['g3',1],['a3',1],['a3',1],['g3',1],
            ['e4',1],['e4',1],['d4',1],['d4',1],
            ['c4',4]]
  },
  {
    id: 'hot-cross-buns', title: 'Hot Cross Buns', composer: 'Traditional',
    genre: 'Folk', tsNum: 4, bpm: 100,
    cover: { from: '#331c12', mid: '#f0a868', to: '#170b06', glyph: '✶' },
    notes: [['e4',1],['d4',1],['c4',2],
            ['e4',1],['d4',1],['c4',2],
            ['c4',.5],['c4',.5],['c4',.5],['c4',.5],['d4',.5],['d4',.5],['d4',.5],['d4',.5],
            ['e4',1],['d4',1],['c4',2]]
  },
  {
    id: 'joy-to-the-world', title: 'Joy to the World', composer: 'George Frideric Handel',
    genre: 'Sacred', tsNum: 4, bpm: 104,
    cover: { from: '#3a2410', mid: '#e6d5a8', to: '#1a1008', glyph: '✞' },
    notes: [['c5',1.5],['b4',.5],['a4',1],['g4',1.5],['f4',.5],['e4',1],['d4',1],['c4',1.5],
            ['g4',.5],['a4',1],['a4',1],['b4',1],['b4',1],['c5',2]]
  },
  {
    id: 'london-bridge', title: 'London Bridge Is Falling Down', composer: 'Traditional',
    genre: 'Folk', tsNum: 4, bpm: 116,
    cover: { from: '#12242e', mid: '#5fd8e6', to: '#08121a', glyph: '❈' },
    notes: [['g4',1],['a4',1],['g4',1],['f4',1],
            ['e4',1],['f4',1],['g4',2],
            ['d4',1],['e4',1],['f4',2],
            ['e4',1],['f4',1],['g4',2],
            ['g4',1],['a4',1],['g4',1],['f4',1],
            ['e4',1],['f4',1],['g4',2],
            ['d4',2],['g4',2],
            ['e4',1],['c4',3]]
  }
];

// ---- rendering --------------------------------------------------------------
const SEMI = { c: 0, C: 1, d: 2, D: 3, e: 4, f: 5, F: 6, g: 7, G: 8, a: 9, A: 10, b: 11 };
function parseNote(s) {
  const m = s.match(/^([a-gA-G])(\d)$/);
  if (!m) throw new Error('bad note: ' + s);
  return { letter: m[1], octave: +m[2] };
}

function render(mel) {
  const cpm = mel.tsNum * SUB;                       // columns per measure
  const cells = [];                                  // flat column -> {letter, octave} | null
  for (const [n, beats] of mel.notes) {
    const cols = Math.round(beats * SUB);
    if (n === 'r') { for (let i = 0; i < cols; i++) cells.push(null); continue; }
    const p = parseNote(n);
    cells.push(p);
    for (let i = 1; i < cols; i++) cells.push(undefined);   // undefined = held (dash)
  }
  while (cells.length % cpm !== 0) cells.push(null);        // pad the last measure
  const measures = cells.length / cpm;

  let out = '';
  for (let m = 0; m < measures; m++) {
    const slice = cells.slice(m * cpm, (m + 1) * cpm);
    const octs = [...new Set(slice.filter(Boolean).map((c) => c.octave))].sort((a, b) => b - a);
    if (!octs.length) { out += 'RH 4|' + '-'.repeat(cpm) + '|\n' + (m + 1) + '\n'; continue; }
    for (const oct of octs) {
      const row = slice.map((c) => (c && c.octave === oct ? c.letter : '-')).join('');
      out += 'RH ' + oct + '|' + row + '|\n';
    }
    out += (m + 1) + '\n';
  }
  const cps = +(SUB * mel.bpm / 60).toFixed(2);
  const totalCols = cells.length;
  return { notation: out.trimEnd(), cps, dur: Math.round(totalCols / cps), measures, cpm };
}

// melodic fingerprint — same algorithm as tools/convert.js (kept in sync by hand)
function fingerprint(notation, N) {
  N = N || 28;
  const NOTE = 'cCdDefFgGaAb';
  const seq = [];
  for (const line of notation.split('\n')) {
    const m = line.match(/^(?:RH|LH)?\s*(-?\d+)\|(.*)\|?$/);
    if (!m) continue;
    const oct = +m[1];
    for (const ch of m[2]) { const i = NOTE.indexOf(ch); if (i >= 0) seq.push(oct * 12 + i); }
  }
  if (!seq.length) return '';
  let s = '';
  for (let i = 0; i < N; i++) {
    const v = seq[Math.floor((i * seq.length) / N)];
    s += String.fromCharCode(48 + (((v - seq[0]) % 60) + 60) % 60);
  }
  return s;
}

// ---- output -----------------------------------------------------------------
const write = process.argv.includes('--write');
const entries = [];
for (const mel of MELODIES) {
  const r = render(mel);
  entries.push({ mel, r });
  console.log('── ' + mel.id + ' — ' + r.measures + ' measures, cps ' + r.cps + ', ' + r.dur + 's');
  if (!write) console.log(r.notation.split('\n').slice(0, 6).join('\n') + '\n   …');
}

if (!write) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

// 1) songs/<id>.js
for (const { mel, r } of entries) {
  const body = 'window.DRD=window.DRD||{};DRD.NOTATIONS=DRD.NOTATIONS||{};\nDRD.NOTATIONS[' +
    JSON.stringify(mel.id) + ']=' + JSON.stringify(r.notation) + ';\n';
  fs.writeFileSync(ROOT + '/songs/' + mel.id + '.js', body);
}

// 2) append to js/data.js (idempotent: skip ids already present)
let data = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
const added = [];
for (const { mel, r } of entries) {
  if (data.includes('id: "' + mel.id + '"')) continue;
  const rec =
    ',\n\n  {\n' +
    '    id: ' + JSON.stringify(mel.id) + ',\n' +
    '    title: ' + JSON.stringify(mel.title) + ',\n' +
    '    composer: ' + JSON.stringify(mel.composer) + ',\n' +
    '    difficulty: "easy",\n' +
    '    genre: ' + JSON.stringify(mel.genre) + ',\n' +
    '    featured: false,\n' +
    '    tags: ' + JSON.stringify([mel.composer.split(' ').pop().toLowerCase(), mel.genre.toLowerCase(), 'piano', 'beginner']) + ',\n' +
    '    cps: ' + r.cps + ',\n' +
    '    dur: ' + r.dur + ',\n' +
    '    fp: ' + JSON.stringify(fingerprint(r.notation)) + ',\n' +
    '    mood: 1,\n' +
    '    authored: true,\n' +
    '    cover: ' + JSON.stringify(mel.cover) + ',\n' +
    '    blurb: ' + JSON.stringify(mel.title + ' — a traditional melody written out in colour-coded letter notes, one of the easiest pieces in the library to start with.') + '\n' +
    '  }';
  data = data.replace(/\n\];\n/, rec + '\n];\n');
  added.push(mel.id);
}
fs.writeFileSync(ROOT + '/js/data.js', data);
console.log('\nwrote ' + entries.length + ' songs/*.js; added ' + added.length + ' catalogue entries: ' + (added.join(', ') || '(none new)'));
