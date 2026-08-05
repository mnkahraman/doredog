/* ============================================================================
   Flow Piano — the piano on which a wrong note is impossible.

   Pick a piece; then ANY key — any letter on the computer keyboard, any key on
   the on-screen piano, a tap anywhere on the pad — plays the piece's next
   note (or chord) correctly. The pitches are locked to the piece; the TIMING,
   the pauses, the rushes, the hesitations are all yours. That is the half of
   music-making that letter notes cannot teach, and the half that carries the
   feeling: play it slow and it mourns, play it quick and it dances.

   Expression controls, kept honest for hardware that has no velocity:
     · your timing — entirely yours, nothing is quantized
     · Shift (or the ACCENT pad) — plays the next note louder
     · nothing else. Two controls is enough to phrase with.
   ========================================================================== */
(function () {
  'use strict';
  var qs = new URLSearchParams(location.search);
  var root = document.getElementById('flow-root');
  if (!root) return;

  var DEFAULT = 'twinkle-twinkle';
  var id = qs.get('id') || DEFAULT;
  var song = (DRD.SONGS || []).filter(function (s) { return s.id === id; })[0];
  if (!song) { id = DEFAULT; song = (DRD.SONGS || []).filter(function (s) { return s.id === id; })[0]; }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  var L = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
  function letterOf(m) { return L[m % 12]; }
  function octOf(m) { return Math.floor(m / 12) - 1; }

  function loadNotation(sid, cb) {
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    if (DRD.NOTATIONS[sid]) return cb(DRD.NOTATIONS[sid]);
    var sc = document.createElement('script');
    sc.src = 'songs/' + sid + '.js?v=90';
    sc.onload = sc.onerror = function () { cb((DRD.NOTATIONS || {})[sid] || null); };
    document.head.appendChild(sc);
  }

  /* The piece as a list of steps; each step = the notes of one non-empty
     timeline column. Rests are dropped on purpose: in flow mode silence is
     made by NOT pressing, which is the whole point. */
  function stepsOf(nota) {
    var cols = DRD.buildTimeline(DRD.parseNotation(nota)).cols;
    var steps = [];
    for (var i = 0; i < cols.length; i++) {
      if (!cols[i].events.length) continue;
      steps.push(cols[i].events.map(function (ev) { return ev.midi; }));
    }
    return steps;
  }

  document.title = 'Flow Piano — ' + song.title + ' | DoReDog';

  root.innerHTML =
    '<div class="arc-head">' +
      '<a class="arc-back" href="song?id=' + song.id + '">← ' + song.title + '</a>' +
      '<h1 class="arc-title"><span class="arc-ico">🌊</span> Flow Piano</h1>' +
      '<p class="arc-desc">Every key you press plays the <b>right</b> note of ' +
        '<b>' + song.title + '</b>. The rhythm, the pauses, the feeling — those are yours. ' +
        'A wrong note is impossible.</p>' +
    '</div>' +
    '<div class="arc-card flow-card">' +
      '<div class="flow-ribbon-wrap"><div class="flow-ribbon" id="flow-ribbon"></div></div>' +
      '<div class="flow-meta">' +
        '<span id="flow-progress">0%</span>' +
        '<span class="flow-hint">Any key plays · <b>Shift</b> = accent · slow is allowed, slow is beautiful</span>' +
      '</div>' +
      '<div class="arc-keys-wrap" id="flow-keys"></div>' +
      '<div class="flow-pads">' +
        '<button class="flow-tap" id="flow-tap" type="button">TAP<span>or any key</span></button>' +
        '<button class="flow-tap flow-accent" id="flow-accent" type="button">ACCENT<span>or Shift + key</span></button>' +
      '</div>' +
      '<div class="arc-over" id="flow-over">' +
        '<div class="arc-over-inner">' +
          '<h2>🌊 ' + song.title + '</h2>' +
          '<p class="arc-help">' + song.composer + ' — played your way, note-perfect, in your own time. ' +
            'Press play, then tap any key at all: the piano only knows the right notes.</p>' +
          '<button class="btn btn-primary btn-lg" id="flow-go" type="button">▶ Start</button>' +
          '<p style="margin-top:14px"><a href="library.html" style="color:var(--gold);font-size:.9rem">Pick a different piece →</a></p>' +
        '</div>' +
      '</div>' +
    '</div>';

  var ribbon = document.getElementById('flow-ribbon');
  var progress = document.getElementById('flow-progress');
  var over = document.getElementById('flow-over');
  var keysWrap = document.getElementById('flow-keys');
  var steps = [], at = 0, keyMap = null, started = false;

  var piano = DRD.buildPiano(keysWrap, [3, 6], function () { advance(false); });
  keyMap = piano.keys;

  function paintRibbon() {
    // the letters just played, the one due NOW (big), and what's coming
    var html = '';
    for (var i = Math.max(0, at - 4); i < Math.min(steps.length, at + 9); i++) {
      var top = Math.max.apply(null, steps[i]);
      var cls = i < at ? 'done' : i === at ? 'now' : 'next';
      html += '<span class="flow-note ' + cls + ' o' + Math.max(2, Math.min(6, octOf(top))) + '">' +
        letterOf(top) + (steps[i].length > 1 ? '<i>+' + (steps[i].length - 1) + '</i>' : '') + '</span>';
    }
    ribbon.innerHTML = html;
    progress.textContent = Math.round((at / steps.length) * 100) + '%';
  }

  function lightKeys(midis) {
    midis.forEach(function (m) {
      var k = keyMap[m];
      if (!k) return;
      var o = Math.max(2, Math.min(6, octOf(m)));
      k.classList.add('down', 'lit', 'lit-o' + o);
      setTimeout(function () { k.classList.remove('down', 'lit', 'lit-o' + o); }, 260);
    });
  }

  function advance(accent) {
    if (!started || !steps.length) return;
    if (at >= steps.length) return;
    DRD.Synth.ensure();
    var midis = steps[at];
    var vel = (accent ? 1.0 : 0.78) * Math.min(1, 1.7 / midis.length + 0.35);
    midis.forEach(function (m) { DRD.Synth.note(DRD.midiToFreq(m), null, vel); });
    lightKeys(midis);
    at++;
    paintRibbon();
    if (at >= steps.length) finish();
  }

  function finish() {
    started = false;
    over.classList.remove('out');
    over.querySelector('h2').textContent = '🌊 Beautiful.';
    over.querySelector('.arc-help').innerHTML =
      'You just played all ' + steps.length + ' notes of <b>' + song.title + '</b> — your phrasing, zero wrong notes. ' +
      'Ready for the training wheels to come off? <a href="song?id=' + song.id + '" style="color:var(--gold)">Learn it for real</a>.';
    document.getElementById('flow-go').textContent = '↻ Play it again';
  }

  document.getElementById('flow-go').addEventListener('click', function () {
    DRD.Synth.ensure();
    loadNotation(song.id, function (nota) {
      if (!nota) { over.querySelector('.arc-help').textContent = 'Could not load this piece — pick another.'; return; }
      steps = stepsOf(nota);
      at = 0; started = true;
      over.classList.add('out');
      paintRibbon();
    });
  });

  document.getElementById('flow-tap').addEventListener('pointerdown', function (e) { e.preventDefault(); advance(false); });
  document.getElementById('flow-accent').addEventListener('pointerdown', function (e) { e.preventDefault(); advance(true); });

  window.addEventListener('keydown', function (e) {
    if (!started) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Shift') return;                       // accent is Shift+key, not Shift alone
    if (e.key === 'Tab' || e.key === 'Escape' || /^F\d/.test(e.key)) return;
    if (e.repeat) return;                                // holding a key is one note, not a roll
    e.preventDefault();
    advance(e.shiftKey);
  });
})();
