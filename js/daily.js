/* ============================================================================
   Günün Melodisi — the daily melody.

   One piece a day, the same one for everybody, drawn from DRD.DAILY_POOL by the
   UTC date. You hear the first second; a wrong guess or a skip buys you more —
   1s, 2s, 4s, 7s, 11s, 16s — and six tries in all. Everything (streak, history,
   distribution) lives in localStorage: no account, nothing uploaded.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD || {};
  var NOTA_V = 90;
  var KEY = 'drd-daily';
  var STEPS = [1, 2, 4, 7, 11, 16];          // seconds of music unlocked at each try
  var EPOCH = Date.UTC(2026, 7, 1);          // 1 August 2026 — puzzle #1

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function flat(s) {
    s = String(s || '').toLowerCase();
    return (s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ------------------------------------------------------------- the day */
  function dayNumber(d) {
    var today = Date.UTC((d || new Date()).getUTCFullYear(), (d || new Date()).getUTCMonth(), (d || new Date()).getUTCDate());
    return Math.floor((today - EPOCH) / 86400000) + 1;
  }
  function puzzleFor(n) {
    var pool = DRD.DAILY_POOL || [];
    if (!pool.length) return null;
    var id = pool[((n - 1) % pool.length + pool.length) % pool.length];
    return DRD.getSong ? DRD.getSong(id) : null;
  }

  /* ------------------------------------------------------------- storage */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function blank(n) { return { day: n, guesses: [], done: false, won: false }; }

  /* ---------------------------------------------------------- audio ---- */
  var live = [], timer = null, playing = false;
  function stopAudio() {
    live.forEach(function (nodes) { (nodes || []).forEach(function (o) { try { o.stop(); } catch (e) {} }); });
    live = []; clearTimeout(timer); timer = null; playing = false;
    var b = el('daily-play'); if (b) b.textContent = '▶ Play';
  }
  function playClip(cols, cps, seconds) {
    if (!DRD.Synth || !cols) return;
    stopAudio();
    DRD.Synth.ensure();
    var start = function () {
      var t0 = DRD.Synth.ctx.currentTime + 0.08, colDur = 1 / (cps || 6);
      for (var i = 0; i < cols.length; i++) {
        var when = t0 + i * colDur;
        if (when - t0 > seconds) break;
        var evs = cols[i].events, top = -1, k;
        for (k = 0; k < evs.length; k++) if (evs[k].midi > top) top = evs[k].midi;
        for (k = 0; k < evs.length; k++) live.push(DRD.Synth.note(DRD.midiToFreq(evs[k].midi), when, evs[k].midi === top ? 1 : 0.6));
      }
      playing = true;
      var b = el('daily-play'); if (b) b.textContent = '■ Stop';
      timer = setTimeout(stopAudio, seconds * 1000 + 400);
    };
    if (DRD.Synth.ctx && DRD.Synth.ctx.state === 'running') return start();
    var tries = 0, launched = false;
    try { var p = DRD.Synth.ctx && DRD.Synth.ctx.resume && DRD.Synth.ctx.resume(); if (p && p.then) p.then(function () { if (!launched) { launched = true; start(); } }, function () {}); } catch (e) {}
    var poll = setInterval(function () {
      if (launched) return clearInterval(poll);
      if (DRD.Synth.ctx && DRD.Synth.ctx.state === 'running') { launched = true; clearInterval(poll); start(); return; }
      if (++tries % 8 === 0) { try { DRD.Synth._kick(); } catch (e) {} }
      if (tries >= 50) { clearInterval(poll); if (!launched) { launched = true; start(); } }
    }, 50);
  }

  /* --------------------------------------------------------------- share */
  function grid(state) {
    var out = '';
    for (var i = 0; i < STEPS.length; i++) {
      var g = state.guesses[i];
      out += g == null ? '⬛' : (g === 'skip' ? '⬜' : (g === true ? '🟩' : '🟥'));
    }
    return out;
  }
  function shareText(state) {
    var score = state.won ? (state.guesses.length + '/' + STEPS.length) : 'X/' + STEPS.length;
    return 'DoReDog — Günün Melodisi #' + state.day + '  ' + score + '\n' + grid(state) + '\nhttps://doredog.com/daily';
  }

  /* ----------------------------------------------------------------- run */
  function init() {
    if (!el('daily-card') || !DRD.SONGS) return;
    var n = dayNumber();
    var song = puzzleFor(n);
    if (!song) return;
    var st = load();
    var state = (st.day === n) ? st : blank(n);
    var cols = null, cps = song.cps || 6;

    // history lives alongside the current puzzle so a new day doesn't wipe the streak
    state.streak = st.streak || 0;
    state.best = st.best || 0;
    state.played = st.played || 0;
    state.wins = st.wins || 0;
    state.lastWonDay = st.lastWonDay || 0;

    el('daily-num').textContent = '#' + n;
    render();

    // notation
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    var sc = document.createElement('script');
    sc.src = 'songs/' + song.id + '.js?v=' + NOTA_V;
    sc.onload = sc.onerror = function () {
      var nota = (DRD.NOTATIONS || {})[song.id];
      if (!nota) { el('daily-play').disabled = true; el('daily-play').textContent = 'Unavailable today'; return; }
      cols = DRD.buildTimeline(DRD.parseNotation(nota)).cols;
      el('daily-play').disabled = false;
    };
    document.head.appendChild(sc);

    function unlocked() { return STEPS[Math.min(state.guesses.length, STEPS.length - 1)]; }

    function render() {
      var tries = state.guesses.length;
      el('daily-steps').innerHTML = STEPS.map(function (s, i) {
        var g = state.guesses[i];
        var cls = g == null ? '' : (g === 'skip' ? ' skip' : (g === true ? ' hit' : ' miss'));
        var cur = (!state.done && i === tries) ? ' now' : '';
        return '<span class="daily-step' + cls + cur + '">' + s + 's</span>';
      }).join('');
      el('daily-heard').textContent = state.done ? 'Full piece' : unlocked() + ' second' + (unlocked() === 1 ? '' : 's');
      el('daily-guessed').innerHTML = state.guesses.map(function (g, i) {
        if (g === 'skip') return '<li class="skip">Skipped</li>';
        if (g === true) return '<li class="hit">✓ ' + esc(state.names[i] || song.title) + '</li>';
        return '<li class="miss">✗ ' + esc((state.names && state.names[i]) || '—') + '</li>';
      }).join('');
      el('daily-play-row').hidden = false;
      el('daily-guess-row').hidden = state.done;
      el('daily-result').hidden = !state.done;
      if (state.done) {
        el('daily-verdict').textContent = state.won
          ? 'Got it in ' + state.guesses.length + (state.guesses.length === 1 ? ' try.' : ' tries.')
          : 'Not this time.';
        el('daily-verdict').className = 'daily-verdict ' + (state.won ? 'ok' : 'no');
        el('daily-answer').innerHTML = 'It was <a href="song?id=' + esc(song.id) + '"><strong>' + esc(song.title) + '</strong></a>' +
          (song.composer ? ' — ' + esc(song.composer) : '') + '. ' +
          (DRD.levelBadge ? DRD.levelBadge(song) : '');
        el('daily-grid').textContent = grid(state);
        el('daily-stats').innerHTML =
          '<span><b>' + state.streak + '</b>current streak</span>' +
          '<span><b>' + state.best + '</b>best streak</span>' +
          '<span><b>' + state.played + '</b>played</span>' +
          '<span><b>' + (state.played ? Math.round(state.wins / state.played * 100) : 0) + '%</b>solved</span>';
      }
    }

    function finish(won) {
      state.done = true; state.won = won;
      state.played++;
      if (won) {
        state.wins++;
        state.streak = (state.lastWonDay === n - 1) ? state.streak + 1 : 1;
        state.lastWonDay = n;
        if (state.streak > state.best) state.best = state.streak;
      } else state.streak = 0;
      save(state); render();
      if (cols) playClip(cols, cps, 30);
    }

    function guess(picked) {
      if (state.done) return;
      state.names = state.names || [];
      if (picked === 'skip') { state.guesses.push('skip'); state.names.push(''); }
      else {
        var right = picked === song.id;
        state.guesses.push(right);
        var g = DRD.getSong(picked);
        state.names.push(g ? g.title : '');
        if (right) { save(state); return finish(true); }
      }
      if (state.guesses.length >= STEPS.length) return finish(false);
      save(state); render();
    }

    el('daily-play').addEventListener('click', function () {
      if (playing) return stopAudio();
      playClip(cols, cps, state.done ? 30 : unlocked());
    });
    el('daily-skip').addEventListener('click', function () { guess('skip'); });
    el('daily-copy').addEventListener('click', function () {
      var t = shareText(state), btn = this;
      var done = function () { btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = 'Copy result'; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, done);
      else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
    });

    // guess box — search the catalogue, pick from the list
    var input = el('daily-input'), list = el('daily-suggest');
    function suggest() {
      var q = flat(input.value);
      if (!q) { list.innerHTML = ''; return; }
      var out = [], songs = DRD.SONGS;
      for (var i = 0; i < songs.length && out.length < 8; i++) {
        var s = songs[i];
        if (flat(s.title + ' ' + (s.composer || '')).indexOf(q) > -1) out.push(s);
      }
      list.innerHTML = out.map(function (s) {
        return '<button type="button" data-id="' + esc(s.id) + '"><b>' + esc(s.title) + '</b><i>' + esc(s.composer || '') + '</i></button>';
      }).join('');
    }
    input.addEventListener('input', suggest);
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]'); if (!b) return;
      input.value = ''; list.innerHTML = '';
      guess(b.getAttribute('data-id'));
    });
  }

  global.DRDDaily = { init: init, dayNumber: dayNumber, puzzleFor: puzzleFor, STEPS: STEPS };
  if (global.document) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(window);
