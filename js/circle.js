/* ============================================================================
   DoReDog — the circle of fifths, in letter notes.

   Every other interactive circle of fifths on the web shows you key signatures:
   a clef, and some sharps or flats stacked on a staff. That is exactly the thing
   this site exists to let people skip. So this one shows each key as the letters
   you actually press — which also makes a point no staff diagram can make, that
   in letter notes there are no flats at all. E♭ major and D♯ major are the same
   seven keys under your hands, and here they are spelled the same way.

   Uses the site's own synth, so every key is audible.
   ========================================================================== */
(function () {
  'use strict';
  var DRD = window.DRD || {};

  // pitch class -> DoReDog letter (lowercase = white key, UPPERCASE = sharp)
  var LET = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
  var MAJOR = [0, 2, 4, 5, 7, 9, 11];
  var MINOR = [0, 2, 3, 5, 7, 8, 10];

  // the twelve keys clockwise from C, with the accidental count a staff would use
  var KEYS = [
    { pc: 0,  major: 'C',  minor: 'A',  sig: '—' },
    { pc: 7,  major: 'G',  minor: 'E',  sig: '1♯' },
    { pc: 2,  major: 'D',  minor: 'B',  sig: '2♯' },
    { pc: 9,  major: 'A',  minor: 'F♯', sig: '3♯' },
    { pc: 4,  major: 'E',  minor: 'C♯', sig: '4♯' },
    { pc: 11, major: 'B',  minor: 'G♯', sig: '5♯' },
    { pc: 6,  major: 'F♯', minor: 'D♯', sig: '6♯' },
    { pc: 1,  major: 'D♭', minor: 'B♭', sig: '5♭' },
    { pc: 8,  major: 'A♭', minor: 'F',  sig: '4♭' },
    { pc: 3,  major: 'E♭', minor: 'C',  sig: '3♭' },
    { pc: 10, major: 'B♭', minor: 'G',  sig: '2♭' },
    { pc: 5,  major: 'F',  minor: 'D',  sig: '1♭' }
  ];

  /* ------------------------------------------------ chord progressions ----
     Pieces made of nothing but chords. Each is stored as scale degrees — semitones
     above the tonic plus a quality — rather than as fixed notes, so the same
     progression can be heard in any of the twelve keys you pick on the circle.
     That is the point of putting them here: you watch the harmony walk around
     the ring, and the ring is what explains why the walk sounds the way it does. */
  var MAJ = 'maj', MIN = 'min', DIM = 'dim';
  var QUAL = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6] };
  // Roman numerals are derived from degree AND quality — convention is uppercase for a
  // major chord, lowercase for a minor one. A fixed lookup got the minor-key tonic wrong,
  // printing "I" for the C minor chord that opens the Andalusian cadence.
  var DEG = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♭V', 'V', '♭VI', 'VI', '♭VII', 'VII'];
  function roman(semi, q) {
    var r = DEG[semi % 12] || '?';
    if (q === MAJ) return r;
    r = r.replace(/[IV]+/, function (m) { return m.toLowerCase(); });
    return q === DIM ? r + '°' : r;
  }

  var PROGS = [
    { id: 'axis', name: 'The four chords', sub: 'I – V – vi – IV', beat: 0.9,
      note: 'The progression behind an implausible number of pop songs. Comedy acts have built whole routines out of medleying them together.',
      steps: [[0, MAJ], [7, MAJ], [9, MIN], [5, MAJ]] },
    { id: 'doowop', name: 'The 50s progression', sub: 'I – vi – IV – V', beat: 0.9,
      note: 'Doo-wop, early rock and roll, and a thousand slow dances. Swap the middle two chords and you have the four chords above.',
      steps: [[0, MAJ], [9, MIN], [5, MAJ], [7, MAJ]] },
    { id: 'canon', name: 'The Pachelbel', sub: 'I – V – vi – iii – IV – I – IV – V', beat: 0.8,
      note: 'The ground bass of the Canon in D, looping for the whole piece. Once you have heard it you will hear it everywhere.',
      steps: [[0, MAJ], [7, MAJ], [9, MIN], [4, MIN], [5, MAJ], [0, MAJ], [5, MAJ], [7, MAJ]] },
    { id: 'twofive', name: 'Two – five – one', sub: 'ii – V – I', beat: 1.1,
      note: 'The sentence that jazz is written in. Three chords that make the arrival feel inevitable.',
      steps: [[2, MIN], [7, MAJ], [0, MAJ]] },
    { id: 'circle', name: 'Round the circle', sub: 'vi – ii – V – I', beat: 0.9,
      note: 'Each chord is a fifth below the last, so this walks anticlockwise around the ring above — the strongest pull in tonal music.',
      steps: [[9, MIN], [2, MIN], [7, MAJ], [0, MAJ]] },
    { id: 'blues', name: 'Twelve-bar blues', sub: 'I – IV – I – V – IV – I', beat: 1.0,
      note: 'The shortened shape of the form nearly all blues, and most early rock, is built on.',
      steps: [[0, MAJ], [0, MAJ], [5, MAJ], [0, MAJ], [7, MAJ], [5, MAJ], [0, MAJ]] },
    { id: 'andalusian', name: 'Andalusian cadence', sub: 'i – ♭VII – ♭VI – V', beat: 0.95,
      note: 'The flamenco descent. Minor at the top, major at the bottom, and a step down each time.',
      steps: [[0, MIN], [10, MAJ], [8, MAJ], [7, MAJ]], minorHome: true },
    { id: 'amen', name: 'The plagal cadence', sub: 'IV – I', beat: 1.3,
      note: 'The "Amen" at the end of a hymn. Two chords, and one of the oldest endings in Western music.',
      steps: [[5, MAJ], [0, MAJ]] },
    { id: 'lament', name: 'The lament bass', sub: 'i – ♭VII – ♭VI – V', beat: 1.15,
      note: 'The same descent as the Andalusian, taken slowly — the figure behind centuries of laments and ground basses.',
      steps: [[0, MIN], [10, MAJ], [8, MAJ], [7, MAJ]], minorHome: true }
  ];

  var OCT_HEX = { 3: '#35e08c', 4: '#ff5f64', 5: '#f6b73f' };
  var state = { i: 0, minor: false };
  var prog = { id: null, timer: null, step: 0, live: [] };

  function el(id) { return document.getElementById(id); }
  function scalePCs(root, minor) {
    var steps = minor ? MINOR : MAJOR, out = [];
    for (var i = 0; i < steps.length; i++) out.push((root + steps[i]) % 12);
    return out;
  }
  function letters(root, minor) {
    return scalePCs(root, minor).map(function (pc) { return LET[pc]; });
  }

  /* --------------------------------------------------------------- audio */
  function play(midis, spread) {
    if (!DRD.Synth) return;
    DRD.Synth.ensure();
    var t0 = DRD.Synth.ctx.currentTime + 0.06;
    midis.forEach(function (m, i) {
      DRD.Synth.note(DRD.midiToFreq(m), t0 + i * (spread || 0), 0.9);
    });
  }
  function tonicRoot(pc) { return 60 + pc; }        // middle-C octave

  /* ---------------------------------------------------------------- ring */
  function ring() {
    var R = 150, r = 96, cx = 190, cy = 190, s = [];
    s.push('<svg viewBox="0 0 380 380" class="cof-svg" role="img" aria-label="Circle of fifths">');
    s.push('<circle cx="190" cy="190" r="178" class="cof-bg"/>');
    KEYS.forEach(function (k, i) {
      var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      var x1 = cx + Math.cos(a) * R, y1 = cy + Math.sin(a) * R;
      var x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
      s.push('<g class="cof-seg" data-i="' + i + '" data-minor="0" tabindex="0" role="button" aria-label="' + k.major + ' major">' +
        '<circle cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) + '" r="30" class="cof-maj"/>' +
        '<text x="' + x1.toFixed(1) + '" y="' + (y1 + 6).toFixed(1) + '" class="cof-lab">' + k.major + '</text></g>');
      s.push('<g class="cof-seg" data-i="' + i + '" data-minor="1" tabindex="0" role="button" aria-label="' + k.minor + ' minor">' +
        '<circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="23" class="cof-min"/>' +
        '<text x="' + x2.toFixed(1) + '" y="' + (y2 + 5).toFixed(1) + '" class="cof-lab cof-lab-sm">' + k.minor + 'm</text></g>');
    });
    s.push('</svg>');
    return s.join('');
  }

  /* -------------------------------------------------------------- render */
  function paint() {
    var k = KEYS[state.i];
    var root = state.minor ? (k.pc + 9) % 12 : k.pc;         // relative minor is a minor third below
    var name = (state.minor ? k.minor + ' minor' : k.major + ' major');
    var ls = letters(root, state.minor);

    el('cof-name').textContent = name;
    el('cof-sig').textContent = k.sig === '—' ? 'no sharps or flats' : k.sig + ' in standard notation';

    el('cof-letters').innerHTML = ls.map(function (l) {
      var black = /[A-G]/.test(l);
      return '<span class="cof-note' + (black ? ' is-sharp' : '') + '">' + l + '</span>';
    }).join('') + '<span class="cof-note cof-note-oct">' + ls[0] + '</span>';

    el('cof-rel').innerHTML = state.minor
      ? 'Relative major: <button type="button" class="cof-link" data-go="maj">' + k.major + ' major</button>'
      : 'Relative minor: <button type="button" class="cof-link" data-go="min">' + k.minor + ' minor</button>';

    // neighbours on the circle share six of seven notes — the reason the circle exists
    var prev = KEYS[(state.i + 11) % 12], next = KEYS[(state.i + 1) % 12];
    el('cof-neighbours').innerHTML =
      '<button type="button" class="cof-link" data-jump="' + ((state.i + 11) % 12) + '">← ' + prev.major + '</button>' +
      '<span class="cof-nb-note">one step round the circle changes exactly one note</span>' +
      '<button type="button" class="cof-link" data-jump="' + ((state.i + 1) % 12) + '">' + next.major + ' →</button>';

    Array.prototype.forEach.call(document.querySelectorAll('.cof-seg'), function (g) {
      var on = +g.getAttribute('data-i') === state.i && (+g.getAttribute('data-minor') === (state.minor ? 1 : 0));
      g.classList.toggle('on', on);
      g.classList.toggle('dim', +g.getAttribute('data-i') !== state.i);
    });
    paintKeys(scalePCs(root, state.minor));
  }

  // a two-octave strip showing which physical keys belong to the scale;
  // during a progression the sounding chord is highlighted on top of it
  function paintKeys(pcs, chord) {
    var wrap = el('cof-keys'); if (!wrap) return;
    var set = {}; pcs.forEach(function (p) { set[p] = 1; });
    var hot = {}; (chord || []).forEach(function (p) { hot[p % 12] = 1; });
    var WHITE = [0, 2, 4, 5, 7, 9, 11], BLACK = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
    var html = '';
    for (var o = 0; o < 2; o++) {
      html += '<span class="cof-oct">';
      WHITE.forEach(function (pc) {
        html += '<span class="cof-k' + (set[pc] ? ' in' : '') + (hot[pc] ? ' hot' : '') + '">' + LET[pc] + '</span>';
      });
      Object.keys(BLACK).forEach(function (pcStr) {
        var pc = +pcStr;
        html += '<span class="cof-k cof-kb' + (set[pc] ? ' in' : '') + (hot[pc] ? ' hot' : '') +
          '" style="left:' + ((BLACK[pc] + 1) * 34 - 11) + 'px">' + LET[pc] + '</span>';
      });
      html += '</span>';
    }
    wrap.innerHTML = html;
  }

  function select(i, minor, sound) {
    var playing = prog.id;
    state.i = i; state.minor = !!minor;
    if (playing) {                                   // changing key mid-progression re-hears it in the new key
      stopProg(true); paint(); prog.id = playing;
      var p = PROGS.filter(function (x) { return x.id === playing; })[0];
      Array.prototype.forEach.call(document.querySelectorAll('.cof-chip'), function (b) {
        b.classList.toggle('playing', b.getAttribute('data-prog') === playing);
      });
      var sb = el('cof-prog-stop'); if (sb) sb.hidden = false;
      return stepChord(p, 0);
    }
    paint();
    if (sound === false) return;
    var k = KEYS[state.i];
    var root = state.minor ? (k.pc + 9) % 12 : k.pc;
    var third = state.minor ? 3 : 4;
    play([tonicRoot(root), tonicRoot(root) + third, tonicRoot(root) + 7], 0);
  }

  /* --------------------------------------------------- progression playback */
  function homePC() {
    var k = KEYS[state.i];
    return state.minor ? (k.pc + 9) % 12 : k.pc;
  }
  /* Where a chord sits on the ring. The outer ring is keyed by the major tonic, but the
     INNER ring holds each major key's *relative* minor — so A minor lives on C major's
     segment, not on A major's. Looking a minor chord up by its own pitch class lit the
     wrong segment (A minor showed as F♯ minor). Match on the ring each quality uses. */
  function ringIndex(pc, quality) {
    for (var i = 0; i < KEYS.length; i++) {
      var got = quality === MAJ ? KEYS[i].pc : (KEYS[i].pc + 9) % 12;
      if (got === pc) return i;
    }
    return -1;
  }
  function stopProg(keepUI) {
    if (prog.timer) { clearTimeout(prog.timer); prog.timer = null; }
    prog.live.forEach(function (nodes) { (nodes || []).forEach(function (o) { try { o.stop(); } catch (e) {} }); });
    prog.live = [];
    prog.id = null; prog.step = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.cof-seg'), function (g) { g.classList.remove('sound'); });
    Array.prototype.forEach.call(document.querySelectorAll('.cof-chip'), function (b) { b.classList.remove('playing'); });
    if (!keepUI) { paint(); }
    var b = el('cof-prog-stop'); if (b) b.hidden = true;
  }

  function stepChord(p, n) {
    if (prog.id !== p.id) return;
    if (n >= p.steps.length) { stopProg(); return; }
    prog.step = n;
    var st = p.steps[n];
    var root = (homePC() + st[0]) % 12;
    var pcs = QUAL[st[1]].map(function (iv) { return (root + iv) % 12; });

    // sound it — root position around middle C, bass an octave down
    if (DRD.Synth) {
      DRD.Synth.ensure();
      var t = DRD.Synth.ctx.currentTime + 0.04;
      prog.live.push(DRD.Synth.note(DRD.midiToFreq(48 + root), t, 0.75));
      QUAL[st[1]].forEach(function (iv) {
        prog.live.push(DRD.Synth.note(DRD.midiToFreq(60 + root + iv), t, 0.85));
      });
    }

    // light the ring: the chord's root, on the major or minor ring to match its quality
    var ri = ringIndex(root, st[1]);
    Array.prototype.forEach.call(document.querySelectorAll('.cof-seg'), function (g) {
      var hit = ri >= 0 && +g.getAttribute('data-i') === ri &&
        (+g.getAttribute('data-minor') === (st[1] === MAJ ? 0 : 1));
      g.classList.toggle('sound', hit);
    });
    // light the keyboard
    paintKeys(scalePCs(homePC(), state.minor), pcs);

    // name it
    var out = el('cof-prog-now');
    if (out) out.innerHTML = '<b>' + roman(st[0], st[1]) + '</b> ' +
      '<span>' + pcs.map(function (pc) { return LET[pc]; }).join(' ') + '</span>';
    Array.prototype.forEach.call(document.querySelectorAll('.cof-step'), function (s, i) {
      s.classList.toggle('on', i === n);
    });

    prog.timer = setTimeout(function () { stepChord(p, n + 1); }, p.beat * 1000);
  }

  function playProg(id) {
    var p = PROGS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var was = prog.id;
    stopProg(true);
    if (was === id) { paint(); return; }               // second press stops, never stacks
    prog.id = id;

    // a minor-home progression only makes sense from a minor tonic
    if (p.minorHome && !state.minor) { state.minor = true; }

    el('cof-prog-name').textContent = p.name;
    el('cof-prog-sub').textContent = p.sub;
    el('cof-prog-note').textContent = p.note;
    el('cof-prog-steps').innerHTML = p.steps.map(function (s) {
      return '<span class="cof-step">' + roman(s[0], s[1]) + '</span>';
    }).join('');
    el('cof-prog-panel').hidden = false;
    var stopBtn = el('cof-prog-stop'); if (stopBtn) stopBtn.hidden = false;
    Array.prototype.forEach.call(document.querySelectorAll('.cof-chip'), function (b) {
      b.classList.toggle('playing', b.getAttribute('data-prog') === id);
    });
    stepChord(p, 0);
  }

  function init() {
    var host = el('cof'); if (!host) return;
    host.innerHTML = ring();

    var lib = el('cof-lib');
    if (lib) {
      lib.innerHTML = PROGS.map(function (p) {
        return '<button type="button" class="cof-chip" data-prog="' + p.id + '">' +
          '<b>' + p.name + '</b><i>' + p.sub + '</i></button>';
      }).join('');
      lib.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.cof-chip');
        if (b) playProg(b.getAttribute('data-prog'));
      });
    }
    var stopBtn = el('cof-prog-stop');
    if (stopBtn) stopBtn.addEventListener('click', function () { stopProg(); });

    host.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('.cof-seg');
      if (!g) return;
      select(+g.getAttribute('data-i'), +g.getAttribute('data-minor') === 1);
    });
    host.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var g = e.target.closest && e.target.closest('.cof-seg');
      if (!g) return;
      e.preventDefault();
      select(+g.getAttribute('data-i'), +g.getAttribute('data-minor') === 1);
    });

    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.cof-link');
      if (!b) return;
      if (b.hasAttribute('data-jump')) return select(+b.getAttribute('data-jump'), false);
      select(state.i, b.getAttribute('data-go') === 'min');
    });

    var scaleBtn = el('cof-play-scale');
    if (scaleBtn) scaleBtn.addEventListener('click', function () {
      var k = KEYS[state.i], root = state.minor ? (k.pc + 9) % 12 : k.pc;
      var steps = state.minor ? MINOR : MAJOR;
      var midis = steps.map(function (s) { return tonicRoot(root) + s; });
      midis.push(tonicRoot(root) + 12);
      play(midis, 0.26);
    });

    select(0, false, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
