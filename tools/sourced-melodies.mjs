/* ============================================================================
   Sourced beginner melodies — imported from published LilyPond scores.

   Unlike tools/authored-melodies.mjs (written out by hand and verified by ear),
   every pitch and rhythm here is parsed straight from a score stored in
   tools/melody-sources/*.ly, so the melody is whatever the source says.
   Provenance for each entry is recorded in `source` below.

   Run:  node tools/sourced-melodies.mjs            (dry run)
         node tools/sourced-melodies.mjs --write    (writes songs/*.js + data.js)
   ========================================================================== */
import fs from 'fs';
import { parseLily } from './lilypond-to-melody.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));  // repo root, so this also works from a git worktree
const SRC = ROOT + '/tools/melody-sources';
const SUB = 4;                                       // grid columns per quarter-note beat

// beatsPerBar is in QUARTER notes (6/8 -> 3, 3/8 -> 1.5, 2/4 -> 2, 4/4 -> 4)
const MELODIES = [
  { id: 'row-row-row-your-boat', title: 'Row, Row, Row Your Boat', composer: 'Traditional',
    genre: 'Folk', file: 'Row_Row_Row_Your_Boat.ly', beatsPerBar: 3, bpm: 84,
    source: 'Wikipedia — Row, Row, Row Your Boat (embedded LilyPond score)',
    cover: { from: '#0f2a2e', mid: '#5fd8e6', to: '#07161a', glyph: '❈' } },

  { id: 'pop-goes-the-weasel', title: 'Pop Goes the Weasel', composer: 'Traditional',
    genre: 'Folk', file: 'Pop_Goes_the_Weasel.ly', beatsPerBar: 3, bpm: 108,
    source: 'Wikipedia — Pop Goes the Weasel (embedded LilyPond score)',
    cover: { from: '#33230f', mid: '#f6b73f', to: '#171005', glyph: '✶' } },

  { id: 'baa-baa-black-sheep', title: 'Baa, Baa, Black Sheep', composer: 'Traditional',
    genre: 'Folk', file: 'Baa_Baa_Black_Sheep.ly', varName: 'right', beatsPerBar: 2, bpm: 96,
    source: 'Wikipedia — Baa, Baa, Black Sheep (embedded LilyPond score)',
    cover: { from: '#1d2230', mid: '#9fb4d8', to: '#0c0f16', glyph: '❊' } },

  { id: 'away-in-a-manger', title: 'Away in a Manger', composer: 'Traditional',
    genre: 'Sacred', file: 'Away_in_a_Manger.ly', beatsPerBar: 3, bpm: 100, pickup: 1,
    source: 'Wikipedia — Away in a Manger (embedded LilyPond score)',
    cover: { from: '#2b2413', mid: '#e6d5a8', to: '#141007', glyph: '✞' } },

  { id: 'o-christmas-tree', title: 'O Christmas Tree (O Tannenbaum)', composer: 'Traditional',
    genre: 'Sacred', file: 'O_Tannenbaum.ly', varName: ['sopranoC', 'sopranoV', 'sopranoC'],
    beatsPerBar: 3, bpm: 104, pickup: 0.5,
    source: 'Wikipedia — O Tannenbaum (embedded LilyPond score; chorus–verse–chorus, D.C. al fine)',
    cover: { from: '#122a18', mid: '#8fd4a8', to: '#08150c', glyph: '❋' } },

  { id: 'we-three-kings', title: 'We Three Kings', composer: 'John Henry Hopkins Jr.',
    genre: 'Sacred', file: 'We_Three_Kings.ly', varName: 'soprano', beatsPerBar: 1.5, bpm: 100,
    source: 'Wikipedia — We Three Kings (embedded LilyPond score, soprano line)',
    cover: { from: '#241a33', mid: '#a99bff', to: '#100c18', glyph: '✦' } },

  { id: 'hark-the-herald-angels-sing', title: 'Hark! The Herald Angels Sing', composer: 'Felix Mendelssohn',
    genre: 'Sacred', file: 'Hark_The_Herald_Angels_Sing.ly', varName: 'soprano', beatsPerBar: 4, bpm: 108,
    source: 'Wikipedia — Hark! The Herald Angels Sing (embedded LilyPond score, soprano line)',
    cover: { from: '#33170f', mid: '#ff8f6b', to: '#170a06', glyph: '⁂' } },

  { id: 'o-little-town-of-bethlehem', title: 'O Little Town of Bethlehem', composer: 'Lewis H. Redner',
    genre: 'Sacred', file: 'O_Little_Town_of_Bethlehem.ly', beatsPerBar: 4, bpm: 100, pickup: 1,
    source: 'Wikipedia — O Little Town of Bethlehem (embedded LilyPond score)',
    cover: { from: '#101d33', mid: '#7fa8ff', to: '#070d18', glyph: '✦' } },

  { id: 'the-holly-and-the-ivy', title: 'The Holly and the Ivy', composer: 'Traditional',
    genre: 'Sacred', file: 'The_Holly_and_the_Ivy.ly', beatsPerBar: 3, bpm: 104, pickup: 1,
    source: 'Wikipedia — The Holly and the Ivy (embedded LilyPond score)',
    cover: { from: '#13290f', mid: '#6fc46b', to: '#081406', glyph: '❋' } }
];

