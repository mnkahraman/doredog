/* ============================================================================
   DoReDog — the chord finder, in letter notes.

   Pick a root and a chord type, see the letters you press and hear it. Same
   principle as the circle of fifths page: chord charts everywhere else are
   drawn on a staff, which is the notation this site exists to let people skip.

   Inversions matter here in a way they do not on a staff diagram. A chart shows
   you a stack of thirds; a keyboard shows you that the same three notes have
   three different shapes under your hand, and that one of them is usually far
   easier to reach than the one the chart drew.
   ========================================================================== */
(function () {
  'use strict';
  var DRD = window.DRD || {};

  var LET = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
  var NAME = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  // intervals in semitones from the root
  var TYPES = [
    { id: 'maj',   label: 'Major',            suffix: '',      iv: [0, 4, 7],        note: 'The bright one. Three notes, and the sound most people mean by "a chord".' },
    { id: 'min',   label: 'Minor',            suffix: 'm',     iv: [0, 3, 7],        note: 'One note lower than major — the middle finger moves down a semitone. That single key is the whole difference between happy and sad.' },
    { id: 'dim',   label: 'Diminished',       suffix: 'dim',   iv: [0, 3, 6],        note: 'Both upper notes squeezed down. Unstable on purpose; it wants to resolve somewhere.' },
    { id: 'aug',   label: 'Augmented',        suffix: 'aug',   iv: [0, 4, 8],        note: 'Both upper notes stretched up. Symmetrical, so it has no obvious home — which is why it sounds suspended in air.' },
    { id: 'sus4',  label: 'Suspended 4th',    suffix: 'sus4',  iv: [0, 5, 7],        note: 'The third replaced by the fourth. Neither major nor minor, and traditionally it falls back to the third.' },
    { id: 'sus2',  label: 'Suspended 2nd',    suffix: 'sus2',  iv: [0, 2, 7],        note: 'The third replaced by the second. Open and modern-sounding; very common in folk and pop.' },
    { id: '7',     label: 'Dominant 7th',     suffix: '7',     iv: [0, 4, 7, 10],    note: 'Major with a flattened seventh on top. The engine of blues, and the chord that pulls hardest toward home.' },
    { id: 'maj7',  label: 'Major 7th',        suffix: 'maj7',  iv: [0, 4, 7, 11],    note: 'Major with the seventh a semitone higher. Soft, hazy, unmistakably the sound of a jazz ballad.' },
    { id: 'm7',    label: 'Minor 7th',        suffix: 'm7',    iv: [0, 3, 7, 10],    note: 'Minor with a flat seventh. Warmer and less final than a plain minor triad.' },
    { id: 'm7b5',  label: 'Half-diminished',  suffix: 'm7♭5',  iv: [0, 3, 6, 10],    note: 'The chord that opens a minor two-five-one. Tense, but not as brittle as a full diminished.' },
    { id: 'dim7',  label: 'Diminished 7th',   suffix: 'dim7',  iv: [0, 3, 6, 9],     note: 'Four notes, each a minor third apart. Perfectly symmetrical, so it can resolve almost anywhere — a favourite hinge in Romantic music.' },
    { id: '6',     label: 'Major 6th',        suffix: '6',     iv: [0, 4, 7, 9],     note: 'A major triad with the sixth added. Gentle and settled; the sound of a 1930s final chord.' },
    { id: 'm6',    label: 'Minor 6th',        suffix: 'm6',    iv: [0, 3, 7, 9],     note: 'Minor triad plus a major sixth. Slightly uneasy, and a staple of tango and film noir.' },
    { id: '9',     label: 'Dominant 9th',     suffix: '9',     iv: [0, 4, 7, 10, 14], note: 'A dominant seventh with the ninth stacked on top. Five notes — you will usually drop the fifth.' },
    { id: 'add9',  label: 'Added 9th',        suffix: 'add9',  iv: [0, 4, 7, 14],    note: 'A major triad with the ninth added but no seventh. Bright and open, and easier to hold than a full ninth.' }
  ];

  var INV = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

  var st = { root: 0, type: 'maj', inv: 0 };

  function el(id) { return document.getElementById(id); }
  function type() { return TYPES.filter(function (t) { return t.id === st.type; })[0] || TYPES[0]; }
  function chordName() { return NAME[st.root] + type().suffix; }

  // MIDI notes for the current chord, rotated by the inversion
  function midis() {
    var iv = type().iv.slice();
    var n = iv.map(function (i) { return 60 + st.root + i; });
    var k = st.inv % n.length;
    for (var i = 0; i < k; i++) n.push(n.shift() + 12);
    return n;
  }

  /* Clicking through the pickers fires a chord per click, and without stopping the
     previous one they pile up on the master bus — a run through the type list measured
     a peak of 2.3, i.e. hard clipping. Stop the last chord first, and scale the velocity
     down as the chord gets bigger so a five-note ninth is not four times a triad. */
  var live = [];
  function playChord(spread) {
    if (!DRD.Synth) return;
    live.forEach(function (nodes) { (nodes || []).forEach(function (o) { try { o.stop(); } catch (e) {} }); });
    live = [];
    DRD.Synth.ensure();
    var ms = midis(), vel = Math.min(0.85, 1.7 / ms.length);
    var t0 = DRD.Synth.ctx.currentTime + 0.05;
    ms.forEach(function (m, i) {
      live.push(DRD.Synth.note(DRD.midiToFreq(m), t0 + i * (spread || 0), vel));
    });
  }

  /* --------------------------------------------------------------- render */
  function keyboard(pcs, bass) {
    var WHITE = [0, 2, 4, 5, 7, 9, 11], BLACK = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
    var set = {}; pcs.forEach(function (p) { set[p % 12] = 1; });
    var html = '';
    for (var o = 0; o < 2; o++) {
      html += '<span class="cof-oct">';
      WHITE.forEach(function (pc) {
        var on = set[pc], low = bass != null && pc === bass % 12;
        html += '<span class="cof-k' + (on ? ' in' : '') + (on && low ? ' bass' : '') + '">' + LET[pc] + '</span>';
      });
      Object.keys(BLACK).forEach(function (pcStr) {
        var pc = +pcStr, on = set[pc], low = bass != null && pc === bass % 12;
        html += '<span class="cof-k cof-kb' + (on ? ' in' : '') + (on && low ? ' bass' : '') +
          '" style="left:' + ((BLACK[pc] + 1) * 34 - 11) + 'px">' + LET[pc] + '</span>';
      });
      html += '</span>';
    }
    return html;
  }

  function paint() {
    var t = type(), ms = midis();
    el('ch-name').textContent = chordName();
    el('ch-type').textContent = t.label + ' · ' + INV[st.inv % t.iv.length];
    el('ch-note').textContent = t.note;

    el('ch-letters').innerHTML = ms.map(function (m) {
      var l = LET[m % 12], black = /[A-G]/.test(l);
      return '<span class="cof-note' + (black ? ' is-sharp' : '') + '">' + l + '</span>';
    }).join('');

    el('ch-keys').innerHTML = keyboard(ms.map(function (m) { return m % 12; }), ms[0] % 12);

    // inversion buttons only for as many notes as the chord actually has
    el('ch-inv').innerHTML = t.iv.map(function (_, i) {
      return '<button type="button" class="ch-inv-btn' + (i === st.inv % t.iv.length ? ' on' : '') +
        '" data-inv="' + i + '">' + (i === 0 ? 'Root' : i + (i === 1 ? 'st' : i === 2 ? 'nd' : 'rd')) + '</button>';
    }).join('');

    Array.prototype.forEach.call(document.querySelectorAll('.ch-root'), function (b) {
      b.classList.toggle('on', +b.getAttribute('data-root') === st.root);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ch-type'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-type') === st.type);
    });
  }

  function init() {
    var roots = el('ch-roots'); if (!roots) return;
    roots.innerHTML = NAME.map(function (n, pc) {
      return '<button type="button" class="ch-root' + (/♯/.test(n) ? ' sharp' : '') + '" data-root="' + pc + '">' + n + '</button>';
    }).join('');
    el('ch-types').innerHTML = TYPES.map(function (t) {
      return '<button type="button" class="ch-type" data-type="' + t.id + '">' + t.label + '</button>';
    }).join('');

    roots.addEventListener('click', function (e) {
      var b = e.target.closest('.ch-root'); if (!b) return;
      st.root = +b.getAttribute('data-root'); paint(); playChord(0);
    });
    el('ch-types').addEventListener('click', function (e) {
      var b = e.target.closest('.ch-type'); if (!b) return;
      st.type = b.getAttribute('data-type'); st.inv = 0; paint(); playChord(0);
    });
    el('ch-inv').addEventListener('click', function (e) {
      var b = e.target.closest('.ch-inv-btn'); if (!b) return;
      st.inv = +b.getAttribute('data-inv'); paint(); playChord(0);
    });
    el('ch-play').addEventListener('click', function () { playChord(0); });
    el('ch-arp').addEventListener('click', function () { playChord(0.22); });

    paint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
