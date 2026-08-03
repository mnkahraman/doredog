/* ============================================================================
   DoReDog — MIDI → letter notes, in the browser.
   A port of tools/midi2csv.js + tools/convert.js so the conversion the site uses
   internally can run client-side. Nothing is uploaded: the file is read locally.
   Exposes: DRD.midiToLetterNotes(arrayBuffer, opts) -> { notation, cps, ... }
   ========================================================================== */
(function () {
  'use strict';
  var DRD = window.DRD = window.DRD || {};

  // pitch % 12 -> letter (lowercase natural, UPPERCASE sharp) — matches player.js
  var SEMI = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
  function pitchToLetter(p) { return SEMI[((p % 12) + 12) % 12]; }
  function pitchToOct(p) { return Math.floor(p / 12) - 1; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }

  function ascii(b, from, to) { var s = ''; for (var i = from; i < to; i++) s += String.fromCharCode(b[i]); return s; }
  function u16(b, i) { return (b[i] << 8) | b[i + 1]; }
  function u32(b, i) { return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; }

  function readVarLen(b, pos) {
    var value = 0, byte;
    do { byte = b[pos++]; value = (value << 7) | (byte & 0x7f); } while (byte & 0x80);
    return [value, pos];
  }
  function closeNote(open, notes, pitch, channel, abs) {
    var k = (pitch << 4) | channel;
    if (open[k] && open[k].length) { var o = open[k].shift(); notes.push({ pitch: pitch, channel: channel, start: o.start, end: abs, vel: o.vel }); }
  }

  function parseMidi(b) {
    if (ascii(b, 0, 4) !== 'MThd') throw new Error('That doesn’t look like a MIDI file (no MThd header).');
    var ntrks = u16(b, 10);
    var division = u16(b, 12);
    if (division & 0x8000) throw new Error('SMPTE time-division MIDI files aren’t supported.');
    var tpq = division, pos = 14;
    var tempo = 500000, tsNum = 4, tsDen = 4, tempoSet = false, tsSet = false;
    var tracks = [];
    for (var t = 0; t < ntrks && pos + 8 <= b.length; t++) {
      if (ascii(b, pos, pos + 4) !== 'MTrk') break;
      var len = u32(b, pos + 4);
      var p = pos + 8, end = Math.min(p + len, b.length);
      var abs = 0, status = 0, open = {}, notes = [], r;
      while (p < end) {
        r = readVarLen(b, p); abs += r[0]; p = r[1];
        var evByte = b[p];
        if (evByte & 0x80) { status = evByte; p++; } else { evByte = status; }   // running status
        var type = evByte & 0xf0, channel = evByte & 0x0f;
        if (evByte === 0xff) {                                   // meta
          var metaType = b[p++]; r = readVarLen(b, p); var mlen = r[0]; p = r[1];
          if (metaType === 0x51 && mlen === 3 && !tempoSet) { tempo = (b[p] << 16) | (b[p + 1] << 8) | b[p + 2]; tempoSet = true; }
          else if (metaType === 0x58 && mlen >= 2 && !tsSet) { tsNum = b[p]; tsDen = Math.pow(2, b[p + 1]); tsSet = true; }
          p += mlen;
        } else if (evByte === 0xf0 || evByte === 0xf7) {         // sysex
          r = readVarLen(b, p); p = r[1] + r[0];
        } else if (type === 0x90) {                              // note on
          var pitch = b[p++], vel = b[p++];
          if (vel > 0) { var k = (pitch << 4) | channel; (open[k] = open[k] || []).push({ start: abs, vel: vel }); }
          else closeNote(open, notes, pitch, channel, abs);
        } else if (type === 0x80) {                              // note off
          var op = b[p++]; p++; closeNote(open, notes, op, channel, abs);
        } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) { p += 2; }
        else if (type === 0xc0 || type === 0xd0) { p += 1; }
        else { p++; }
      }
      Object.keys(open).forEach(function (k) {
        open[k].forEach(function (o) { notes.push({ pitch: +k >> 4, channel: +k & 0x0f, start: o.start, end: abs, vel: o.vel }); });
      });
      tracks.push(notes);
      pos = end;
    }
    return { tpq: tpq, tempo: tempo, tsNum: tsNum, tsDen: tsDen, tracks: tracks };
  }

  // map every note to hand 1 (RH) / 2 (LH)
  function assignHands(mid, opts) {
    var noteTracks = mid.tracks.map(function (n, i) { return { i: i, n: n }; }).filter(function (x) { return x.n.length > 0; });
    var out = [], mode = (opts && opts.hand) || 'auto';
    var meanOf = function (arr) { return arr.reduce(function (a, b) { return a + b.pitch; }, 0) / arr.length; };

    if ((mode === 'auto' || mode === 'track') && noteTracks.length === 2) {          // classic 2-staff piano MIDI
      var m0 = meanOf(noteTracks[0].n), m1 = meanOf(noteTracks[1].n);
      var rh = m0 >= m1 ? noteTracks[0].i : noteTracks[1].i;
      noteTracks.forEach(function (x) {
        x.n.forEach(function (nt) { out.push({ track: x.i === rh ? 1 : 2, pitch: nt.pitch, start: nt.start, end: nt.end }); });
      });
      return { notes: out, how: 'two staves detected — higher track used as the right hand' };
    }
    if (mode === 'melody') {                                                          // skyline: top note per onset = RH
      var all = []; noteTracks.forEach(function (x) { all = all.concat(x.n); });
      var byOnset = {};
      all.forEach(function (n) { var k = Math.round(n.start / 16); (byOnset[k] = byOnset[k] || []).push(n); });
      Object.keys(byOnset).forEach(function (k) {
        var grp = byOnset[k], mx = Math.max.apply(null, grp.map(function (n) { return n.pitch; }));
        grp.forEach(function (n) { out.push({ track: n.pitch === mx ? 1 : 2, pitch: n.pitch, start: n.start, end: n.end }); });
      });
      return { notes: out, how: 'melody skyline — the top note of each chord became the right hand' };
    }
    var split = (opts && opts.split) || 60;                                           // fallback: pitch split at middle C
    noteTracks.forEach(function (x) {
      x.n.forEach(function (nt) { out.push({ track: nt.pitch >= split ? 1 : 2, pitch: nt.pitch, start: nt.start, end: nt.end }); });
    });
    return { notes: out, how: 'split at middle C — notes above go to the right hand' };
  }

  function convert(data) {
    var tpq = data.tpq, tempo = data.tempo, tsNum = data.tsNum, tsDen = data.tsDen, notes = data.notes;
    if (!notes.length) throw new Error('No notes found in that MIDI file.');
    var minStart = Infinity, i;
    notes.forEach(function (n) { minStart = Math.min(minStart, Math.round(n.start)); });
    if (isFinite(minStart) && minStart > 0) notes.forEach(function (n) { n.start -= minStart; n.end -= minStart; });

    var measTicks = tsNum * (4 * tpq / tsDen);
    // adaptive grid: gcd of onsets, so triplets and 16ths both land exactly
    var g = 0;
    notes.forEach(function (n) { var s = Math.round(n.start); if (s > 0) g = gcd(g, s); });
    g = gcd(g, measTicks);
    var fine = Math.max(1, Math.round(tpq / 12));
    var step = g >= fine ? g : fine;
    while (measTicks % step !== 0 && step > 1) step--;
    var cpm = Math.max(1, Math.round(measTicks / step));
    var maxTick = notes.reduce(function (m, n) { return Math.max(m, n.end || n.start); }, 0);
    var totalMeasures = Math.max(1, Math.ceil((maxTick + 1) / measTicks));

    var onsets = notes.map(function (n) {
      return { col: Math.round(n.start / step), hand: n.track === 1 ? 'R' : 'L', letter: pitchToLetter(n.pitch), octave: pitchToOct(n.pitch) };
    });

    var out = '', noteCount = 0;
    for (var m = 0; m < totalMeasures; m++) {
      var startCol = m * cpm;
      var inM = onsets.filter(function (o) { return o.col >= startCol && o.col < startCol + cpm; });
      if (!inM.length) { out += 'RH 4|' + new Array(cpm + 1).join('-') + '|\n' + (m + 1) + '\n'; continue; }
      var groups = {};
      inM.forEach(function (o) { var k = o.hand + '|' + o.octave; (groups[k] = groups[k] || []).push({ c: o.col - startCol, letter: o.letter }); });
      var lines = [];
      Object.keys(groups).forEach(function (k) {
        var parts = k.split('|'), hand = parts[0], octave = +parts[1];
        var byCol = {};
        groups[k].forEach(function (e) { byCol[e.c] = byCol[e.c] || []; if (byCol[e.c].indexOf(e.letter) < 0) byCol[e.c].push(e.letter); });
        var maxV = Math.max.apply(null, Object.keys(byCol).map(function (c) { return byCol[c].length; }));
        var voices = [];
        for (var v = 0; v < maxV; v++) { var row = []; for (var q = 0; q < cpm; q++) row.push('-'); voices.push(row); }
        Object.keys(byCol).forEach(function (c) {
          byCol[c].forEach(function (ltr, v) { voices[v][+c] = ltr; noteCount++; });
        });
        voices.forEach(function (v) { lines.push({ hand: hand, octave: octave, cells: v.join('') }); });
      });
      lines.sort(function (a, b) { return a.hand === b.hand ? b.octave - a.octave : (a.hand === 'R' ? -1 : 1); });
      lines.forEach(function (l) { out += l.hand + 'H ' + l.octave + '|' + l.cells + '|\n'; });
      out += (m + 1) + '\n';
    }
    var cps = tempo > 0 ? +((tpq * 1e6) / (step * tempo)).toFixed(2) : 6;
    return { notation: out.replace(/\s+$/, ''), cps: cps, measures: totalMeasures, noteCount: noteCount };
  }

  // A held note that re-articulates on every 16th reads as "machine-gun" repeats.
  // Collapse runs of >= 8 identical note-chars to one attack held over dashes.
  function collapseHeld(notation, thresh) {
    thresh = thresh || 8;
    var NOTE = 'cCdDefFgGaAb';
    return notation.split('\n').map(function (line) {
      var m = line.match(/^((?:RH|LH|R|L)?\s*-?\d+\|)(.*)$/);
      if (!m) return line;
      var body = m[2].split(''), i = 0;
      while (i < body.length) {
        var ch = body[i];
        if (NOTE.indexOf(ch) >= 0) {
          var j = i + 1;
          while (j < body.length && body[j] === ch) j++;
          if (j - i >= thresh) for (var k = i + 1; k < j; k++) body[k] = '-';
          i = j;
        } else i++;
      }
      return m[1] + body.join('');
    }).join('\n');
  }

  // Strip fully-empty measures off the END (MIDIs often carry trailing silent bars).
  function trimTrailingEmptyBlocks(notation) {
    var lines = notation.split('\n'), blocks = [], cur = [];
    lines.forEach(function (ln) { cur.push(ln); if (/^\d+$/.test(ln.trim())) { blocks.push(cur); cur = []; } });
    if (cur.length) blocks.push(cur);
    var hasNote = function (b) {
      return b.some(function (l) { return /[a-gA-G]/.test(l.replace(/^(RH|LH)\s*\d*\|?/, '').replace(/\|/g, '').replace(/^\d+$/, '')); });
    };
    var last = -1;
    for (var i = 0; i < blocks.length; i++) if (hasNote(blocks[i])) last = i;
    if (last < 0 || last === blocks.length - 1) return notation;
    var keep = [];
    blocks.slice(0, last + 1).forEach(function (b) { keep = keep.concat(b); });
    return keep.join('\n');
  }

  DRD.midiToLetterNotes = function (arrayBuffer, opts) {
    opts = opts || {};
    var bytes = new Uint8Array(arrayBuffer);
    var mid = parseMidi(bytes);
    var assigned = assignHands(mid, opts);
    var res = convert({ tpq: mid.tpq, tempo: mid.tempo, tsNum: mid.tsNum, tsDen: mid.tsDen, notes: assigned.notes });
    res.notation = trimTrailingEmptyBlocks(collapseHeld(res.notation));
    res.how = assigned.how;
    res.tempoBpm = mid.tempo > 0 ? Math.round(6e7 / mid.tempo) : null;
    res.timeSig = mid.tsNum + '/' + mid.tsDen;
    return res;
  };
})();
