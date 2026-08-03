/* ============================================================================
   DoReDog Studio — a jukebox for the whole library.

   Queue any of the 2,400+ pieces, give EACH one its own instrument, and play
   them back to back. One transport, one scheduler: pressing play twice can
   never stack two performances on top of each other.

   The queue lives in localStorage, so it survives a reload.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD || {};
  var NOTA_V = 89;
  var QKEY = 'drd-queue-v1';
  var MAXQ = 300;
  var LOOK = 0.35, TICK = 40;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(sec) { sec = Math.max(0, Math.round(sec || 0)); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
  function song(id) { return (DRD.getSong && DRD.getSong(id)) || null; }
  function voices() { return (DRD.Synth && DRD.Synth.VOICES) || []; }
  function voiceName(id) { var v = voices().filter(function (x) { return x.id === id; })[0]; return v ? v.name : id; }

  /* --------------------------------------------------------------- state */
  var queue = [], cur = -1, playing = false, shuffle = false, repeat = 'all';
  var cols = null, colDur = 0, total = 0, startTime = 0, pausedAt = 0, nextCol = 0;
  var schedTimer = null, raf = null, live = [];
  var onVoice = null;                       // page hook: keeps the info panel in sync

  function ctx() { return DRD.Synth && DRD.Synth.ctx; }

  /* --------------------------------------------------------- persistence */
  function loadQueue() {
    try {
      var a = JSON.parse(localStorage.getItem(QKEY));
      if (!Array.isArray(a)) return [];
      return a.filter(function (t) { return t && t.id && song(t.id); })
              .map(function (t) { return { id: t.id, voice: t.voice || 'grand' }; }).slice(0, MAXQ);
    } catch (e) { return []; }
  }
  function saveQueue() { try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch (e) {} }

  /* ------------------------------------------------------------ notation */
  var pending = {};
  function notation(id, cb) {
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    if (DRD.NOTATIONS[id]) return cb(DRD.NOTATIONS[id]);
    if (pending[id]) { pending[id].push(cb); return; }
    pending[id] = [cb];
    var sc = document.createElement('script');
    sc.src = 'songs/' + id + '.js?v=' + NOTA_V;
    sc.onload = sc.onerror = function () {
      var n = (DRD.NOTATIONS || {})[id] || null;
      (pending[id] || []).forEach(function (f) { f(n); });
      delete pending[id];
    };
    document.head.appendChild(sc);
  }

  /* ------------------------------------------------------------ playback */
  function stopLive() { live.forEach(function (n) { (n || []).forEach(function (o) { try { o.stop(); } catch (e) {} }); }); live = []; }

  function halt() {
    playing = false;
    clearInterval(schedTimer); schedTimer = null;
    cancelAnimationFrame(raf); raf = null;
    stopLive();
  }

  function stop() { halt(); pausedAt = 0; nextCol = 0; paint(); }

  function loadTrack(i, andPlay) {
    if (i < 0 || i >= queue.length) { halt(); cur = -1; cols = null; paint(); return; }
    halt(); pausedAt = 0; nextCol = 0;
    cur = i;
    var t = queue[i], s = song(t.id);
    if (!s) { queue.splice(i, 1); saveQueue(); return loadTrack(i, andPlay); }
    cols = null; paint();
    notation(t.id, function (nota) {
      if (cur !== i) return;                             // the user moved on while it loaded
      if (!nota) { paint(); if (andPlay) advance(1); return; }
      var tl = DRD.buildTimeline(DRD.parseNotation(nota));
      cols = tl.cols; total = tl.cols.length;
      colDur = 1 / (s.cps || 6);
      paint();
      if (andPlay) play();
    });
  }

  function applyVoice() {
    var t = queue[cur]; if (!t || !DRD.Synth) return;
    if (DRD.Synth.voiceId !== t.voice) DRD.Synth.setVoice(t.voice);
    if (onVoice) onVoice(t.voice);
  }

  function play() {
    if (!queue.length) return;
    if (cur < 0) return loadTrack(0, true);
    if (!cols) return loadTrack(cur, true);
    if (playing) return;
    DRD.Synth.ensure();
    applyVoice();
    var begin = function () {
      if (playing) return;
      startTime = ctx().currentTime - pausedAt + 0.09;
      nextCol = Math.max(0, Math.floor(pausedAt / colDur + 1e-6));
      playing = true;
      schedTimer = setInterval(schedule, TICK); schedule();
      raf = requestAnimationFrame(tick);
      paint();
    };
    // Safari/iOS: anything scheduled before the context is confirmed 'running' is silently dropped.
    if (ctx() && ctx().state === 'running') return begin();
    var launched = false, tries = 0;
    var tryStart = function () { if (launched) return false; if (ctx() && ctx().state === 'running') { launched = true; begin(); return true; } return false; };
    try { var pr = ctx() && ctx().resume && ctx().resume(); if (pr && pr.then) pr.then(tryStart, function () {}); } catch (e) {}
    var poll = setInterval(function () {
      if (tryStart()) return clearInterval(poll);
      if (++tries % 8 === 0) { try { DRD.Synth._kick(); } catch (e) {} }
      if (tries >= 60) { clearInterval(poll); if (!launched) { launched = true; begin(); } }
    }, 50);
  }

  function pause() { if (!playing) return; pausedAt = elapsed(); halt(); paint(); }
  function toggle() { playing ? pause() : play(); }
  function elapsed() { return playing && ctx() ? Math.max(0, ctx().currentTime - startTime) : pausedAt; }
  function duration() { return cols ? total * colDur : 0; }

  function schedule() {
    if (!playing || !cols) return;
    var now = ctx().currentTime, horizon = now + LOOK;
    while (nextCol < total && startTime + nextCol * colDur < horizon) {
      var when = Math.max(startTime + nextCol * colDur, now);
      var evs = cols[nextCol].events, topMidi = -1, i;
      for (i = 0; i < evs.length; i++) if (evs[i].midi > topMidi) topMidi = evs[i].midi;
      for (i = 0; i < evs.length; i++) {
        live.push(DRD.Synth.note(DRD.midiToFreq(evs[i].midi), when, evs[i].midi === topMidi ? 1 : 0.6));
      }
      if (live.length > 400) live = live.slice(-200);
      nextCol++;
    }
    if (nextCol >= total && ctx().currentTime > startTime + total * colDur + 0.25) ended();
  }

  function ended() {
    halt(); pausedAt = 0;
    if (repeat === 'one') return loadTrack(cur, true);
    advance(1);
  }

  function advance(dir) {
    if (!queue.length) return;
    if (shuffle && dir > 0 && queue.length > 1) {
      var n = cur;
      while (n === cur) n = Math.floor(Math.random() * queue.length);
      return loadTrack(n, true);
    }
    var i = cur + dir;
    if (i >= queue.length) { if (repeat === 'off') { stop(); cur = 0; paint(); return; } i = 0; }
    if (i < 0) i = queue.length - 1;
    loadTrack(i, true);
  }

  function seek(frac) {
    if (!cols) return;
    var was = playing; halt();
    pausedAt = Math.max(0, Math.min(duration() - 0.05, frac * duration()));
    if (was) play(); else paint();
  }

  function tick() {
    if (!playing) return;
    var d = duration(), e = Math.min(elapsed(), d);
    var f = el('st-fill'); if (f) f.style.width = (d ? (e / d) * 100 : 0) + '%';
    var t = el('st-time'); if (t) t.textContent = fmt(e);
    raf = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ queue ops */
  function add(id, voice, atFront) {
    if (!song(id) || queue.length >= MAXQ) return false;
    var t = { id: id, voice: voice || (DRD.Synth && DRD.Synth.voiceId) || 'grand' };
    if (atFront) { queue.splice(cur + 1, 0, t); } else queue.push(t);
    saveQueue(); renderQueue(); paint();
    return true;
  }
  function remove(i) {
    if (i < 0 || i >= queue.length) return;
    var wasCur = i === cur;
    queue.splice(i, 1); saveQueue();
    if (wasCur) { halt(); cols = null; cur = Math.min(i, queue.length - 1); if (cur >= 0) loadTrack(cur, false); }
    else if (i < cur) cur--;
    renderQueue(); paint();
  }
  function move(i, dir) {
    var j = i + dir;
    if (i < 0 || j < 0 || i >= queue.length || j >= queue.length) return;
    var t = queue[i]; queue[i] = queue[j]; queue[j] = t;
    if (cur === i) cur = j; else if (cur === j) cur = i;
    saveQueue(); renderQueue(); paint();
  }

  /* --------------------------------------------------------------- views */
  function voiceOptions(sel) {
    return voices().map(function (v) {
      return '<option value="' + v.id + '"' + (v.id === sel ? ' selected' : '') + '>' + esc(v.name) + '</option>';
    }).join('');
  }

  function renderQueue() {
    var wrap = el('st-queue'); if (!wrap) return;
    el('st-count').textContent = queue.length ? queue.length + ' piece' + (queue.length > 1 ? 's' : '') : '';
    if (!queue.length) {
      wrap.innerHTML = '<li class="st-empty">Your playlist is empty. Search below, or add your favourites — ' +
        'every piece keeps the instrument you give it.</li>';
      return;
    }
    wrap.innerHTML = queue.map(function (t, i) {
      var s = song(t.id) || {};
      return '<li class="st-row' + (i === cur ? ' is-cur' : '') + '" data-i="' + i + '">' +
        '<button class="st-row-play" data-act="jump" data-i="' + i + '" aria-label="Play ' + esc(s.title) + '">' +
          (i === cur && playing ? '❚❚' : '▶') + '</button>' +
        '<span class="st-row-txt"><b>' + esc(s.title) + '</b><i>' + esc(s.composer || 'Traditional') + '</i></span>' +
        '<select class="st-row-voice" data-i="' + i + '" aria-label="Instrument for ' + esc(s.title) + '">' + voiceOptions(t.voice) + '</select>' +
        (DRD.favBtn ? DRD.favBtn(t.id) : '') +
        '<button class="st-row-x" data-act="up" data-i="' + i + '" aria-label="Move up">↑</button>' +
        '<button class="st-row-x" data-act="down" data-i="' + i + '" aria-label="Move down">↓</button>' +
        '<button class="st-row-x" data-act="del" data-i="' + i + '" aria-label="Remove">✕</button>' +
      '</li>';
    }).join('');
  }

  function paint() {
    var t = queue[cur], s = t && song(t.id);
    var title = el('st-title'), sub = el('st-sub'), btn = el('st-play');
    if (title) title.textContent = s ? s.title : (queue.length ? 'Ready' : 'Nothing queued yet');
    if (sub) {
      sub.innerHTML = s
        ? esc(s.composer || 'Traditional') + ' · <b>' + esc(voiceName(t.voice)) + '</b>' + (cols ? '' : ' · loading…')
        : 'Add pieces below and they will play one after another.';
    }
    if (btn) { btn.innerHTML = playing ? '❚❚' : '▶'; btn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
    var d = el('st-dur'); if (d) d.textContent = fmt(duration());
    var e = el('st-time'); if (e && !playing) e.textContent = fmt(pausedAt);
    var f = el('st-fill'); if (f && !playing) f.style.width = (duration() ? (pausedAt / duration()) * 100 : 0) + '%';
    var sh = el('st-shuffle'); if (sh) sh.setAttribute('aria-pressed', String(shuffle));
    var rp = el('st-repeat');
    if (rp) { rp.setAttribute('data-mode', repeat); rp.textContent = repeat === 'one' ? '🔂' : '🔁'; rp.setAttribute('aria-pressed', String(repeat !== 'off')); }
    [].forEach.call(document.querySelectorAll('.st-row'), function (r) {
      var i = +r.getAttribute('data-i');
      r.classList.toggle('is-cur', i === cur);
      var p = r.querySelector('.st-row-play'); if (p) p.textContent = (i === cur && playing) ? '❚❚' : '▶';
    });
  }

  /* -------------------------------------------------------------- search */
  // "fur elise" has to find "Für Elise", "chopin" has to find "Chopin" — strip the accents on both sides
  function flat(s) {
    s = String(s || '').toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  }
  function results(q) {
    var list = DRD.SONGS || [], out = [], i, s;
    q = flat(q).trim();
    if (!q) {
      var favs = (DRD.favs && DRD.favs.all()) || [];
      if (favs.length) return favs.map(song).filter(Boolean).slice(0, 12);
      return list.slice(0, 12);
    }
    for (i = 0; i < list.length && out.length < 12; i++) {
      s = list[i];
      if (flat(s.title + ' ' + (s.composer || '')).indexOf(q) > -1) out.push(s);
    }
    return out;
  }

  function renderResults(q) {
    var wrap = el('st-results'); if (!wrap) return;
    var rows = results(q || '');
    if (!rows.length) { wrap.innerHTML = '<p class="st-empty">Nothing matched that. Try a composer’s surname.</p>'; return; }
    wrap.innerHTML = rows.map(function (s) {
      return '<div class="st-res">' +
        '<span class="st-res-txt"><b>' + esc(s.title) + '</b><i>' + esc(s.composer || 'Traditional') +
          (s.difficulty ? ' · ' + esc(s.difficulty) : '') + '</i></span>' +
        (DRD.favBtn ? DRD.favBtn(s.id) : '') +
        '<button class="btn btn-ghost st-add" data-act="add" data-id="' + esc(s.id) + '">+ Add</button>' +
      '</div>';
    }).join('');
  }

  /* ----------------------------------------------------------------- init */
  function init(opts) {
    opts = opts || {};
    onVoice = opts.onVoice || null;
    if (!el('st-queue')) return;
    queue = loadQueue();
    renderQueue(); renderResults(''); paint();
    if (queue.length) loadTrack(0, false);

    // one delegated handler for the whole studio
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act'), i = +b.getAttribute('data-i');
      switch (act) {
        case 'toggle': toggle(); break;
        case 'next': advance(1); break;
        case 'prev': if (elapsed() > 3) { seek(0); } else advance(-1); break;
        case 'stop': stop(); break;
        case 'jump': (i === cur && playing) ? pause() : loadTrack(i, true); renderQueue(); paint(); break;
        case 'up': move(i, -1); break;
        case 'down': move(i, 1); break;
        case 'del': remove(i); break;
        case 'add': add(b.getAttribute('data-id')); flash(b, 'Added ✓'); break;
        case 'clear': halt(); queue = []; cur = -1; cols = null; saveQueue(); renderQueue(); paint(); break;
        case 'add-favs': {
          var favs = (DRD.favs && DRD.favs.all()) || [];
          var n = 0; favs.forEach(function (id) { if (add(id)) n++; });
          flash(b, n ? n + ' added ✓' : 'No favourites yet');
          break;
        }
        case 'add-random': {
          var all = DRD.SONGS || [], k = 0;
          for (var t = 0; t < 5 && all.length; t++) { if (add(all[Math.floor(Math.random() * all.length)].id)) k++; }
          flash(b, k + ' added ✓');
          break;
        }
        case 'all-voice': {
          var v = (DRD.Synth && DRD.Synth.voiceId) || 'grand';
          queue.forEach(function (t2) { t2.voice = v; });
          saveQueue(); renderQueue(); applyVoice(); paint(); flash(b, 'Done ✓');
          break;
        }
        case 'shuffle': shuffle = !shuffle; paint(); break;
        case 'repeat': repeat = repeat === 'all' ? 'one' : repeat === 'one' ? 'off' : 'all'; paint(); break;
      }
    });

    document.addEventListener('change', function (ev) {
      var s = ev.target;
      if (!s.classList || !s.classList.contains('st-row-voice')) return;
      var i = +s.getAttribute('data-i');
      if (!queue[i]) return;
      queue[i].voice = s.value; saveQueue();
      if (i === cur) { applyVoice(); paint(); }
    });

    var bar = el('st-bar');
    if (bar) bar.addEventListener('click', function (e) {
      var r = bar.getBoundingClientRect();
      seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    });

    var sr = el('st-search');
    if (sr) {
      var t = null;
      sr.addEventListener('input', function () {
        clearTimeout(t); var v = this.value;
        t = setTimeout(function () { renderResults(v); }, 120);
      });
    }
  }

  function flash(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg; btn.disabled = true;
    setTimeout(function () { btn.textContent = old; btn.disabled = false; }, 900);
  }

  global.DRDStudio = {
    init: init, add: add, play: play, pause: pause, stop: stop, toggle: toggle,
    playNow: function (id, voice) {
      // used by "hear a demo": queue it right after the current track and start it —
      // never stacks a second performance on top of the one already running.
      var at = -1;
      for (var i = 0; i < queue.length; i++) if (queue[i].id === id) { at = i; break; }
      if (at < 0) { at = Math.max(0, cur + 1); if (!add(id, voice, true)) return; }
      if (voice) queue[at].voice = voice;
      saveQueue(); renderQueue();
      loadTrack(at, true);
    },
    // picking an instrument while a piece is playing re-assigns THAT piece, so the
    // playlist and what you hear can never disagree
    setCurrentVoice: function (voiceId) {
      if (cur < 0 || !queue[cur] || queue[cur].voice === voiceId) return;
      queue[cur].voice = voiceId; saveQueue(); renderQueue(); paint();
    },
    get playing() { return playing; },
    get current() { return queue[cur] || null; }
  };
})(window);
