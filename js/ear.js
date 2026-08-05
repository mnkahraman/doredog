/* ============================================================================
   DoReDog — interval ear training.

   Two notes, one question: how far apart are they? This is the skill that turns
   letter notes from instructions into music — once you can hear that a jump is a
   fifth, you can work a tune out instead of looking it up.

   Three tiers so the first session is winnable, three directions (up, down,
   together), and the answer is always revealed in letter notes so the ear and
   the format reinforce each other. Score lives in this browser, as everywhere
   else on the site.
   ========================================================================== */
(function () {
  'use strict';
  var DRD = window.DRD || {};
  var KEY = 'drd-ear';

  var LET = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
  var IVS = [
    { n: 0,  name: 'Unison' },        { n: 1,  name: 'Minor 2nd' },
    { n: 2,  name: 'Major 2nd' },     { n: 3,  name: 'Minor 3rd' },
    { n: 4,  name: 'Major 3rd' },     { n: 5,  name: 'Perfect 4th' },
    { n: 6,  name: 'Tritone' },       { n: 7,  name: 'Perfect 5th' },
    { n: 8,  name: 'Minor 6th' },     { n: 9,  name: 'Major 6th' },
    { n: 10, name: 'Minor 7th' },     { n: 11, name: 'Major 7th' },
    { n: 12, name: 'Octave' }
  ];

  // The classic teaching order: the two most stable intervals first, then the
  // ones that define major and minor, then everything.
  var TIERS = [
    { id: 'start',  label: 'Starting out', set: [4, 7, 12],
      note: 'A major third, a perfect fifth and an octave — the three intervals that hold a chord together.' },
    { id: 'core',   label: 'The main ones', set: [2, 3, 4, 5, 7, 9, 12],
      note: 'Adds the seconds, the minor third and the fourth. With these you can work out most melodies.' },
    { id: 'all',    label: 'Everything',    set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      note: 'Every interval inside the octave, including the tritone — the one that sounds like a question.' }
  ];
  var DIRS = [
    { id: 'up',   label: 'Upwards' },
    { id: 'down', label: 'Downwards' },
    { id: 'both', label: 'Together' },
    { id: 'mix',  label: 'Mixed' }
  ];

  var st = { tier: 'start', dir: 'up', q: null, streak: 0, best: 0, right: 0, asked: 0, live: [] };

  function el(id) { return document.getElementById(id); }
  function tier() { return TIERS.filter(function (t) { return t.id === st.tier; })[0]; }
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
  function sound(q) {
    if (!DRD.Synth) return;
    stopAudio();
    DRD.Synth.ensure();
    var t0 = DRD.Synth.ctx.currentTime + 0.06, gap = 0.62;
    var a = q.lo, b = q.lo + q.iv;
    var pair = q.dir === 'down' ? [b, a] : [a, b];
    if (q.dir === 'both') {
      st.live.push(DRD.Synth.note(DRD.midiToFreq(a), t0, 0.8));
      st.live.push(DRD.Synth.note(DRD.midiToFreq(b), t0, 0.8));
    } else {
      st.live.push(DRD.Synth.note(DRD.midiToFreq(pair[0]), t0, 0.9));
      st.live.push(DRD.Synth.note(DRD.midiToFreq(pair[1]), t0 + gap, 0.9));
    }
  }

  function ask() {
    var set = tier().set;
    var iv = set[Math.floor(Math.random() * set.length)];
    var dir = st.dir === 'mix' ? ['up', 'down', 'both'][Math.floor(Math.random() * 3)] : st.dir;
    // keep both notes in a comfortable middle register whichever way it goes
    var lo = 55 + Math.floor(Math.random() * (12 - (iv > 7 ? 2 : 0)));
    st.q = { iv: iv, dir: dir, lo: lo, done: false };
    el('ear-verdict').textContent = '';
    el('ear-verdict').className = 'ear-verdict';
    el('ear-reveal').innerHTML = '';
    el('ear-next').hidden = true;
    paintOptions();
    sound(st.q);
  }

  function paintOptions() {
    var set = tier().set;
    el('ear-options').innerHTML = set.map(function (n) {
      var iv = IVS.filter(function (x) { return x.n === n; })[0];
      return '<button type="button" class="ear-opt" data-iv="' + n + '">' + iv.name + '</button>';
    }).join('');
  }

  function answer(picked) {
    if (!st.q || st.q.done) return;
    st.q.done = true;
    var right = picked === st.q.iv;
    st.asked++;
    if (right) { st.right++; st.streak++; if (st.streak > st.best) st.best = st.streak; }
    else { st.streak = 0; }
    save();

    var name = IVS.filter(function (x) { return x.n === st.q.iv; })[0].name;
    var v = el('ear-verdict');
    v.textContent = right ? 'Correct — ' + name : 'Not quite. It was a ' + name + '.';
    v.className = 'ear-verdict ' + (right ? 'ok' : 'no');

    var a = st.q.lo, b = st.q.lo + st.q.iv;
    var pair = st.q.dir === 'down' ? [b, a] : [a, b];
    el('ear-reveal').innerHTML =
      '<span class="cof-note' + (/[A-G]/.test(LET[pair[0] % 12]) ? ' is-sharp' : '') + '">' + LET[pair[0] % 12] + '</span>' +
      '<span class="ear-arrow">' + (st.q.dir === 'both' ? '+' : st.q.dir === 'down' ? '↓' : '↑') + '</span>' +
      '<span class="cof-note' + (/[A-G]/.test(LET[pair[1] % 12]) ? ' is-sharp' : '') + '">' + LET[pair[1] % 12] + '</span>' +
      '<span class="ear-semis">' + st.q.iv + ' semitone' + (st.q.iv === 1 ? '' : 's') + '</span>';

    Array.prototype.forEach.call(document.querySelectorAll('.ear-opt'), function (b2) {
      var n = +b2.getAttribute('data-iv');
      if (n === st.q.iv) b2.classList.add('right');
      else if (n === picked) b2.classList.add('wrong');
      b2.disabled = true;
    });
    el('ear-next').hidden = false;
    paintScore();
  }

  function paintScore() {
    el('ear-streak').textContent = st.streak;
    el('ear-best').textContent = st.best;
    el('ear-pct').textContent = st.asked ? Math.round(st.right / st.asked * 100) + '%' : '—';
    el('ear-asked').textContent = st.asked;
  }

  function init() {
    if (!el('ear-options')) return;
    load();

    el('ear-tiers').innerHTML = TIERS.map(function (t) {
      return '<button type="button" class="ear-pick" data-tier="' + t.id + '">' + t.label + '</button>';
    }).join('');
    el('ear-dirs').innerHTML = DIRS.map(function (d) {
      return '<button type="button" class="ear-pick" data-dir="' + d.id + '">' + d.label + '</button>';
    }).join('');

    function paintPicks() {
      Array.prototype.forEach.call(document.querySelectorAll('[data-tier]'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-tier') === st.tier);
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-dir]'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-dir') === st.dir);
      });
      el('ear-tier-note').textContent = tier().note;
    }

    el('ear-tiers').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tier]'); if (!b) return;
      st.tier = b.getAttribute('data-tier'); st.streak = 0; paintPicks(); paintScore(); ask();
    });
    el('ear-dirs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-dir]'); if (!b) return;
      st.dir = b.getAttribute('data-dir'); paintPicks(); ask();
    });
    el('ear-options').addEventListener('click', function (e) {
      var b = e.target.closest('.ear-opt'); if (!b || b.disabled) return;
      answer(+b.getAttribute('data-iv'));
    });
    el('ear-replay').addEventListener('click', function () { if (st.q) sound(st.q); });
    el('ear-next').addEventListener('click', ask);
    el('ear-reset').addEventListener('click', function () {
      st.streak = 0; st.best = 0; st.right = 0; st.asked = 0; save(); paintScore();
    });

    paintPicks(); paintScore(); ask();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
