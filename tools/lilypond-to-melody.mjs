/* ============================================================================
   LilyPond → DoReDog melody DSL.

   Parses a monophonic \relative LilyPond melody (the form Wikipedia embeds in
   <score> blocks) into [[note, beats], ...] where note is "<letter><octave>"
   with UPPERCASE meaning a sharp — exactly what tools/authored-melodies.mjs eats.

   This exists so beginner melodies are IMPORTED FROM A SOURCE rather than
   written from memory: every pitch and rhythm is whatever the score says.

   Usage:  import { parseLily } from './lilypond-to-melody.mjs'
           parseLily("\\relative c' { c4 c8 d4 d8 e8 g8 e8 c4. }")
   ========================================================================== */

const STEP = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
const SEMI = [0, 2, 4, 5, 7, 9, 11];                 // semitone of each diatonic step
const NAME = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];  // UPPER = sharp

function clean(src) {
  return src
    .replace(/%\{[\s\S]*?%\}/g, ' ')                 // block comments
    .replace(/%[^\n]*/g, ' ')                        // line comments
    .replace(/\\addlyrics\s*\{[\s\S]*$/, ' ')        // lyrics block and everything after
    .replace(/\^?"[^"]*"/g, ' ')                     // markup strings
    .replace(/\\(global|autoBeamOff|break|bar|fermata|tempo|key|time|numericTimeSignature|partial|set|override|once|new|clef|midiInstrument|small|normalsize|breathe|p{1,3}|f{1,3})\b[^\s|]*/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')                    // any remaining \command
    .replace(/#+'?[a-zA-Z0-9.#]+/g, ' ')             // scheme literals
    .replace(/[|~\[\]()]/g, ' ')                     // barlines, ties, slurs, beams
    .replace(/!/g, '')                               // reminder accidentals
    .replace(/<\s*([^<>]*?)\s*>/g, (m, inner) => '<' + inner.replace(/\s+/g, '') + '>')  // keep chords as one token
    .replace(/\s+/g, ' ')
    .trim();
}

// expand  \repeat volta N { ... }  by repeating the braced body N times
function expandRepeats(src) {
  let out = src, guard = 0;
  const re = /\\repeat\s+volta\s+(\d+)\s*\{/;
  while (re.test(out) && guard++ < 20) {
    const m = out.match(re);
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    while (i < out.length && depth > 0) { if (out[i] === '{') depth++; else if (out[i] === '}') depth--; i++; }
    const body = out.slice(start, i - 1);
    out = out.slice(0, m.index) + ' ' + body.repeat(+m[1]) + ' ' + out.slice(i);
  }
  return out;
}

export function parseLily(src, opts) {
  opts = opts || {};
  const relMatch = src.match(/\\relative\s+([a-g])('*|,*)\s*\{/);
  let refStep = relMatch ? STEP[relMatch[1]] : STEP.c;
  let refOct = 3 + (relMatch ? (relMatch[2].match(/'/g) || []).length - (relMatch[2].match(/,/g) || []).length : 1);
  // LilyPond c' == C4 (middle C); c == C3.

  let body = src;
  if (relMatch) {                                    // take just the braced body
    const start = src.indexOf('{', relMatch.index);
    let depth = 1, i = start + 1;
    while (i < src.length && depth > 0) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
    body = src.slice(start + 1, i - 1);
  }
  body = clean(expandRepeats(body));

  const absoluteMode = !relMatch;                    // no \relative -> octave marks are absolute
  const tokens = body.split(' ').filter(Boolean);
  const notes = [];
  let lastDur = 1;                                   // quarter note, in beats

  // resolve one pitch token ("cis'", "bes,") against the running reference
  function pitchOf(name, oct, advanceRef) {
    const letter = name[0];
    const acc = name.slice(1);
    const alter = acc === 'is' ? 1 : acc === 'es' ? -1 : acc === 'isis' ? 2 : acc === 'eses' ? -2 : 0;
    const step = STEP[letter];
    const marks = (oct.match(/'/g) || []).length - (oct.match(/,/g) || []).length;
    let octave;
    if (absoluteMode) {
      octave = 3 + marks;                            // c = C3, c' = C4
    } else {
      octave = refOct;
      const delta = step - refStep;
      if (delta > 3) octave -= 1; else if (delta < -3) octave += 1;
      octave += marks;
    }
    if (advanceRef) { refStep = step; refOct = octave; }
    return octave * 12 + SEMI[step] + alter;
  }
  const fmt = (abs) => NAME[((abs % 12) + 12) % 12] + Math.floor(abs / 12);

  for (const t of tokens) {
    // --- chord  <g d>4.  -> take the top note (the melody), reference = first note
    const ch = t.match(/^<([^>]*)>(\d+)?(\.*)$/);
    if (ch) {
      const inner = ch[1].match(/[a-g](?:is|es|isis|eses)?(?:'+|,+)?/g) || [];
      if (!inner.length) continue;
      let beats = lastDur;
      if (ch[2]) { beats = 4 / +ch[2]; lastDur = beats; }
      if (ch[3]) { let add = beats; for (let d = 0; d < ch[3].length; d++) { add /= 2; beats += add; } }
      const saveStep = refStep, saveOct = refOct;
      const pitches = inner.map((p, i) => {
        const mm = p.match(/^([a-g](?:is|es|isis|eses)?)('*|,*)$/);
        return pitchOf(mm[1], mm[2] || '', true);    // chain within the chord, LilyPond-style
      });
      // the note AFTER a chord references the chord's FIRST note
      refStep = saveStep; refOct = saveOct;
      const mm0 = inner[0].match(/^([a-g](?:is|es|isis|eses)?)('*|,*)$/);
      pitchOf(mm0[1], mm0[2] || '', true);
      notes.push([fmt(Math.max(...pitches)), beats]);
      continue;
    }

    const m = t.match(/^(r|R|s|[a-g](?:is|es|isis|eses)?)('*|,*)(\d+)?(\.*)$/);
    if (!m) continue;
    const [, name, oct, durRaw, dots] = m;

    let beats = lastDur;
    if (durRaw) { beats = 4 / +durRaw; lastDur = beats; }
    if (dots) { let add = beats; for (let d = 0; d < dots.length; d++) { add /= 2; beats += add; } }

    if (name === 'r' || name === 'R' || name === 's') { notes.push(['r', beats]); continue; }
    notes.push([fmt(pitchOf(name, oct, true)), beats]);
  }
  return notes;
}

// ---- CLI: node tools/lilypond-to-melody.mjs <file> [varName] --------------
if (process.argv[1] && process.argv[1].endsWith('lilypond-to-melody.mjs')) {
  const fs = await import('fs');
  const file = process.argv[2];
  const varName = process.argv[3];
  let src = fs.readFileSync(file, 'utf8');
  if (varName) {
    const re = new RegExp(varName + '\\s*=\\s*(\\\\relative[\\s\\S]*)');
    const m = src.match(re);
    if (m) src = m[1];
  }
  const notes = parseLily(src);
  console.log(JSON.stringify(notes));
  console.log('\n' + notes.length + ' events, ' + notes.reduce((a, n) => a + n[1], 0) + ' beats total');
}
