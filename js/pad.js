/* ============================================================================
   Music Pad — a groovebox that READS the score.

   Every web pad plays canned loops in a fixed key. This one loads a real piece
   from the library, detects its pulse and key FROM THE NOTATION (no audio
   guesswork), and offers sixteen pads whose patterns follow the piece's own
   bass line and harmony. Everything is quantized to the next bar, so nothing
   can land out of time, and the tempo slider rescales the schedule live —
   we schedule notes, we never stretch audio, so there are no artifacts.

   Analysis, all from the score:
     · pulse   — the timeline grid is eighth notes; 8 cols = 1 bar, bpm = cps·30
     · key     — pitch-class histogram correlated against the Krumhansl-Kessler
                 major/minor profiles, best of 24 rotations
     · bass    — per bar, the weightiest pitch class among the lowest voice
     · harmony — per bar, the three weightiest pitch classes

   Pad rows (one active slot per row, groovebox-style):
     DRUMS   four grooves on the synth kit
     BASS    four figures pitched from the analysed bass line
     TEXTURE chords / arp / shimmer / drone from the bar's own harmony
     PERFORM momentary: stutter · tape-stop · riser · break
   ========================================================================== */
(function () {
  'use strict';
  var root = document.getElementById('pad-root');
  if (!root) return;

  /* ------------------------------ helpers ------------------------------- */
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

  /* ------------------------------ analysis ------------------------------ */
  // Krumhansl–Kessler key profiles (standard published values)
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
    return best;
  }

  // per bar (8 cols): bass root pc + the three weightiest pitch classes
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

  /* ------------------------------ pad slots ------------------------------ */
  var ROWS = [
    { id: 'drums', label: 'Drums', color: '#ff5f64', slots: ['Four floor', 'Backbeat', 'Shaker', 'Half-time'] },
    { id: 'bass', label: 'Bass', color: '#8b6bff', slots: ['Root pulse', 'Octave pump', 'Fifth walk', 'Bass arp'] },
    { id: 'texture', label: 'Texture', color: '#35e08c', slots: ['Pad chords', 'Arpeggio', 'Shimmer', 'Drone'] },
    { id: 'perform', label: 'Perform', color: '#f6b73f', momentary: true, slots: ['Stutter', 'Tape stop', 'Riser', 'Break'] }
  ];

  // drum grooves: hits per col-in-bar 0..7 (cols are eighth notes, beats on 0/2/4/6)
  var DRUM_PATTERNS = [
    { kick: [0, 2, 4, 6], snare: [], hat: [1, 3, 5, 7], clave: [] },
    { kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], clave: [] },
    { kick: [0, 4], snare: [], hat: [0, 1, 2, 3, 4, 5, 6, 7], clave: [3, 7] },
    { kick: [0], snare: [4], hat: [0, 2, 4, 6], clave: [] }
  ];

  /* ------------------------------ state ---------------------------------- */
  var qs = new URLSearchParams(location.search);
  var DEFAULT = 'gymnopedie-no-1';
  var song = null, cols = [], bars = [], key = null;
  var baseColDur = 0.25, tempoMul = 1, swing = 0, tapeStop = 0;
  /* A slow piece's columns can be 0.6s apart — a drum bar stretched over five
     seconds is not a groove. `sub` subdivides the groove grid under the score
     grid (2× or 4×), so the layers swing at dance tempo while the piece keeps
     its own pace. Piece columns fire only on whole subdivisions. */
  var sub = 1, gIdx = 0, gTotal = 8;
  var playing = false, colIdx = 0, nextTime = 0, timer = null;
  var active = { drums: -1, bass: -1, texture: -1 };      // armed slot per row
  var queued = { drums: null, bass: null, texture: null }; // waiting for the bar line
  var pieceOn = true, breakUntil = -1, live = [];
  var els = {};

  function bpm() {
    var b = (song && song.cps ? song.cps : 4) * 30 * tempoMul;
    while (b < 60) b *= 2;                 // display at a musical pulse level
    while (b > 200) b /= 2;
    return Math.round(b);
  }
  function colDur() { return (baseColDur / tempoMul) * (tapeStop > 0 ? 1 + tapeStop * 6 : 1); }
  function barOf(c) { return Math.floor(c / 8) % bars.length; }

  function bassMidi(pc) { return 36 + ((pc - 0 + 12) % 12); }          // octave 2
  function chordMidis(bar) {
    return bar.pcs.map(function (pc) { return 48 + ((pc + 12) % 12); })
      .sort(function (a, b) { return a - b; });
  }

  /* ------------------------------ audio ---------------------------------- */
  function note(midi, when, vel) { DRD.Synth.ensure(); return DRD.Synth.note(DRD.midiToFreq(midi), when, vel); }
  function drum(kind, when, vel) {
    var ctx = DRD.Synth.ctx, t = when, v = vel == null ? 1 : vel;
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
      var s = ctx.createBufferSource(); s.buffer = drum._noise;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
      s.connect(f); f.connect(g);
      g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      s.start(t); s.stop(t + 0.2);
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
    g.gain.exponentialRampToValueAtTime(0.4, when + dur);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur + 0.15);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(when); s.stop(when + dur + 0.2);
  }

  /* ------------------------------ scheduler ------------------------------ */
  function scheduleStep(g, t) {
    var c = Math.floor(g / sub);                       // score column
    var onCol = g % sub === 0;                         // whole subdivision → piece fires
    var inG = g % 8;                                   // position in the GROOVE bar
    var bar = bars[barOf(c)];
    // the piece itself (the Break pad flips pieceOn off until the next bar line)
    if (pieceOn && onCol) {
      cols[c % cols.length].events.forEach(function (ev) {
        live.push(note(ev.midi, t, 0.72));
        // shimmer texture: the melody echoed an octave up, half a step later
        if (active.texture === 2 && ev.midi >= 60) note(ev.midi + 12, t + colDur() / 2, 0.18);
      });
    }
    // drums — on the groove grid, so slow pieces still dance
    if (active.drums >= 0) {
      var p = DRUM_PATTERNS[active.drums];
      ['kick', 'snare', 'hat', 'clave'].forEach(function (k) {
        if (p[k].indexOf(inG) >= 0) drum(k, t, k === 'hat' && inG % 2 ? 0.6 : 1);
      });
    }
    // bass — groove rhythm, pitched from THIS score bar's analysed root
    if (active.bass >= 0) {
      var r = bassMidi(bar.bass);
      var fig = [
        [[0, r], [2, r], [4, r], [6, r]],
        [[0, r], [1, r + 12], [2, r], [3, r + 12], [4, r], [5, r + 12], [6, r], [7, r + 12]],
        [[0, r], [2, r + 7], [4, r + 12], [6, r + 7]],
        [[0, r], [1, r + 7], [2, r + 12], [3, r + 7], [4, r], [5, r + 7], [6, r + 12], [7, r + 7]]
      ][active.bass];
      fig.forEach(function (hit) { if (hit[0] === inG) note(hit[1], t, 0.55); });
    }
    // texture — chords/drone once per SCORE bar, arp on the groove grid
    if (active.texture === 0 && g % (8 * sub) === 0) chordMidis(bar).forEach(function (m) { note(m + 12, t, 0.3); });
    if (active.texture === 1) { var cm = chordMidis(bar); note(cm[g % cm.length] + 24, t, 0.28); }
    if (active.texture === 3 && g % (8 * sub) === 0) { note(bassMidi(key.root), t, 0.34); note(bassMidi(key.root) + 7, t, 0.2); }
    // beat LED + ribbon sync
    var delay = Math.max(0, (t - DRD.Synth.ctx.currentTime) * 1000);
    setTimeout(function () { if (playing) paintBeat(g, c); }, delay);
  }

  function tick() {
    var ctx = DRD.Synth.ctx, horizon = ctx.currentTime + 0.14;
    while (nextTime < horizon) {
      scheduleStep(gIdx, nextTime);
      var d = colDur() / sub;
      if (swing > 0 && gIdx % 2 === 0) d *= 1 + swing / 100;
      else if (swing > 0) d *= 1 - swing / 100;
      nextTime += d;
      gIdx = (gIdx + 1) % gTotal;
      colIdx = Math.floor(gIdx / sub);
      if (gIdx % (8 * sub) === 0) barLine();
      if (tapeStop > 0) { tapeStop -= 0.12 / sub; if (tapeStop <= 0) tapeStop = 0; }
    }
  }

  function barLine() {
    // queued slots arm exactly on the bar — the groovebox promise
    ['drums', 'bass', 'texture'].forEach(function (row) {
      if (queued[row] !== null) {
        active[row] = queued[row] === active[row] ? -1 : queued[row];
        queued[row] = null;
        paintPads();
      }
    });
    if (breakUntil >= 0) { pieceOn = true; breakUntil = -1; }   // break lasts to the bar line
  }

  /* ------------------------------ UI ------------------------------------- */
  function build() {
    root.innerHTML =
      '<div class="arc-head">' +
        '<a class="arc-back" href="games.html">← All games &amp; tools</a>' +
        '<h1 class="arc-title"><span class="arc-ico">🎛️</span> Music Pad</h1>' +
        '<p class="arc-desc">A groovebox that reads the score. Pick a piece — the pad learns its pulse, key and bass line, and every layer you launch follows the music. Nothing can land out of time.</p>' +
      '</div>' +
      '<div class="pad-deck">' +
        '<div class="pad-transport">' +
          '<button class="pad-play" id="pad-play" type="button">▶</button>' +
          '<div class="pad-bpm"><b id="pad-bpm">—</b><span>BPM</span></div>' +
          '<div class="pad-fader"><label>Tempo <i id="pad-tempo-lab">100%</i></label>' +
            '<input type="range" id="pad-tempo" min="50" max="200" value="100"></div>' +
          '<div class="pad-fader"><label>Swing <i id="pad-swing-lab">0%</i></label>' +
            '<input type="range" id="pad-swing" min="0" max="40" value="0"></div>' +
          '<div class="pad-key" id="pad-key" title="Detected from the notes">—</div>' +
          '<div class="pad-beats" id="pad-beats"><i></i><i></i><i></i><i></i></div>' +
        '</div>' +
        '<div class="pad-source">' +
          '<input type="search" id="pad-search" placeholder="Search the 2,433 pieces…" autocomplete="off">' +
          '<div class="pad-suggest" id="pad-suggest" hidden></div>' +
          '<span class="pad-nowplaying" id="pad-now">—</span>' +
        '</div>' +
        '<canvas class="pad-ribbon" id="pad-ribbon" height="56"></canvas>' +
        '<div class="pad-grid" id="pad-grid"></div>' +
      '</div>';

    els.play = document.getElementById('pad-play');
    els.bpm = document.getElementById('pad-bpm');
    els.key = document.getElementById('pad-key');
    els.now = document.getElementById('pad-now');
    els.beats = document.getElementById('pad-beats').children;
    els.ribbon = document.getElementById('pad-ribbon');
    els.grid = document.getElementById('pad-grid');

    ROWS.forEach(function (row, ri) {
      var lab = el('span', 'pad-row-label', row.label);
      lab.style.color = row.color;
      els.grid.appendChild(lab);
      row.slots.forEach(function (name, si) {
        var b = el('button', 'pad-pad', '<b>' + name + '</b>');
        b.type = 'button';
        b.style.setProperty('--row', row.color);
        b.dataset.row = row.id; b.dataset.slot = si;
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(row, si, b); });
        els.grid.appendChild(b);
      });
    });

    document.getElementById('pad-tempo').addEventListener('input', function () {
      tempoMul = +this.value / 100;
      document.getElementById('pad-tempo-lab').textContent = this.value + '%';
      els.bpm.textContent = bpm();
    });
    document.getElementById('pad-swing').addEventListener('input', function () {
      swing = +this.value;
      document.getElementById('pad-swing-lab').textContent = swing + '%';
    });
    els.play.addEventListener('click', togglePlay);

    // piece search
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

  function press(row, si, btn) {
    DRD.Synth.ensure();
    if (row.momentary) return perform(si, btn);
    if (!playing) {                                     // stopped: arm instantly
      active[row.id] = active[row.id] === si ? -1 : si;
      paintPads();
      return;
    }
    queued[row.id] = si;                                // playing: wait for the bar
    paintPads();
  }

  function perform(si, btn) {
    btn.classList.add('held');
    setTimeout(function () { btn.classList.remove('held'); }, 350);
    if (!playing) return;
    var t = DRD.Synth.ctx.currentTime + 0.02;
    if (si === 0) {                                     // stutter: current column ×4 at double speed
      var q = colDur() / (2 * sub);
      for (var i = 0; i < 4; i++) {
        cols[colIdx % cols.length].events.forEach(function (ev) { note(ev.midi, t + i * q, 0.5); });
      }
    } else if (si === 1) { tapeStop = 1; }              // tape stop: scheduler drags, then recovers
    else if (si === 2) { riser(t, Math.max(0.4, (8 * sub - gIdx % (8 * sub)) * colDur() / sub)); }
    else if (si === 3) { pieceOn = false; breakUntil = 1; } // break till the next bar line
    if (window.DRD && DRD.padDore) DRD.padDore(si);
  }

  function paintPads() {
    [].forEach.call(els.grid.querySelectorAll('.pad-pad'), function (b) {
      var row = b.dataset.row, si = +b.dataset.slot;
      b.classList.toggle('armed', active[row] === si);
      b.classList.toggle('queued', queued[row] === si);
    });
  }

  function paintBeat(g, c) {
    var beat = Math.floor((g % (8 * sub)) / (2 * sub));
    for (var i = 0; i < 4; i++) els.beats[i].classList.toggle('on', i === beat);
    paintRibbon(c);
  }

  function paintRibbon(c) {
    var cv = els.ribbon, g = cv.getContext('2d');
    var w = cv.width = cv.clientWidth, h = cv.height;
    g.clearRect(0, 0, w, h);
    var span = 48, colW = w / span;                     // six bars visible
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
      els.play.textContent = '▶';
      els.play.classList.remove('on');
      return;
    }
    if (!cols.length) return;
    playing = true;
    els.play.textContent = '❚❚';
    els.play.classList.add('on');
    colIdx = 0; gIdx = 0; tapeStop = 0; pieceOn = true; breakUntil = -1;
    nextTime = DRD.Synth.ctx.currentTime + 0.1;
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
      baseColDur = 1 / Math.max(1, Math.min(12, s.cps || 4));
      sub = baseColDur > 0.6 ? 4 : baseColDur > 0.34 ? 2 : 1;
      gTotal = Math.ceil(cols.length / 8) * 8 * sub;
      els.bpm.textContent = bpm();
      els.key.textContent = key.name;
      els.now.textContent = s.title + ' — ' + s.composer + ' · ' + Math.ceil(cols.length / 8) + ' bars';
      document.title = 'Music Pad — ' + s.title + ' | DoReDog';
      paintRibbon(8);
      if (wasPlaying) togglePlay();
    });
  }

  build();
  loadSong(qs.get('id') || DEFAULT);
  window.addEventListener('keydown', function (e) {
    if (e.key === ' ' && e.target.tagName !== 'INPUT') { e.preventDefault(); togglePlay(); }
  });
})();
