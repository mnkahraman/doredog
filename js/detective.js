/* ============================================================================
   DoReDog — Melody Detective.

   A short melody plays. You repeat it on the keyboard. Then you find out what
   it was and can go and learn it.

   The scoring compares the SEQUENCE of notes, not their timing: this is a
   "can you hear it and find it" game, not a rhythm test, and a beginner hunting
   for the next key should not be punished for taking three seconds over it.
   Octave is ignored too — playing the right shape an octave down is right.
   ========================================================================== */
(function () {
  'use strict';
  var DRD = window.DRD || {};
  var KEY = 'drd-detective';
  var NOTA_V = 90;                       // notation cache version, as in js/pages.js

  var LEN = [
    { id: 'short', n: 3, label: '3 notes' },
    { id: 'mid',   n: 5, label: '5 notes' },
    { id: 'long',  n: 8, label: '8 notes' }
  ];

  var st = { len: 3, want: [], got: [], song: null, live: [], done: false,
             streak: 0, best: 0, right: 0, asked: 0, pool: [] };

  function el(id) { return document.getElementById(id); }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      st.best = s.best || 0; st.right = s.right || 0; st.asked = s.asked || 0; } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ best: st.best, right: st.right, asked: st.asked })); } catch (e) {}
  }

  function stopAudio() {
    st.live.forEach(function (nodes) { (nodes || []).forEach(function (o) { try { o.stop(); } catch (e) {} }); });
    st.live = [];
  }
  function playMelody() {
    if (!DRD.Synth || !st.want.length) return;
    stopAudio();
    DRD.Synth.ensure();
    var t0 = DRD.Synth.ctx.currentTime + 0.08;
    st.want.forEach(function (m, i) {
      st.live.push(DRD.Synth.note(DRD.midiToFreq(m), t0 + i * 0.5, 0.9));
    });
  }

  /* --------------------------------------------------------- pick a melody */
  // the top sounding note of each column, which is what a listener hears as the tune
  function melodyOf(nota, want) {
    var cols = DRD.buildTimeline(DRD.parseNotation(nota)).cols;
    var out = [], last = null;
    for (var i = 0; i < cols.length && out.length < want; i++) {
      var top = -1;
      for (var k = 0; k < cols[i].events.length; k++) if (cols[i].events[k].midi > top) top = cols[i].events[k].midi;
      if (top < 0) continue;
      if (top === last) continue;                 // skip an immediately repeated note; it makes a dull puzzle
      out.push(top); last = top;
    }
    return out;
  }

  function loadNotation(id, cb) {
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    if (DRD.NOTATIONS[id]) return cb(DRD.NOTATIONS[id]);
    var sc = document.createElement('script');
    sc.src = 'songs/' + id + '.js?v=' + NOTA_V;
    sc.onload = sc.onerror = function () { cb((DRD.NOTATIONS || {})[id] || null); };
    document.head.appendChild(sc);
  }

  function ask() {
    st.done = false; st.got = [];
    el('det-result').hidden = true;
    el('det-next').hidden = true;
    el('det-slots').innerHTML = '';
    el('det-play').disabled = true;
    el('det-play').textContent = 'Loading…';

    var id = st.pool[Math.floor(Math.random() * st.pool.length)];
    loadNotation(id, function (nota) {
      if (!nota) { st.pool = st.pool.filter(function (x) { return x !== id; }); return ask(); }
      var mel = melodyOf(nota, st.len);
      if (mel.length < st.len) { st.pool = st.pool.filter(function (x) { return x !== id; }); return ask(); }
      st.song = (DRD.SONGS || []).filter(function (s) { return s.id === id; })[0] || { id: id, title: id };
      st.want = mel;
      el('det-play').disabled = false;
      el('det-play').textContent = '▶ Hear it';
      paintSlots();
      playMelody();
    });
  }

  function paintSlots() {
    el('det-slots').innerHTML = st.want.map(function (_, i) {
      var g = st.got[i];
      var cls = g == null ? '' : (g.ok ? ' ok' : ' no');
      return '<span class="det-slot' + cls + '">' + (g ? g.letter : (i + 1)) + '</span>';
    }).join('');
  }

  function press(midi) {
    if (st.done || !st.want.length) return;
    var i = st.got.length;
    if (i >= st.want.length) return;
    var ok = ((midi % 12) + 12) % 12 === ((st.want[i] % 12) + 12) % 12;   // octave-agnostic
    var LET = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
    st.got.push({ ok: ok, letter: LET[((midi % 12) + 12) % 12] });
    paintSlots();
    if (st.got.length === st.want.length) finish();
  }

  function finish() {
    st.done = true;
    var hits = st.got.filter(function (g) { return g.ok; }).length;
    var perfect = hits === st.want.length;
    st.asked++;
    if (perfect) { st.right++; st.streak++; if (st.streak > st.best) st.best = st.streak; }
    else st.streak = 0;
    save();

    var v = el('det-verdict');
    v.textContent = perfect ? 'All ' + hits + ' right.' : hits + ' of ' + st.want.length + ' right.';
    v.className = 'ear-verdict ' + (perfect ? 'ok' : 'no');
    el('det-answer').innerHTML = 'It was <a href="song?id=' + encodeURIComponent(st.song.id) + '"><strong>' +
      esc(st.song.title) + '</strong></a>' + (st.song.composer ? ' — ' + esc(st.song.composer) : '') + '.';
    el('det-result').hidden = false;
    el('det-next').hidden = false;
    paintScore();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function paintScore() {
    el('det-streak').textContent = st.streak;
    el('det-best').textContent = st.best;
    el('det-pct').textContent = st.asked ? Math.round(st.right / st.asked * 100) + '%' : '—';
    el('det-asked').textContent = st.asked;
  }

  function init() {
    if (!el('det-keys') || !DRD.buildPiano || !DRD.DAILY_POOL) return;
    load();
    st.pool = DRD.DAILY_POOL.slice();

    el('det-lens').innerHTML = LEN.map(function (l) {
      return '<button type="button" class="ear-pick" data-len="' + l.n + '">' + l.label + '</button>';
    }).join('');
    function paintLens() {
      Array.prototype.forEach.call(document.querySelectorAll('[data-len]'), function (b) {
        b.classList.toggle('on', +b.getAttribute('data-len') === st.len);
      });
    }
    el('det-lens').addEventListener('click', function (e) {
      var b = e.target.closest('[data-len]'); if (!b) return;
      st.len = +b.getAttribute('data-len'); st.streak = 0; paintLens(); paintScore(); ask();
    });

    DRD.buildPiano(el('det-keys'), [4, 5], function (freq, keyEl, oct, midi) {
      DRD.Synth.note(freq);
      press(midi);
    });
    if (DRD.fitPiano) DRD.fitPiano(el('det-keys'), [4, 5], el('det-stage'));

    el('det-play').addEventListener('click', playMelody);
    el('det-next').addEventListener('click', ask);
    el('det-skip').addEventListener('click', function () {
      if (st.done) return;
      while (st.got.length < st.want.length) st.got.push({ ok: false, letter: '·' });
      paintSlots(); finish();
    });
    el('det-reset').addEventListener('click', function () {
      st.streak = 0; st.best = 0; st.right = 0; st.asked = 0; save(); paintScore();
    });

    paintLens(); paintScore(); ask();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
