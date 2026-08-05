/* ============================================================================
   Music Pad v2 — a professional groovebox that reads the score.

   What changed from v1, and why:

   TWO CLOCKS. v1 derived the groove from the transcription grid, and
   transcription density is not tempo — a dense piece made the drums sprint, a
   sparse one made them crawl. Now the GROOVE runs on its own BPM (a real
   clock, user-set, defaulting to the piece's normalized pulse) and the PIECE
   streams at its own independent speed. Two sliders, two tempos, one
   scheduler. The bar — the unit everything quantizes to — belongs to the
   groove clock, which is what a musician expects.

   MATRICES. Drums are no longer four preset pads: a full 4×16 step matrix
   (kick/snare/hat/clave × sixteenths) is editable live, with the four old
   grooves as presets. Four SCENES capture and recall the whole machine state,
   queued to the bar. A mixer strip gives every voice its own level.

   THE LOOPER. A performance keyboard (screen keys + the QWERTY letter rows)
   is scale-locked to the detected key by default, so jamming over the piece
   cannot go wrong — and a bar-quantized loop recorder captures what you play
   and cycles it: record, overdub, clear, 1/2/4/8 bars.

   Analysis is unchanged and honest: pulse, Krumhansl-Kessler key, bar-by-bar
   bass root and harmony, all read from the notation, never guessed from audio.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.getElementById('pad-root');
  if (!root) return;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  var NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  function loadNotation(sid, cb) {
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    if (DRD.NOTATIONS[sid]) return cb(DRD.NOTATIONS[sid]);
    var sc = document.createElement('script');
    sc.src = 'songs/' + sid + '.js?v=90';
    sc.onload = sc.onerror = function () { cb((DRD.NOTATIONS || {})[sid] || null); };
    document.head.appendChild(sc);
  }

  /* ------------------------------ analysis ------------------------------- */
  var KK_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var KK_MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  function detectKey(cols) {
    var hist = new Array(12).fill(0);
    cols.forEach(function (c) {
      c.events.forEach(function (ev) { hist[ev.midi % 12] += ev.midi < 60 ? 1.4 : 1; });
    });
    var best = { score: -1, root: 0, minor: false };
    for (var mode = 0; mode < 2; mode++) {
      var prof = mode ? KK_MIN : KK_MAJ;
      for (var r = 0; r < 12; r++) {
        var s = 0;
        for (var i = 0; i < 12; i++) s += hist[(r + i) % 12] * prof[i];
        if (s > best.score) best = { score: s, root: r, minor: !!mode };
      }
    }
    best.name = NOTE_NAMES[best.root] + (best.minor ? ' minor' : ' major');
    best.scale = (best.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11])
      .map(function (iv) { return (best.root + iv) % 12; });
    return best;
  }
  function analyseBars(cols) {
    var bars = [];
    for (var b = 0; b * 8 < cols.length; b++) {
      var lows = new Array(12).fill(0), all = new Array(12).fill(0);
      for (var c = b * 8; c < Math.min(cols.length, b * 8 + 8); c++) {
        var evs = cols[c].events;
        if (!evs.length) continue;
        var lo = 999;
        evs.forEach(function (ev) { all[ev.midi % 12]++; if (ev.midi < lo) lo = ev.midi; });
        lows[lo % 12] += 2;
      }
      var bass = 0, bw = -1;
      for (var i = 0; i < 12; i++) if (lows[i] + all[i] * 0.3 > bw) { bw = lows[i] + all[i] * 0.3; bass = i; }
      var pcs = all.map(function (w, pc) { return { pc: pc, w: w + lows[pc] }; })
        .filter(function (x) { return x.w > 0; })
        .sort(function (x, y) { return y.w - x.w; })
        .slice(0, 3).map(function (x) { return x.pc; });
      bars.push({ bass: bass, pcs: pcs.length ? pcs : [bass] });
    }
    return bars.length ? bars : [{ bass: 0, pcs: [0, 4, 7] }];
  }

  /* ------------------------------ state ---------------------------------- */
  var qs = new URLSearchParams(location.search);
  var DEFAULT = 'gymnopedie-no-1';
  var song = null, cols = [], bars = [], key = null;

  // two independent clocks — the fix for "the rhythm never fits the piece"
  var grooveBpm = 100, pieceSpeed = 1, swing = 0, tapeStop = 0;
  var basePieceStep = 0.25;
  function grooveStep() { return (60 / grooveBpm) / 4 * (tapeStop > 0 ? 1 + tapeStop * 6 : 1); }  // sixteenths
  function pieceStep() { return (basePieceStep / pieceSpeed) * (tapeStop > 0 ? 1 + tapeStop * 6 : 1); }

  var playing = false, timer = null;
  var g16 = 0, nextG = 0;                 // groove sixteenth counter / next scheduled time
  var pCol = 0, nextP = 0;                // piece column counter / next scheduled time
  var pieceOn = true, breakArmed = false, live = [];

  var DRUMS = ['kick', 'snare', 'hat', 'clave'];
  var DRUM_LABELS = ['Kick', 'Snare', 'Hat', 'Clave'];
  var DRUM_PRESETS = {
    'Four floor': { kick: [0, 4, 8, 12], snare: [], hat: [2, 6, 10, 14], clave: [] },
    'Backbeat': { kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], clave: [] },
    'Shaker': { kick: [0, 8], snare: [], hat: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14], clave: [6, 14] },
    'Half-time': { kick: [0], snare: [8], hat: [0, 4, 8, 12], clave: [] }
  };
  function emptyMatrix() { var m = {}; DRUMS.forEach(function (k) { m[k] = new Array(16).fill(false); }); return m; }
  function matrixFrom(preset) {
    var m = emptyMatrix();
    DRUMS.forEach(function (k) { (preset[k] || []).forEach(function (i) { m[k][i] = true; }); });
    return m;
  }
  var drumMatrix = matrixFrom(DRUM_PRESETS['Backbeat']);
  var drumsOn = false;

  var BASS_SLOTS = ['Root pulse', 'Octave pump', 'Fifth walk', 'Bass arp'];
  var TEX_SLOTS = ['Pad chords', 'Arpeggio', 'Shimmer', 'Drone'];
  var active = { bass: -1, texture: -1 };
  var queued = { bass: null, texture: null, drumsOn: null, scene: null };

  var vol = { piece: 1, drums: 1, bass: 0.9, texture: 0.8, keys: 1 };

  // the looper: events live in GROOVE SIXTEENTH units, so they survive tempo changes
  var loop = { bars: 4, events: [], recording: false, quantize: true };
  var scaleLock = true, keyOct = 0;

  // scenes: snapshots of the whole machine
  var scenes = [null, null, null, null], sceneActive = -1;
  function snapshot() {
    return JSON.parse(JSON.stringify({
      drumMatrix: drumMatrix, drumsOn: drumsOn, active: active,
      vol: vol, swing: swing, grooveBpm: grooveBpm, pieceSpeed: pieceSpeed
    }));
  }
  function recall(sn) {
    drumMatrix = JSON.parse(JSON.stringify(sn.drumMatrix));
    drumsOn = sn.drumsOn; active = JSON.parse(JSON.stringify(sn.active));
    vol = JSON.parse(JSON.stringify(sn.vol)); swing = sn.swing;
    grooveBpm = sn.grooveBpm; pieceSpeed = sn.pieceSpeed;
    syncControls(); paintMatrix(); paintPads();
  }

  var els = {};

  /* ------------------------------ audio ---------------------------------- */
  function note(midi, when, vel) { DRD.Synth.ensure(); return DRD.Synth.note(DRD.midiToFreq(midi), when, vel); }
  function drum(kind, when, vel) {
    var ctx = DRD.Synth.ctx, t = when, v = (vel == null ? 1 : vel) * vol.drums;
    if (v <= 0.01) return;
    var out = DRD.Synth.master || ctx.destination;
    if (!drum._noise) {
      var b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      var d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      drum._noise = b;
    }
    var g = ctx.createGain(); g.connect(out);
    if (kind === 'kick') {
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.85 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); o.start(t); o.stop(t + 0.3);
    } else if (kind === 'snare') {
      var sn = ctx.createBufferSource(); sn.buffer = drum._noise;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
      sn.connect(f); f.connect(g);
      g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      sn.start(t); sn.stop(t + 0.2);
    } else if (kind === 'hat') {
      var h = ctx.createBufferSource(); h.buffer = drum._noise;
      var hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 8000;
      h.connect(hf); hf.connect(g);
      g.gain.setValueAtTime(0.22 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      h.start(t); h.stop(t + 0.06);
    } else {
      var c2 = ctx.createOscillator(); c2.type = 'sine'; c2.frequency.value = 2400;
      g.gain.setValueAtTime(0.3 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      c2.connect(g); c2.start(t); c2.stop(t + 0.05);
    }
  }
  function riser(when, dur) {
    var ctx = DRD.Synth.ctx, out = DRD.Synth.master || ctx.destination;
    var s = ctx.createBufferSource(); s.buffer = drum._noise; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(200, when);
    f.frequency.exponentialRampToValueAtTime(6000, when + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, when);
    g.gain.exponentialRampToValueAtTime(0.35, when + dur);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur + 0.15);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(when); s.stop(when + dur + 0.2);
  }

  function bassMidi(pc) { return 36 + ((pc + 12) % 12); }
  function chordMidis(bar) {
    return bar.pcs.map(function (pc) { return 48 + ((pc + 12) % 12); })
      .sort(function (a, b) { return a - b; });
  }
  function curBar() { return bars[Math.floor(pCol / 8) % bars.length]; }

  /* ------------------------------ scheduler ------------------------------ */
  function tick() {
    var actx = DRD.Synth.ctx, horizon = actx.currentTime + 0.14;

    // PIECE clock — its own tempo, untouched by the groove
    while (nextP < horizon) {
      if (pieceOn && vol.piece > 0.01) {
        cols[pCol % cols.length].events.forEach(function (ev) {
          live.push(note(ev.midi, nextP, 0.72 * vol.piece));
          if (active.texture === 2 && ev.midi >= 60) note(ev.midi + 12, nextP + pieceStep() / 2, 0.18 * vol.texture);
        });
      }
      pCol = (pCol + 1) % (Math.ceil(cols.length / 8) * 8);
      nextP += pieceStep();
      (function (c, when) {
        var d = Math.max(0, (when - actx.currentTime) * 1000);
        setTimeout(function () { if (playing) paintRibbon(c); }, d);
      })(pCol, nextP);
    }

    // GROOVE clock — sixteenths at its own bpm; bars live here
    while (nextG < horizon) {
      scheduleGroove(g16, nextG);
      var d = grooveStep();
      if (swing > 0) d *= (g16 % 2 === 0) ? 1 + swing / 100 : 1 - swing / 100;
      nextG += d;
      g16++;
      if (g16 % 16 === 0) barLine();
      if (tapeStop > 0) { tapeStop -= 0.05; if (tapeStop < 0) tapeStop = 0; }
    }
  }

  function scheduleGroove(g, t) {
    var step = g % 16, bar = curBar();
    if (drumsOn) DRUMS.forEach(function (k) { if (drumMatrix[k][step]) drum(k, t, k === 'hat' && step % 4 ? 0.6 : 1); });
    if (active.bass >= 0 && vol.bass > 0.01) {
      var r = bassMidi(bar.bass), v = 0.55 * vol.bass;
      var fig = [
        [[0, r], [4, r], [8, r], [12, r]],
        [[0, r], [2, r + 12], [4, r], [6, r + 12], [8, r], [10, r + 12], [12, r], [14, r + 12]],
        [[0, r], [4, r + 7], [8, r + 12], [12, r + 7]],
        [[0, r], [2, r + 7], [4, r + 12], [6, r + 7], [8, r], [10, r + 7], [12, r + 12], [14, r + 7]]
      ][active.bass];
      fig.forEach(function (hit) { if (hit[0] === step) note(hit[1], t, v); });
    }
    if (active.texture === 0 && step === 0 && vol.texture > 0.01) {
      chordMidis(bar).forEach(function (m) { note(m + 12, t, 0.3 * vol.texture); });
    }
    if (active.texture === 1 && step % 2 === 0 && vol.texture > 0.01) {
      var cm = chordMidis(bar);
      note(cm[Math.floor(g / 2) % cm.length] + 24, t, 0.26 * vol.texture);
    }
    if (active.texture === 3 && step === 0 && vol.texture > 0.01) {
      note(bassMidi(key.root), t, 0.32 * vol.texture);
      note(bassMidi(key.root) + 7, t, 0.18 * vol.texture);
    }
    // the loop lives in groove-sixteenth units: schedule each event relative to
    // this cycle's downbeat, at the CURRENT groove tempo
    if (loop.events.length && step === 0 && (Math.floor(g / 16) % loop.bars) === 0 && vol.keys > 0.01) {
      loop.events.forEach(function (ev) {
        note(ev.midi, t + ev.g16 * grooveStep(), 0.6 * vol.keys);
      });
      els.loopLed.classList.add('on');
      setTimeout(function () { els.loopLed.classList.remove('on'); }, 300);
    }
    var delay = Math.max(0, (t - DRD.Synth.ctx.currentTime) * 1000);
    setTimeout(function () { if (playing) paintBeat(g); }, delay);
  }

  function barLine() {
    ['bass', 'texture'].forEach(function (row) {
      if (queued[row] !== null) {
        active[row] = queued[row] === active[row] ? -1 : queued[row];
        queued[row] = null; paintPads();
      }
    });
    if (queued.drumsOn !== null) { drumsOn = queued.drumsOn; queued.drumsOn = null; paintPads(); }
    if (queued.scene !== null) { var s = queued.scene; queued.scene = null; sceneActive = s; recall(scenes[s]); paintScenes(); }
    if (breakArmed) { pieceOn = true; breakArmed = false; }
  }

  /* ------------------------------ looper --------------------------------- */
  function recordNote(midi) {
    if (!loop.recording || !playing) return;
    var now = DRD.Synth.ctx.currentTime;
    // position inside the current loop cycle, measured in groove sixteenths —
    // tempo-proof: change the BPM later and the loop keeps its musical shape
    var stepsIntoCycle = (g16 - 1) % (loop.bars * 16);
    var frac = 1 - Math.max(0, (nextG - now) / grooveStep());
    var pos = stepsIntoCycle + frac;
    if (loop.quantize) pos = Math.round(pos);
    pos = ((pos % (loop.bars * 16)) + loop.bars * 16) % (loop.bars * 16);
    loop.events.push({ g16: pos, midi: midi });
    els.loopCount.textContent = loop.events.length + ' notes';
  }

  function playKey(midi) {
    DRD.Synth.ensure();
    if (scaleLock && key) {
      var pc = midi % 12;
      if (key.scale.indexOf(pc) < 0) {
        var bestPc = key.scale[0], bd = 99;
        key.scale.forEach(function (sp) {
          var d = Math.min((pc - sp + 12) % 12, (sp - pc + 12) % 12);
          if (d < bd) { bd = d; bestPc = sp; }
        });
        midi = midi - pc + bestPc;
      }
    }
    midi += keyOct * 12;
    note(midi, null, 0.85 * vol.keys);
    if (els.piano && els.piano.keys[midi]) {
      var k = els.piano.keys[midi], o = Math.max(2, Math.min(6, Math.floor(midi / 12) - 1));
      k.classList.add('down', 'lit', 'lit-o' + o);
      setTimeout(function () { k.classList.remove('down', 'lit', 'lit-o' + o); }, 200);
    }
    recordNote(midi);
  }

  /* ------------------------------ UI ------------------------------------- */
  function fader(labelText, min, max, val, unit, oninput) {
    var wrap = el('div', 'pad-fader');
    var lab = el('label', null, labelText + ' <i>' + val + unit + '</i>');
    var input = el('input');
    input.type = 'range'; input.min = min; input.max = max; input.value = val;
    input.addEventListener('input', function () {
      lab.querySelector('i').textContent = input.value + unit;
      oninput(+input.value);
    });
    wrap.appendChild(lab); wrap.appendChild(input);
    wrap.input = input; wrap.lab = lab;
    return wrap;
  }

  function build() {
    root.innerHTML =
      '<div class="arc-head">' +
        '<a class="arc-back" href="games.html">← All games &amp; tools</a>' +
        '<h1 class="arc-title"><span class="arc-ico">🎛️</span> Music Pad</h1>' +
        '<p class="arc-desc">A groovebox that reads the score. The piece and the groove run on <b>separate clocks</b> — set each tempo yourself — and everything you launch lands on the bar. Jam on the keys; the looper keeps what you play.</p>' +
      '</div>' +
      '<div class="pad-deck">' +
        '<div class="pad-transport">' +
          '<button class="pad-play" id="pad-play" type="button" title="Space">▶</button>' +
          '<div class="pad-bpm"><b id="pad-bpm">100</b><span>GROOVE BPM</span></div>' +
          '<div class="pad-faders" id="pad-faders"></div>' +
          '<button class="btn btn-ghost pad-sync" id="pad-sync" type="button" title="Set the groove tempo from the piece’s own pulse">⇄ Sync</button>' +
          '<div class="pad-key" id="pad-key" title="Detected from the notes — Krumhansl profile">—</div>' +
          '<div class="pad-beats" id="pad-beats"><i></i><i></i><i></i><i></i></div>' +
          '<div class="pad-scenes" id="pad-scenes"></div>' +
        '</div>' +
        '<div class="pad-source">' +
          '<input type="search" id="pad-search" placeholder="Search the 2,433 pieces…" autocomplete="off">' +
          '<div class="pad-suggest" id="pad-suggest" hidden></div>' +
          '<span class="pad-nowplaying" id="pad-now">—</span>' +
        '</div>' +
        '<canvas class="pad-ribbon" id="pad-ribbon" height="48"></canvas>' +
        '<div class="pad-body">' +
          '<div class="pad-section">' +
            '<div class="pad-section-head">' +
              '<button class="pad-arm" id="pad-drums-arm" type="button" title="Launch/stop the drums (on the bar while playing)">● DRUMS</button>' +
              '<div class="pad-presets" id="pad-presets"></div>' +
            '</div>' +
            '<div class="pad-matrix" id="pad-matrix"></div>' +
          '</div>' +
          '<div class="pad-section"><div class="pad-rowgrid" id="pad-rows"></div></div>' +
          '<div class="pad-section pad-keys-sec">' +
            '<div class="pad-section-head">' +
              '<span class="pad-sec-label" style="color:#4fa3ff">KEYS · LOOPER <i class="pad-led" id="pad-loop-led"></i></span>' +
              '<div class="pad-loop-controls">' +
                '<button class="pad-rec" id="pad-rec" type="button" title="Record what you play into the loop">⏺ Rec</button>' +
                '<button class="btn btn-ghost" id="pad-clear" type="button">Clear</button>' +
                '<select id="pad-loopbars" class="pad-select" title="Loop length">' +
                  '<option value="1">1 bar</option><option value="2">2 bars</option>' +
                  '<option value="4" selected>4 bars</option><option value="8">8 bars</option></select>' +
                '<label class="pad-check" title="Snap what you play to the nearest sixteenth"><input type="checkbox" id="pad-quant" checked> Quantize</label>' +
                '<label class="pad-check" title="Every note you play snaps into the detected key"><input type="checkbox" id="pad-scalelock" checked> Scale lock</label>' +
                '<span class="pad-loop-count" id="pad-loopcount">empty</span>' +
              '</div>' +
            '</div>' +
            '<div class="arc-keys-wrap" id="pad-piano"></div>' +
            '<p class="pad-keys-hint">Mouse or type: <kbd>A</kbd>–<kbd>L</kbd> white keys · <kbd>W</kbd>–<kbd>P</kbd> black · <kbd>Z</kbd>/<kbd>X</kbd> octave down/up · scale lock keeps everything in <b id="pad-keyname2">the key</b></p>' +
          '</div>' +
          '<div class="pad-section"><div class="pad-mixer" id="pad-mixer"></div></div>' +
        '</div>' +
      '</div>';

    els.play = document.getElementById('pad-play');
    els.bpm = document.getElementById('pad-bpm');
    els.key = document.getElementById('pad-key');
    els.now = document.getElementById('pad-now');
    els.beats = document.getElementById('pad-beats').children;
    els.ribbon = document.getElementById('pad-ribbon');
    els.loopCount = document.getElementById('pad-loopcount');
    els.loopLed = document.getElementById('pad-loop-led');

    // the two-clock transport
    var faders = document.getElementById('pad-faders');
    els.grooveFader = fader('Groove', 60, 200, grooveBpm, ' bpm', function (v) {
      grooveBpm = v; els.bpm.textContent = v;
    });
    els.pieceFader = fader('Piece', 25, 200, 100, '%', function (v) { pieceSpeed = v / 100; });
    els.swingFader = fader('Swing', 0, 40, 0, '%', function (v) { swing = v; });
    faders.appendChild(els.grooveFader); faders.appendChild(els.pieceFader); faders.appendChild(els.swingFader);

    document.getElementById('pad-sync').addEventListener('click', function () {
      var b = (song && song.cps ? song.cps : 4) * 30 * pieceSpeed;
      while (b < 70) b *= 2;
      while (b > 180) b /= 2;
      grooveBpm = Math.round(b);
      syncControls();
    });

    // scenes: click = save when empty / recall when saved (on the bar); hold = overwrite
    var scWrap = document.getElementById('pad-scenes');
    ['A', 'B', 'C', 'D'].forEach(function (name, i) {
      var b = el('button', 'pad-scene', name);
      b.type = 'button';
      b.title = 'Scene ' + name + ': click saves the current setup; once saved, click recalls it on the bar; hold overwrites.';
      var holdT = null;
      b.addEventListener('pointerdown', function () {
        holdT = setTimeout(function () { scenes[i] = snapshot(); sceneActive = i; paintScenes(); holdT = null; }, 600);
      });
      b.addEventListener('pointerup', function () {
        if (!holdT) return;
        clearTimeout(holdT); holdT = null;
        if (!scenes[i]) { scenes[i] = snapshot(); sceneActive = i; }
        else if (playing) { queued.scene = i; b.classList.add('queued'); return; }
        else { sceneActive = i; recall(scenes[i]); }
        paintScenes();
      });
      scWrap.appendChild(b);
    });

    // drums: arm button + presets + the 4×16 matrix
    document.getElementById('pad-drums-arm').addEventListener('click', function () {
      DRD.Synth.ensure();
      if (playing) queued.drumsOn = !drumsOn;
      else { drumsOn = !drumsOn; paintPads(); }
    });
    var presets = document.getElementById('pad-presets');
    Object.keys(DRUM_PRESETS).forEach(function (name) {
      var b = el('button', 'chip', name);
      b.type = 'button';
      b.addEventListener('click', function () {
        drumMatrix = matrixFrom(DRUM_PRESETS[name]);
        if (!playing) drumsOn = true; else if (!drumsOn) queued.drumsOn = true;
        paintMatrix(); paintPads();
      });
      presets.appendChild(b);
    });
    var clearD = el('button', 'chip', 'Clear');
    clearD.type = 'button';
    clearD.addEventListener('click', function () { drumMatrix = emptyMatrix(); paintMatrix(); });
    presets.appendChild(clearD);

    var mx = document.getElementById('pad-matrix');
    els.cells = [];
    DRUMS.forEach(function (k, r) {
      var rowEl = el('div', 'pad-mx-row');
      rowEl.appendChild(el('span', 'pad-mx-lab', DRUM_LABELS[r]));
      var line = el('div', 'pad-mx-line');
      els.cells.push([]);
      for (var c = 0; c < 16; c++) {
        (function (k, c) {
          var b = el('button', 'arc-cell' + (c % 4 === 0 ? ' bar' : ''), '');
          b.type = 'button';
          b.addEventListener('pointerdown', function () {
            drumMatrix[k][c] = !drumMatrix[k][c];
            b.classList.toggle('on', drumMatrix[k][c]);
            if (drumMatrix[k][c]) { DRD.Synth.ensure(); drum(k, DRD.Synth.ctx.currentTime); }
          });
          line.appendChild(b); els.cells[r].push(b);
        })(k, c);
      }
      rowEl.appendChild(line);
      mx.appendChild(rowEl);
    });

    // bass + texture + perform pads
    var rows = document.getElementById('pad-rows');
    [['bass', 'BASS', '#8b6bff', BASS_SLOTS], ['texture', 'TEXTURE', '#35e08c', TEX_SLOTS]].forEach(function (def) {
      var lab = el('span', 'pad-sec-label', def[1]);
      lab.style.color = def[2];
      rows.appendChild(lab);
      def[3].forEach(function (name, si) {
        var b = el('button', 'pad-pad', '<b>' + name + '</b>');
        b.type = 'button';
        b.style.setProperty('--row', def[2]);
        b.dataset.row = def[0]; b.dataset.slot = si;
        b.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          DRD.Synth.ensure();
          if (!playing) active[def[0]] = active[def[0]] === si ? -1 : si;
          else queued[def[0]] = si;
          paintPads();
        });
        rows.appendChild(b);
      });
    });
    var perfLab = el('span', 'pad-sec-label', 'PERFORM');
    perfLab.style.color = '#f6b73f';
    rows.appendChild(perfLab);
    ['Stutter', 'Tape stop', 'Riser', 'Break'].forEach(function (name, si) {
      var b = el('button', 'pad-pad', '<b>' + name + '</b>');
      b.type = 'button';
      b.style.setProperty('--row', '#f6b73f');
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        DRD.Synth.ensure();
        b.classList.add('held');
        setTimeout(function () { b.classList.remove('held'); }, 350);
        if (!playing) return;
        var t = DRD.Synth.ctx.currentTime + 0.02;
        if (si === 0) {
          var q = grooveStep();
          for (var i = 0; i < 4; i++) cols[pCol % cols.length].events.forEach(function (ev) { note(ev.midi, t + i * q / 2, 0.5 * vol.piece); });
        } else if (si === 1) tapeStop = 1;
        else if (si === 2) riser(t, Math.max(0.4, (16 - g16 % 16) * grooveStep()));
        else if (si === 3) { pieceOn = false; breakArmed = true; }
      });
      rows.appendChild(b);
    });

    // mixer
    var mixer = document.getElementById('pad-mixer');
    mixer.appendChild(el('span', 'pad-sec-label', 'MIX'));
    [['piece', 'Piece'], ['drums', 'Drums'], ['bass', 'Bass'], ['texture', 'Texture'], ['keys', 'Keys']].forEach(function (m) {
      var f = fader(m[1], 0, 100, Math.round(vol[m[0]] * 100), '', function (v) { vol[m[0]] = v / 100; });
      f.classList.add('pad-mix-fader');
      mixer.appendChild(f);
    });

    // keys + looper
    els.piano = DRD.buildPiano(document.getElementById('pad-piano'), [3, 5], function (freq, k, oct, midi) {
      playKey(midi);
    });
    var MAP = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75 };
    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      var kk = e.key.toLowerCase();
      if (kk === ' ') { e.preventDefault(); togglePlay(); return; }
      if (kk === 'z') { keyOct = Math.max(-2, keyOct - 1); return; }
      if (kk === 'x') { keyOct = Math.min(2, keyOct + 1); return; }
      if (e.repeat) return;
      if (MAP[kk] != null) { e.preventDefault(); playKey(MAP[kk]); }
    });
    document.getElementById('pad-rec').addEventListener('click', function () {
      loop.recording = !loop.recording;
      this.classList.toggle('on', loop.recording);
      els.loopCount.textContent = loop.recording ? 'recording…' : (loop.events.length ? loop.events.length + ' notes' : 'empty');
    });
    document.getElementById('pad-clear').addEventListener('click', function () {
      loop.events = []; els.loopCount.textContent = 'empty';
    });
    document.getElementById('pad-loopbars').addEventListener('change', function () { loop.bars = +this.value; });
    document.getElementById('pad-quant').addEventListener('change', function () { loop.quantize = this.checked; });
    document.getElementById('pad-scalelock').addEventListener('change', function () { scaleLock = this.checked; });

    els.play.addEventListener('click', togglePlay);

    // search
    var search = document.getElementById('pad-search'), sug = document.getElementById('pad-suggest');
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      if (q.length < 2) { sug.hidden = true; return; }
      var hits = (DRD.SONGS || []).filter(function (s) {
        return (s.title + ' ' + s.composer).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 8);
      sug.innerHTML = '';
      hits.forEach(function (s) {
        var o = el('button', 'pad-suggest-item', s.title + ' <i>' + s.composer + '</i>');
        o.type = 'button';
        o.addEventListener('click', function () { sug.hidden = true; search.value = ''; loadSong(s.id); });
        sug.appendChild(o);
      });
      sug.hidden = !hits.length;
    });
    document.addEventListener('click', function (e) { if (!sug.contains(e.target) && e.target !== search) sug.hidden = true; });
  }

  function syncControls() {
    els.bpm.textContent = grooveBpm;
    els.grooveFader.input.value = grooveBpm;
    els.grooveFader.lab.querySelector('i').textContent = grooveBpm + ' bpm';
    els.pieceFader.input.value = Math.round(pieceSpeed * 100);
    els.pieceFader.lab.querySelector('i').textContent = Math.round(pieceSpeed * 100) + '%';
    els.swingFader.input.value = swing;
    els.swingFader.lab.querySelector('i').textContent = swing + '%';
  }
  function paintScenes() {
    [].forEach.call(document.querySelectorAll('.pad-scene'), function (b, i) {
      b.classList.toggle('saved', !!scenes[i]);
      b.classList.toggle('active', sceneActive === i);
      b.classList.remove('queued');
    });
  }
  function paintMatrix() {
    DRUMS.forEach(function (k, r) {
      for (var c = 0; c < 16; c++) els.cells[r][c].classList.toggle('on', drumMatrix[k][c]);
    });
  }
  function paintPads() {
    document.getElementById('pad-drums-arm').classList.toggle('on', drumsOn);
    document.getElementById('pad-drums-arm').classList.toggle('queued', queued.drumsOn !== null);
    [].forEach.call(document.querySelectorAll('.pad-pad[data-row]'), function (b) {
      var row = b.dataset.row, si = +b.dataset.slot;
      b.classList.toggle('armed', active[row] === si);
      b.classList.toggle('queued', queued[row] === si);
    });
  }
  function paintBeat(g) {
    var beat = Math.floor((g % 16) / 4);
    for (var i = 0; i < 4; i++) els.beats[i].classList.toggle('on', i === beat);
    var step = g % 16;
    DRUMS.forEach(function (k, r) {
      var c = els.cells[r][step];
      c.classList.add('lit');
      setTimeout(function () { c.classList.remove('lit'); }, grooveStep() * 900);
    });
  }
  function paintRibbon(c) {
    var cv = els.ribbon, g = cv.getContext('2d');
    var w = cv.width = cv.clientWidth, h = cv.height;
    g.clearRect(0, 0, w, h);
    var span = 48, colW = w / span;
    for (var i = 0; i < span; i++) {
      var ci = (c + i - 8 + cols.length * 8) % cols.length;
      var x = i * colW;
      if ((c + i - 8) % 8 === 0) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, 0, 1, h); }
      cols[ci].events.forEach(function (ev) {
        var oct = Math.max(2, Math.min(6, Math.floor(ev.midi / 12) - 1));
        var y = h - ((ev.midi - 36) / 48) * (h - 8) - 4;
        g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--o' + oct).trim() || '#7fc4ff';
        g.globalAlpha = i === 8 ? 1 : 0.5;
        g.fillRect(x + 1, y, Math.max(2, colW - 2), 3);
      });
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(246,183,63,.9)';
    g.fillRect(8 * colW, 0, 2, h);
  }

  function togglePlay() {
    DRD.Synth.ensure();
    if (playing) {
      playing = false;
      clearInterval(timer);
      els.play.textContent = '▶'; els.play.classList.remove('on');
      return;
    }
    if (!cols.length) return;
    playing = true;
    els.play.textContent = '❚❚'; els.play.classList.add('on');
    g16 = 0; pCol = 0; tapeStop = 0; pieceOn = true; breakArmed = false;
    var t0 = DRD.Synth.ctx.currentTime + 0.1;
    nextG = t0; nextP = t0;
    timer = setInterval(tick, 25);
  }

  function loadSong(id) {
    var s = (DRD.SONGS || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var wasPlaying = playing;
    if (playing) togglePlay();
    loadNotation(id, function (nota) {
      if (!nota) { els.now.textContent = 'Could not load that piece — pick another.'; return; }
      song = s;
      cols = DRD.buildTimeline(DRD.parseNotation(nota)).cols;
      key = detectKey(cols);
      bars = analyseBars(cols);
      basePieceStep = 1 / Math.max(1, Math.min(12, s.cps || 4));
      els.key.textContent = key.name;
      var k2 = document.getElementById('pad-keyname2');
      if (k2) k2.textContent = key.name;
      els.now.textContent = s.title + ' — ' + s.composer + ' · ' + Math.ceil(cols.length / 8) + ' bars';
      document.title = 'Music Pad — ' + s.title + ' | DoReDog';
      document.getElementById('pad-sync').click();       // a sensible groove default per piece
      paintRibbon(8);
      if (wasPlaying) togglePlay();
    });
  }

  build();
  paintMatrix();
  loadSong(qs.get('id') || DEFAULT);
})();