// ---- rendering (same grid as tools/authored-melodies.mjs) --------------------
function render(mel, notes) {
  const cpm = Math.round(mel.beatsPerBar * SUB);
  const cells = [];
  if (mel.pickup) { const pad = Math.round((mel.beatsPerBar - mel.pickup) * SUB); for (let i = 0; i < pad; i++) cells.push(null); }
  for (const [n, beats] of notes) {
    const cols = Math.round(beats * SUB);
    if (n === 'r') { for (let i = 0; i < cols; i++) cells.push(null); continue; }
    const m = n.match(/^([a-gA-G])(-?\d+)$/);
    if (!m) throw new Error('bad note ' + n);
    cells.push({ letter: m[1], octave: +m[2] });
    for (let i = 1; i < cols; i++) cells.push(undefined);
  }
  while (cells.length % cpm !== 0) cells.push(null);
  const measures = cells.length / cpm;
  let out = '';
  for (let m = 0; m < measures; m++) {
    const slice = cells.slice(m * cpm, (m + 1) * cpm);
    const octs = [...new Set(slice.filter(Boolean).map((c) => c.octave))].sort((a, b) => b - a);
    if (!octs.length) { out += 'RH 4|' + '-'.repeat(cpm) + '|\n' + (m + 1) + '\n'; continue; }
    for (const oct of octs) out += 'RH ' + oct + '|' + slice.map((c) => (c && c.octave === oct ? c.letter : '-')).join('') + '|\n';
    out += (m + 1) + '\n';
  }
  const cps = +(SUB * mel.bpm / 60).toFixed(2);
  return { notation: out.trimEnd(), cps, dur: Math.round(cells.length / cps), measures };
}

function fingerprint(notation, N) {
  N = N || 28;
  const NOTE = 'cCdDefFgGaAb';
  const seq = [];
  for (const line of notation.split('\n')) {
    const m = line.match(/^(?:RH|LH)?\s*(-?\d+)\|(.*)\|?$/);
    if (!m) continue;
    for (const ch of m[2]) { const i = NOTE.indexOf(ch); if (i >= 0) seq.push(+m[1] * 12 + i); }
  }
  if (!seq.length) return '';
  let s = '';
  for (let i = 0; i < N; i++) {
    const v = seq[Math.floor((i * seq.length) / N)];
    s += String.fromCharCode(48 + (((v - seq[0]) % 60) + 60) % 60);
  }
  return s;
}

function notesFor(mel) {
  const raw = fs.readFileSync(SRC + '/' + mel.file, 'utf8');
  const names = mel.varName ? (Array.isArray(mel.varName) ? mel.varName : [mel.varName]) : [null];
  let all = [];
  for (const v of names) {
    let chunk = raw;
    if (v) {
      const m = raw.match(new RegExp(v + '\\s*=\\s*(\\\\relative[\\s\\S]*)'));
      if (!m) throw new Error('variable ' + v + ' not found in ' + mel.file);
      chunk = m[1];
    }
    all = all.concat(parseLily(chunk));
  }
  return all;
}

// ---- output -----------------------------------------------------------------
const write = process.argv.includes('--write');
const entries = [];
for (const mel of MELODIES) {
  const notes = notesFor(mel);
  const r = render(mel, notes);
  entries.push({ mel, r });
  const total = notes.reduce((a, n) => a + n[1], 0);
  const clean = Math.abs(total / mel.beatsPerBar - Math.round(total / mel.beatsPerBar)) < 1e-6;
  console.log('── ' + mel.id + ' — ' + r.measures + ' bars, ' + total + ' beats, cps ' + r.cps + ', ' +
    r.dur + 's  ' + (clean ? '✓ bar-aligned' : '⚠ NOT bar-aligned'));
  if (!write) console.log(r.notation.split('\n').slice(0, 4).join('\n') + '\n   …');
}
if (!write) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

for (const { mel, r } of entries) {
  fs.writeFileSync(ROOT + '/songs/' + mel.id + '.js',
    'window.DRD=window.DRD||{};DRD.NOTATIONS=DRD.NOTATIONS||{};\nDRD.NOTATIONS[' +
    JSON.stringify(mel.id) + ']=' + JSON.stringify(r.notation) + ';\n');
}

let data = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
const added = [];
for (const { mel, r } of entries) {
  if (data.includes('id: "' + mel.id + '"')) continue;
  const rec = ',\n\n  {\n' +
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
    '    sourced: true,\n' +
    '    cover: ' + JSON.stringify(mel.cover) + ',\n' +
    '    blurb: ' + JSON.stringify(mel.title + ' — a traditional melody in colour-coded letter notes, transcribed from a published score. One of the easiest pieces in the library to start with.') + '\n' +
    '  }';
  data = data.replace(/\n\];\n/, rec + '\n];\n');
  added.push(mel.id);
}
fs.writeFileSync(ROOT + '/js/data.js', data);
console.log('\nwrote ' + entries.length + ' songs/*.js; added ' + added.length + ' entries: ' + (added.join(', ') || '(none new)'));
