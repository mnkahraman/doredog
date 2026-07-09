/* Standard MIDI File -> DoReDog CSV (parseStandard schema) extractor.
   Every note event is emitted verbatim — zero note loss at this stage. The only
   quantization is optional onset snapping (--q) for humanized/performance MIDIs.

   Usage:
     node midi2csv.js <in.mid> [--out <file.csv>] [--hand auto|track|pitch|channel]
                                [--split 60] [--q 0] [--tempo <uspq>] [--info]

   Output rows: `track,channel,pitch,vel,start,end`  (parseStandard reads p0=track, p2=pitch, p4=start, p5=end)
   Track 1 = right hand, Track 2 = left hand (matches convert.js).                             */
const fs = require('fs');

function readVarLen(buf, pos) {
  let value = 0, byte;
  do { byte = buf[pos++]; value = (value << 7) | (byte & 0x7f); } while (byte & 0x80);
  return [value, pos];
}

function closeNote(open, notes, pitch, channel, abs) {
  const k = (pitch << 4) | channel;
  if (open[k] && open[k].length) { const o = open[k].shift(); notes.push({ pitch, channel, start: o.start, end: abs, vel: o.vel }); }
}

function parseMidi(buf) {
  if (buf.toString('ascii', 0, 4) !== 'MThd') throw new Error('Not a Standard MIDI File (missing MThd)');
  const format = buf.readUInt16BE(8);
  const ntrks = buf.readUInt16BE(10);
  const division = buf.readUInt16BE(12);
  if (division & 0x8000) throw new Error('SMPTE time-division MIDIs are not supported');
  const tpq = division;
  let pos = 14;
  let tempo = 500000, tsNum = 4, tsDen = 4, tempoSet = false, tsSet = false;
  const tracks = [];
  for (let t = 0; t < ntrks && pos + 8 <= buf.length; t++) {
    if (buf.toString('ascii', pos, pos + 4) !== 'MTrk') break;
    const len = buf.readUInt32BE(pos + 4);
    let p = pos + 8; const end = Math.min(p + len, buf.length);
    let abs = 0, status = 0;
    const open = {}, notes = [];
    while (p < end) {
      let dt; [dt, p] = readVarLen(buf, p); abs += dt;
      let evByte = buf[p];
      if (evByte & 0x80) { status = evByte; p++; } else { evByte = status; }  // running status
      const type = evByte & 0xf0, channel = evByte & 0x0f;
      if (evByte === 0xff) {                                    // meta event
        const metaType = buf[p++]; let mlen; [mlen, p] = readVarLen(buf, p);
        if (metaType === 0x51 && mlen === 3 && !tempoSet) { tempo = (buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2]; tempoSet = true; }
        else if (metaType === 0x58 && mlen >= 2 && !tsSet) { tsNum = buf[p]; tsDen = Math.pow(2, buf[p + 1]); tsSet = true; }
        p += mlen;
      } else if (evByte === 0xf0 || evByte === 0xf7) {          // sysex
        let slen; [slen, p] = readVarLen(buf, p); p += slen;
      } else if (type === 0x90) {                               // note on
        const pitch = buf[p++], vel = buf[p++];
        if (vel > 0) { const k = (pitch << 4) | channel; (open[k] = open[k] || []).push({ start: abs, vel }); }
        else closeNote(open, notes, pitch, channel, abs);       // note-on vel 0 == note-off
      } else if (type === 0x80) {                               // note off
        const pitch = buf[p++]; p++; closeNote(open, notes, pitch, channel, abs);
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) { p += 2; }
      else if (type === 0xc0 || type === 0xd0) { p += 1; }
      else { p++; }
    }
    for (const k of Object.keys(open)) for (const o of open[k]) notes.push({ pitch: +k >> 4, channel: +k & 0x0f, start: o.start, end: abs, vel: o.vel });
    tracks.push(notes);
    pos = end;
  }
  return { tpq, tempo, tsNum, tsDen, tracks, format };
}

