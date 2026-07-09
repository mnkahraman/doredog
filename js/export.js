/* ============================================================================
   DoReDog — Export toolkit
   Reconstructs a downloadable Standard MIDI File, a MusicXML score, and a
   printable letter-note sheet directly from a piece's letter notation.
   Reuses DRD.parseNotation / DRD.noteToMidi so the interpretation matches the
   live player exactly. Notes sustain through '-' (hold) columns; a space, a
   bar '|', another note, or the block end ends the note.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD = global.DRD || {};
  var OCT_HEX = { 2: '#ff54b2', 3: '#35e08c', 4: '#ff5f64', 5: '#f6b73f', 6: '#4fa3ff' };
  var TPQ = 480, TICKS_PER_COL = 120, VEL = 80;

  function isNote(ch) { return ch && ch !== '-' && ch !== ' ' && ch !== '|' && DRD.noteToMidi(ch, 4) != null; }

  // Flatten notation into timed notes. Returns { notes:[{midi,hand,startCol,lenCols,octave,letter}], cols }.
  function notesFromNotation(notation) {
    var blocks = DRD.parseNotation(notation || '');
    var notes = [], startCol = 0, totalCols = 0;
    blocks.forEach(function (block) {
      var width = block.reduce(function (w, l) { return Math.max(w, l.content.length); }, 0);
      block.forEach(function (line) {
        var content = line.content, c = 0;
        while (c < content.length) {
          var ch = content[c];
          if (isNote(ch)) {
            var len = 1, k = c + 1;
            while (k < content.length && content[k] === '-') { len++; k++; }   // sustain through holds
            var midi = DRD.noteToMidi(ch, line.octave);
            if (midi != null) notes.push({ midi: midi, hand: line.hand || 'R', octave: line.octave, letter: ch, startCol: startCol + c, lenCols: len });
          }
          c++;
        }
      });
      startCol += width; totalCols = startCol;
    });
    notes.sort(function (a, b) { return a.startCol - b.startCol || a.midi - b.midi; });
    return { notes: notes, cols: totalCols };
  }

  /* ----------------------------- MIDI (SMF) ------------------------------- */
  function vlq(n) { var b = [n & 0x7f]; n >>>= 7; while (n > 0) { b.unshift((n & 0x7f) | 0x80); n >>>= 7; } return b; }
  function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function u16(n) { return [(n >>> 8) & 255, n & 255]; }
  function str(s) { var a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 255); return a; }
  function chunk(tag, bytes) { return str(tag).concat(u32(bytes.length)).concat(bytes); }

  function buildMIDI(song) {
    var data = notesFromNotation(song.notation);
    var cps = song.cps || 6;
    var usPerQuarter = Math.round(1e6 * TPQ / (cps * TICKS_PER_COL));   // absolute tempo so playback speed == the site
    // tempo track
    var t0 = [].concat(vlq(0), [0xFF, 0x51, 0x03], [(usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255], vlq(0), [0xFF, 0x2F, 0x00]);
    // note track — RH on channel 0, LH on channel 1
    var evs = [];
    data.notes.forEach(function (n) {
      var ch = n.hand === 'L' ? 1 : 0;
      var on = n.startCol * TICKS_PER_COL, off = on + Math.max(1, n.lenCols) * TICKS_PER_COL;
      evs.push({ t: on, kind: 1, midi: n.midi, ch: ch });
      evs.push({ t: off, kind: 0, midi: n.midi, ch: ch });
    });
    evs.sort(function (a, b) { return a.t - b.t || a.kind - b.kind; });   // note-offs before note-ons at the same tick
    var body = [].concat(vlq(0), [0xFF, 0x03], vlq(song.title ? Math.min(song.title.length, 120) : 0), str((song.title || '').slice(0, 120)));
    var last = 0;
    evs.forEach(function (e) {
      body = body.concat(vlq(e.t - last)); last = e.t;
      body.push((e.kind ? 0x90 : 0x80) | e.ch, e.midi & 127, e.kind ? VEL : 0);
    });
    body = body.concat(vlq(0), [0xFF, 0x2F, 0x00]);
    var bytes = str('MThd').concat(u32(6)).concat(u16(1)).concat(u16(2)).concat(u16(TPQ))
      .concat(chunk('MTrk', t0)).concat(chunk('MTrk', body));
    return new Uint8Array(bytes);
  }

  // Standard MIDI File from raw recorded hits [{midi, t (sec)}]. Each note lasts until the next hit
  // (clamped), so a played melody re-imports with sensible note lengths. 120bpm timebase.
  function buildMIDIFromEvents(events, title) {
    var TPQ = 480, usPerQ = 500000, TPS = TPQ * 1e6 / usPerQ;   // 960 ticks/sec at 120bpm
    var t0 = [].concat(vlq(0), [0xFF, 0x51, 0x03], [(usPerQ >> 16) & 255, (usPerQ >> 8) & 255, usPerQ & 255], vlq(0), [0xFF, 0x2F, 0x00]);
    var evs = [];
    (events || []).forEach(function (e, i) {
      var on = Math.round(e.t * TPS);
      var nextT = (i + 1 < events.length) ? events[i + 1].t : e.t + 0.6;
      var dur = Math.max(0.12, Math.min(1.2, nextT - e.t)); if (!(dur > 0)) dur = 0.5;
      evs.push({ t: on, kind: 1, midi: e.midi }); evs.push({ t: on + Math.round(dur * TPS), kind: 0, midi: e.midi });
    });
    evs.sort(function (a, b) { return a.t - b.t || a.kind - b.kind; });
    var nm = (title || 'DoReDog melody').slice(0, 120);
    var body = [].concat(vlq(0), [0xFF, 0x03], vlq(nm.length), str(nm));
    var last = 0;
    evs.forEach(function (e) { body = body.concat(vlq(e.t - last)); last = e.t; body.push(e.kind ? 0x90 : 0x80, e.midi & 127, e.kind ? VEL : 0); });
    body = body.concat(vlq(0), [0xFF, 0x2F, 0x00]);
    return new Uint8Array(str('MThd').concat(u32(6)).concat(u16(1)).concat(u16(2)).concat(u16(TPQ)).concat(chunk('MTrk', t0)).concat(chunk('MTrk', body)));
  }
  // Compact, URL-safe melody codec: "<voiceIdx>~<midi>.<centiseconds>~...". No base64 (raw is shorter + URL-safe).
  function encodeMelody(events) {
    if (!events || !events.length) return '';
    var vId = events[0].voice || (DRD.Synth && DRD.Synth.voiceId), vIdx = 0;
    if (DRD.Synth && DRD.Synth.VOICES) DRD.Synth.VOICES.forEach(function (v, i) { if (v.id === vId) vIdx = i; });
    return vIdx + '~' + events.map(function (e) { return e.midi + '.' + Math.round(e.t * 100); }).join('~');
  }
  function decodeMelody(strv) {
    if (!strv) return null;
    try {
      var parts = String(strv).split('~'), vIdx = +parts[0] || 0;
      var voice = (DRD.Synth && DRD.Synth.VOICES && DRD.Synth.VOICES[vIdx] || (DRD.Synth && DRD.Synth.VOICES && DRD.Synth.VOICES[0]) || { id: 'grand' }).id;
      var out = [];
      for (var i = 1; i < parts.length; i++) { var p = parts[i].split('.'), midi = +p[0]; if (!(midi > 0)) continue; out.push({ midi: midi, t: (+p[1] || 0) / 100, vel: 0.9, voice: voice }); }
      return out.length ? out : null;
    } catch (e) { return null; }
  }

  /* ----------------------------- MusicXML --------------------------------- */
  // A single-staff score: columns map to divisions, grouped into 16-column bars. Simultaneous notes
  // become chords. Both hands merge into one voice (imports cleanly into MuseScore/Finale/Sibelius).
  var STEP = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  var ALTER = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  function xmlNote(midi, divisions, isChord) {
    var s = midi % 12, oct = Math.floor(midi / 12) - 1;
    return '      <note>' + (isChord ? '<chord/>' : '') +
      '<pitch><step>' + STEP[s] + '</step>' + (ALTER[s] ? '<alter>1</alter>' : '') + '<octave>' + oct + '</octave></pitch>' +
      '<duration>' + divisions + '</duration><voice>1</voice></note>\n';
  }
  function xmlRest(divisions) { return '      <note><rest/><duration>' + divisions + '</duration><voice>1</voice></note>\n'; }

  function buildMusicXML(song) {
    var data = notesFromNotation(song.notation);
    var BAR = 16, DIV = 4;   // 16 columns / bar, 4 divisions / quarter → 1 column = 1 sixteenth
    // bucket note attacks by column
    var byCol = {};
    data.notes.forEach(function (n) { (byCol[n.startCol] = byCol[n.startCol] || []).push(n); });
    var cols = Math.max(data.cols, 1);
    var body = '';
    var measures = Math.ceil(cols / BAR);
    for (var m = 0; m < measures; m++) {
      body += '    <measure number="' + (m + 1) + '">\n';
      if (m === 0) {
        body += '      <attributes><divisions>' + DIV + '</divisions><key><fifths>0</fifths></key>' +
          '<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n';
      }
      for (var c = m * BAR; c < (m + 1) * BAR && c < cols; c++) {
        var here = byCol[c];
        if (here && here.length) {
          // one attack column = a sixteenth-worth slot; use the longest note's length for the slot duration
          var uniq = {}; here.forEach(function (n) { uniq[n.midi] = 1; });
          var mids = Object.keys(uniq).map(Number).sort(function (a, b) { return a - b; });
          mids.forEach(function (mi, idx) { body += xmlNote(mi, DIV / 4, idx > 0); });   // DIV/4 = 1 division (a 16th)
        } else {
          body += xmlRest(DIV / 4);
        }
      }
      body += '    </measure>\n';
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n' +
      '<score-partwise version="3.1">\n' +
      '  <work><work-title>' + esc(song.title || 'Untitled') + '</work-title></work>\n' +
      '  <identification><creator type="composer">' + esc(song.composer || '') + '</creator>' +
      '<encoding><software>DoReDog</software></encoding></identification>\n' +
      '  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>\n' +
      '  <part id="P1">\n' + body + '  </part>\n</score-partwise>\n';
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* -------------------------- Printable sheet ----------------------------- */
  function clampOct(o) { return Math.max(2, Math.min(6, o)); }
  function sheetHTML(song) {
    var blocks = DRD.parseNotation(song.notation || '');
    var body = blocks.map(function (block) {
      var rows = block.map(function (line) {
        var hand = line.hand === 'R' ? 'RH' : line.hand === 'L' ? 'LH' : '  ';
        var chars = '';
        for (var i = 0; i < line.content.length; i++) {
          var ch = line.content[i];
          if (isNote(ch)) chars += '<b style="color:' + OCT_HEX[clampOct(line.octave)] + '">' + esc(ch) + '</b>';
          else chars += '<i>' + esc(ch === ' ' ? '·' : ch) + '</i>';
        }
        return '<div class="ln"><span class="lbl">' + hand + ' ' + line.octave + '</span><span class="cnt">' + chars + '</span></div>';
      }).join('');
      return '<div class="blk">' + rows + '</div>';
    }).join('');
    var legend = [2, 3, 4, 5, 6].map(function (o) {
      return '<span class="leg"><i style="background:' + OCT_HEX[o] + '"></i>O' + o + '</span>';
    }).join('');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(song.title || 'Sheet') + ' — DoReDog letter notes</title>' +
      '<style>' +
      'body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#12121a;margin:0;padding:40px 46px;}' +
      'h1{font-size:26px;margin:0 0 2px}.sub{color:#666;font-size:14px;margin-bottom:6px}' +
      '.legend{display:flex;gap:14px;font-size:12px;color:#555;margin:14px 0 22px;flex-wrap:wrap}' +
      '.leg{display:inline-flex;align-items:center;gap:5px}.leg i{width:11px;height:11px;border-radius:3px;display:inline-block}' +
      '.blk{margin:0 0 16px;padding:10px 14px;border:1px solid #eee;border-radius:8px;break-inside:avoid}' +
      '.ln{display:flex;gap:12px;align-items:baseline;font-family:"SF Mono",Menlo,Consolas,monospace;font-size:15px;line-height:1.9;white-space:pre}' +
      '.lbl{color:#aaa;font-size:11px;width:40px;flex:none;text-align:right}' +
      '.cnt b{font-weight:700}.cnt i{color:#cfcfd6;font-style:normal}' +
      '.hint{font-size:12px;color:#888;margin-top:26px;border-top:1px solid #eee;padding-top:12px}' +
      '.pbar{position:fixed;top:14px;right:16px}.pbar button{font:inherit;padding:9px 16px;border-radius:8px;border:0;background:#12121a;color:#fff;cursor:pointer}' +
      '@media print{.pbar{display:none}body{padding:0}}' +
      '</style></head><body>' +
      '<div class="pbar"><button onclick="window.print()">Print / Save PDF</button></div>' +
      '<h1>' + esc(song.title || 'Untitled') + '</h1>' +
      '<div class="sub">' + esc(song.composer || '') + (song.year ? ' · ' + (song.circa ? 'c. ' : '') + song.year : '') + '  —  letter notes from doredog.com</div>' +
      '<div class="legend">' + legend + '</div>' +
      body +
      '<div class="hint">Lowercase = white key · UPPERCASE = sharp (black key) · <b>–</b> = hold · <b>·</b> = rest. Colour = octave. Play it live at doredog.com.</div>' +
      '</body></html>';
  }

  /* ------------------------------ triggers -------------------------------- */
  function download(filename, data, mime) {
    var blob = new Blob([data], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
  }
  function slug(song) { return (song.id || (song.title || 'piece').toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, ''); }

  DRD.notesFromNotation = notesFromNotation;   // exposed for testing
  DRD.exportMIDI = function (song) { download(slug(song) + '.mid', buildMIDI(song), 'audio/midi'); };
  DRD.exportMusicXML = function (song) { download(slug(song) + '.musicxml', buildMusicXML(song), 'application/vnd.recordare.musicxml+xml'); };
  DRD.buildMIDI = buildMIDI; DRD.buildMusicXML = buildMusicXML; DRD.sheetHTML = sheetHTML;
  DRD.buildMIDIFromEvents = buildMIDIFromEvents;
  DRD.encodeMelody = encodeMelody; DRD.decodeMelody = decodeMelody;
  DRD.printSheet = function (song) {
    var w = global.open('', '_blank');
    if (!w) return;
    w.document.open(); w.document.write(sheetHTML(song)); w.document.close();
  };

  /* -------------------- Melody → WAV (offline render) --------------------- */
  // Re-synthesizes recorded piano hits into an OfflineAudioContext using the same voice model as the
  // live Synth (js/player.js note()), then encodes 16-bit PCM stereo WAV. Fully client-side, no backend.
  // events: [{ midi, t (sec), vel?, voice? }]  ->  Promise<Blob|null>
  function midiHz(m) { return DRD.midiToFreq ? DRD.midiToFreq(m) : 440 * Math.pow(2, (m - 69) / 12); }
  function impulse(ctx, dur, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * dur), buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) { var d = buf.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function encodeWav(buf) {
    var nch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate, ba = nch * 2, dl = len * ba;
    var ab = new ArrayBuffer(44 + dl), dv = new DataView(ab);
    function ws(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
    ws(0, 'RIFF'); dv.setUint32(4, 36 + dl, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true); dv.setUint16(22, nch, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * ba, true);
    dv.setUint16(32, ba, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, dl, true);
    var chans = [], c; for (c = 0; c < nch; c++) chans.push(buf.getChannelData(c));
    var off = 44;
    for (var i = 0; i < len; i++) for (c = 0; c < nch; c++) { var s = Math.max(-1, Math.min(1, chans[c][i])); dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2; }
    return new Blob([ab], { type: 'audio/wav' });
  }
  DRD.renderMelodyWav = function (events, fallbackVoiceId) {
    var Synth = DRD.Synth;
    if (!events || !events.length || !Synth || !Synth.VOICES) return Promise.resolve(null);
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    if (!OAC) return Promise.resolve(null);
    var byId = {}; Synth.VOICES.forEach(function (v) { byId[v.id] = v; });
    var last = 0; events.forEach(function (e) { if (e.t > last) last = e.t; });
    var maxDur = 0; Synth.VOICES.forEach(function (v) { if (v.dur > maxDur) maxDur = v.dur; });
    var total = last + maxDur + 1.2, SR = 44100;
    var ctx = new OAC(2, Math.ceil(total * SR), SR);
    var master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    var reverb = ctx.createConvolver(); reverb.buffer = impulse(ctx, 1.6, 3.0);
    var rout = ctx.createGain(); rout.gain.value = 0.9; reverb.connect(rout); rout.connect(master);
    var waveCache = {};
    function waveFor(V) {
      if (waveCache[V.id]) return waveCache[V.id];
      var p = V.partials, real = new Float32Array(p.length), imag = new Float32Array(p.length);
      for (var i = 0; i < p.length; i++) real[i] = p[i];
      return (waveCache[V.id] = ctx.createPeriodicWave(real, imag));
    }
    function scheduleNote(V, wave, freq, t, vel) {
      var v = vel == null ? 0.9 : vel, peak = V.gain * v, flr = 0.0002;
      var highMul = Math.min(1, Math.max(0.4, 1 - (Math.log2(freq) - 9.02) * 0.6));
      var g = ctx.createGain();
      var filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
      filt.frequency.setValueAtTime(V.fStart(freq), t);
      filt.frequency.exponentialRampToValueAtTime(Math.max(V.fEnd(freq), 180), t + V.fTime);
      filt.connect(g);
      var all = [];
      var main = ctx.createOscillator(); main.setPeriodicWave(wave); main.frequency.value = freq; main.connect(filt); all.push(main);
      if (V.detune) { var o2 = ctx.createOscillator(); o2.setPeriodicWave(wave); o2.frequency.value = freq; o2.detune.value = V.detune; o2.connect(filt); all.push(o2); }
      if (V.sub) { var os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = freq / 2; var sg = ctx.createGain(); sg.gain.value = V.sub; os.connect(sg); sg.connect(filt); all.push(os); }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + V.atk);
      if (V.sustained) {
        g.gain.exponentialRampToValueAtTime(Math.max(peak * V.sus, flr), t + V.atk + V.dec);
        g.gain.setValueAtTime(Math.max(peak * V.sus, flr), t + Math.max(V.atk + V.dec + 0.01, V.dur - V.rel));
        g.gain.exponentialRampToValueAtTime(0.0001, t + V.dur);
      } else {
        g.gain.exponentialRampToValueAtTime(Math.max(peak * V.sus, flr), t + V.dec);
        g.gain.exponentialRampToValueAtTime(0.0001, t + V.dur);
      }
      g.connect(master);
      if (V.rvb > 0) { var rs = ctx.createGain(); rs.gain.value = V.rvb * (0.6 + 0.4 * highMul); g.connect(rs); rs.connect(reverb); }
      var stopAt = t + V.dur + 0.08;
      all.forEach(function (o) { o.start(t); o.stop(stopAt); });
      if (V.shimmer) {
        var sh = ctx.createOscillator(); sh.type = 'sine'; sh.frequency.value = freq * (V.shimmerMul || 2);
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(Math.max(peak * V.shimmer * highMul, 0.00005), t + V.atk + 0.002);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + (V.shimmerDur || 0.9));
        sh.connect(g2); g2.connect(master);
        sh.start(t); sh.stop(t + (V.shimmerDur || 0.9) + 0.05);
      }
    }
    events.forEach(function (e) {
      var V = byId[e.voice] || byId[fallbackVoiceId] || byId[Synth.voiceId] || Synth.VOICES[0];
      scheduleNote(V, waveFor(V), midiHz(e.midi), e.t, e.vel);
    });
    return ctx.startRendering().then(function (rendered) { return encodeWav(rendered); });
  };
  DRD.downloadBlob = function (name, blob) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
  };
})(typeof window !== 'undefined' ? window : this);
