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

  var OCT_HEX = { 3: '#35e08c', 4: '#ff5f64', 5: '#f6b73f' };
  var state = { i: 0, minor: false };

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

  // a two-octave strip showing which physical keys belong to the scale
  function paintKeys(pcs) {
    var wrap = el('cof-keys'); if (!wrap) return;
    var set = {}; pcs.forEach(function (p) { set[p] = 1; });
    var WHITE = [0, 2, 4, 5, 7, 9, 11], BLACK = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
    var html = '';
    for (var o = 0; o < 2; o++) {
      html += '<span class="cof-oct">';
      WHITE.forEach(function (pc) {
        html += '<span class="cof-k' + (set[pc] ? ' in' : '') + '">' + LET[pc] + '</span>';
      });
      Object.keys(BLACK).forEach(function (pcStr) {
        var pc = +pcStr;
        html += '<span class="cof-k cof-kb' + (set[pc] ? ' in' : '') + '" style="left:' + ((BLACK[pc] + 1) * 34 - 11) + 'px">' + LET[pc] + '</span>';
      });
      html += '</span>';
    }
    wrap.innerHTML = html;
  }

  function select(i, minor, sound) {
    state.i = i; state.minor = !!minor;
    paint();
    if (sound === false) return;
    var k = KEYS[state.i];
    var root = state.minor ? (k.pc + 9) % 12 : k.pc;
    var third = state.minor ? 3 : 4;
    play([tonicRoot(root), tonicRoot(root) + third, tonicRoot(root) + 7], 0);
  }

  function init() {
    var host = el('cof'); if (!host) return;
    host.innerHTML = ring();

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