// map every note to hand 1 (RH) / 2 (LH)
function assignHands(mid, opts) {
  const noteTracks = mid.tracks.map((n, i) => ({ i, n })).filter((x) => x.n.length > 0);
  const out = [], mode = opts.hand || 'auto';
  const meanOf = (arr) => arr.reduce((a, b) => a + b.pitch, 0) / arr.length;

  if ((mode === 'auto' || mode === 'track') && noteTracks.length === 2) {   // classic 2-staff piano MIDI
    const m0 = meanOf(noteTracks[0].n), m1 = meanOf(noteTracks[1].n);
    const rh = m0 >= m1 ? noteTracks[0].i : noteTracks[1].i;
    for (const x of noteTracks) for (const nt of x.n) out.push({ track: x.i === rh ? 1 : 2, pitch: nt.pitch, start: nt.start, end: nt.end });
    return { notes: out, how: 'track (2 staves; RH=track ' + rh + ')' };
  }
  if (mode === 'melody') {                                                 // skyline: highest note per onset = melody (RH)
    const all = noteTracks.flatMap((x) => x.n);
    const byOnset = {};
    for (const n of all) { const k = Math.round(n.start / 16); (byOnset[k] = byOnset[k] || []).push(n); }
    for (const k in byOnset) {
      const grp = byOnset[k], mx = Math.max(...grp.map((n) => n.pitch));
      for (const n of grp) out.push({ track: n.pitch === mx ? 1 : 2, pitch: n.pitch, start: n.start, end: n.end });
    }
    return { notes: out, how: 'melody skyline (top note per onset = RH)' };
  }
  if (mode === 'channel' || (mode === 'auto' && noteTracks.length === 1)) { // single track — try channels, else pitch
    const flat = noteTracks.flatMap((x) => x.n);
    const chans = [...new Set(flat.map((n) => n.channel))];
    if (mode === 'channel' && chans.length === 2) {
      const mc = {}; chans.forEach((c) => { const a = flat.filter((n) => n.channel === c); mc[c] = meanOf(a); });
      const top = chans.sort((a, b) => mc[b] - mc[a])[0];
      for (const n of flat) out.push({ track: n.channel === top ? 1 : 2, pitch: n.pitch, start: n.start, end: n.end });
      return { notes: out, how: 'channel (2 channels)' };
    }
  }
  // fallback: merge everything, split by a pitch boundary (default middle C = 60)
  const split = opts.split || 60;
  for (const x of noteTracks) for (const nt of x.n) out.push({ track: nt.pitch >= split ? 1 : 2, pitch: nt.pitch, start: nt.start, end: nt.end });
  return { notes: out, how: 'pitch split at ' + split + ' (' + noteTracks.length + ' note-tracks merged)' };
}

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a; }

function toCSV(mid, assigned, opts) {
  let notes = assigned.notes.slice().sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  if (opts.q) {                                    // snap onsets/offsets to a 1/q-quarter grid
    const grid = mid.tpq / opts.q;
    notes = notes.map((n) => {
      const s = Math.round(n.start / grid) * grid;
      let e = Math.round(n.end / grid) * grid; if (e <= s) e = s + grid;
      return { track: n.track, pitch: n.pitch, start: s, end: e };
    });
  }
  const tempo = opts.tempo || mid.tempo;
  let tsNum = mid.tsNum, tsDen = mid.tsDen;
  if (opts.ts) { const m = String(opts.ts).match(/(\d+)\/(\d+)/); if (m) { tsNum = +m[1]; tsDen = +m[2]; } }  // override
  let out = '# DoReDog MIDI extraction\n';
  if (opts.src) out += '# source,' + opts.src + '\n';
  out += '# ticks_per_quarter,' + mid.tpq + '\n';
  out += '# meta,0,0,tempo,' + tempo + '\n';
  out += '# meta,0,0,time_signature,' + tsNum + '/' + tsDen + '\n';
  out += 'track,channel,pitch,vel,start,end\n';
  for (const n of notes) out += n.track + ',0,' + n.pitch + ',80,' + n.start + ',' + n.end + '\n';
  return out;
}

function diag(mid, assigned, opts) {
  const notes = assigned.notes;
  const rh = notes.filter((n) => n.track === 1).length, lh = notes.filter((n) => n.track === 2).length;
  let g = 0; for (const n of notes) { const s = Math.round(n.start); if (s > 0) g = gcd(g, s); }
  const pits = notes.map((n) => n.pitch);
  return {
    format: mid.format, tpq: mid.tpq, tempo: opts.tempo || mid.tempo,
    bpm: Math.round(60000000 / (opts.tempo || mid.tempo)),
    ts: mid.tsNum + '/' + mid.tsDen, tracks: mid.tracks.length,
    notes: notes.length, rh, lh, hands: assigned.how,
    onsetGCD: g, gridHint: g && mid.tpq ? (mid.tpq / g).toFixed(2) + ' per quarter' : 'n/a (quantize?)',
    pitchRange: Math.min(...pits) + '..' + Math.max(...pits)
  };
}

module.exports = { parseMidi, assignHands, toCSV, diag };
if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = { hand: 'auto', split: 60, q: 0, tempo: 0, src: '', ts: '' };
  let inFile = null, outFile = null, info = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out') outFile = args[++i];
    else if (a === '--hand') opts.hand = args[++i];
    else if (a === '--split') opts.split = +args[++i];
    else if (a === '--q') opts.q = +args[++i];
    else if (a === '--tempo') opts.tempo = +args[++i];
    else if (a === '--ts') opts.ts = args[++i];
    else if (a === '--src') opts.src = args[++i];
    else if (a === '--info') info = true;
    else if (!a.startsWith('--')) inFile = a;
  }
  if (!inFile) { console.error('usage: node midi2csv.js <in.mid> [--out f.csv] [--hand auto|track|pitch|channel] [--split 60] [--q 0] [--tempo uspq] [--info]'); process.exit(1); }
  const mid = parseMidi(fs.readFileSync(inFile));
  const assigned = assignHands(mid, opts);
  console.error(JSON.stringify(diag(mid, assigned, opts), null, 2));
  if (!info) {
    const csv = toCSV(mid, assigned, opts);
    if (outFile) { fs.writeFileSync(outFile, csv); console.error('WROTE ' + outFile + ' (' + assigned.notes.length + ' notes)'); }
    else process.stdout.write(csv);
  }
}
