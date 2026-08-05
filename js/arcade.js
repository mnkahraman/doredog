/* ============================================================================
   DoReDog Arcade — the shared shell every game runs in.

   A game is an object registered with DRD.arcade.register():
     { id, title, icon, tag, desc, help, toy?, start(ctx) }
   The shell owns everything repetitive: the start/end overlays, the HUD, best
   scores (localStorage 'drd-arcade'), keyboard/interval/RAF cleanup between
   runs, audio helpers on top of DRD.Synth, and melody loading from the same
   2,433 transcriptions the rest of the site plays. Games stay small.

   Design rules learned from the sites researched in
   marketing/research-fun-sites.md: at most two clicks from cold start, instant
   restart, sound + motion on every input, and it should be hard to sound bad.
   ========================================================================== */
(function () {
  'use strict';
  window.DRD = window.DRD || {};
  var A = DRD.arcade = { games: [], byId: {} };

  A.register = function (def) { A.games.push(def); A.byId[def.id] = def; };

  /* ---- best scores ------------------------------------------------------ */
  var KEY = 'drd-arcade';
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  A.best = function (id) { return (store()[id] || {}).best || 0; };
  A.plays = function (id) { return (store()[id] || {}).plays || 0; };
  A.record = function (id, score) {
    var s = store(); var g = s[id] = s[id] || { best: 0, plays: 0 };
    g.plays++; if (score > g.best) g.best = score;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return g.best;
  };

  /* ---- audio ------------------------------------------------------------ */
  A.ensure = function () { DRD.Synth.ensure(); return DRD.Synth.ctx; };
  A.now = function () { return A.ensure().currentTime; };
  A.note = function (midi, when, vel) { DRD.Synth.ensure(); return DRD.Synth.note(DRD.midiToFreq(midi), when, vel); };
  A.chord = function (midis, when, vel) {
    var v = Math.min(0.85, 1.6 / midis.length) * (vel == null ? 1 : vel);
    return midis.map(function (m) { return A.note(m, when, v); });
  };
  A.hush = function (played) {
    (played || []).forEach(function (nodes) {
      (nodes || []).forEach(function (o) { try { o.stop(); } catch (e) {} });
    });
    played && (played.length = 0);
  };

  // Synthesized percussion for the rhythm games and the Beat Lab. The piano
  // synth has no drums; these are the classic WebAudio recipes.
  A.drum = function (kind, when, vel) {
    var ctx = A.ensure(), t = when != null ? when : ctx.currentTime, v = vel == null ? 1 : vel;
    var out = DRD.Synth.master || ctx.destination;
    if (!A._noise) {
      var b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      var d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      A._noise = b;
    }
    var g = ctx.createGain(); g.connect(out);
    if (kind === 'kick') {
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); o.start(t); o.stop(t + 0.3);
    } else if (kind === 'snare') {
      var s = ctx.createBufferSource(); s.buffer = A._noise;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
      s.connect(f); f.connect(g);
      g.gain.setValueAtTime(0.55 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      s.start(t); s.stop(t + 0.2);
    } else if (kind === 'hat') {
      var h = ctx.createBufferSource(); h.buffer = A._noise;
      var hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 8000;
      h.connect(hf); hf.connect(g);
      g.gain.setValueAtTime(0.3 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      h.start(t); h.stop(t + 0.06);
    } else { // clave / click
      var c = ctx.createOscillator(); c.type = 'sine'; c.frequency.value = 2400;
      g.gain.setValueAtTime(0.4 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      c.connect(g); c.start(t); c.stop(t + 0.05);
    }
  };

  /* ---- melodies from the real catalogue --------------------------------- */
  A.loadNotation = function (id, cb) {
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    if (DRD.NOTATIONS[id]) return cb(DRD.NOTATIONS[id]);
    var sc = document.createElement('script');
    sc.src = 'songs/' + id + '.js?v=90';               // NOTA_V — same pin as daily.js/pages.js
    sc.onload = sc.onerror = function () { cb((DRD.NOTATIONS || {})[id] || null); };
    document.head.appendChild(sc);
  };

  // Top line of a piece as [{midi}], octave-shifted to fit [lo..hi] with every
  // interval preserved (the same trick Melody Detective uses). null = doesn't fit.
  function topLine(nota, max, keepRepeats) {
    var cols = DRD.buildTimeline(DRD.parseNotation(nota)).cols;
    var out = [], last = null;
    for (var i = 0; i < cols.length && out.length < max; i++) {
      var top = -1;
      for (var k = 0; k < cols[i].events.length; k++) if (cols[i].events[k].midi > top) top = cols[i].events[k].midi;
      if (top < 0) continue;
      if (!keepRepeats && top === last) continue;
      out.push(top); last = top;
    }
    return out;
  }
  function fitRange(mel, lo, hi) {
    if (!mel.length) return null;
    var mn = Math.min.apply(null, mel), mx = Math.max.apply(null, mel);
    if (mx - mn > hi - lo) return null;
    var shift = 0;
    while (mn + shift < lo) shift += 12;
    while (mx + shift > hi) shift -= 12;
    if (mn + shift < lo || mx + shift > hi) return null;
    return mel.map(function (m) { return m + shift; });
  }
  A.fitRange = fitRange;

  // opts: {min, max, lo, hi, keepRepeats, tries}. cb(melody[], song) or cb(null).
  A.melody = function (opts, cb) {
    opts = opts || {};
    var pool = (DRD.DAILY_POOL || []).slice();
    var min = opts.min || 8, max = opts.max || 64;
    var lo = opts.lo != null ? opts.lo : 48, hi = opts.hi != null ? opts.hi : 83;
    var tries = opts.tries || 10;
    (function attempt() {
      if (!tries-- || !pool.length) return cb(null, null);
      var id = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      A.loadNotation(id, function (nota) {
        if (!nota) return attempt();
        var mel = fitRange(topLine(nota, max, opts.keepRepeats), lo, hi);
        if (!mel || mel.length < min) return attempt();
        var song = (DRD.SONGS || []).filter(function (s) { return s.id === id; })[0] || { id: id, title: id };
        cb(mel, song);
      });
    })();
  };

  // Real-time playback of a piece's opening (both hands, real column grid) for
  // the listening games. Returns a handle with stop().
  A.playOpening = function (song, nota, seconds, vel) {
    var cols = DRD.buildTimeline(DRD.parseNotation(nota)).cols;
    var step = 1 / Math.max(2, Math.min(10, song.cps || 5));
    var t0 = A.now() + 0.08, live = [];
    for (var i = 0; i < cols.length; i++) {
      var at = i * step;
      if (at > seconds) break;
      for (var k = 0; k < cols[i].events.length; k++) {
        live.push(A.note(cols[i].events[k].midi, t0 + at, 0.75 * (vel == null ? 1 : vel)));
      }
    }
    return { stop: function () { A.hush(live); } };
  };

  /* ---- the shell -------------------------------------------------------- */
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  A.el = h;

  A.mount = function (root, def) {
    root.innerHTML =
      '<div class="arc-head">' +
        '<a class="arc-back" href="games.html">← All games</a>' +
        '<h1 class="arc-title"><span class="arc-ico">' + def.icon + '</span> ' + def.title + '</h1>' +
        '<p class="arc-desc">' + def.desc + '</p>' +
      '</div>' +
      '<div class="arc-card">' +
        '<div class="arc-hud" id="arc-hud" hidden>' +
          '<span class="arc-stat">Score <b id="arc-score">0</b></span>' +
          '<span class="arc-stat" id="arc-lives-wrap" hidden>Lives <b id="arc-lives"></b></span>' +
          '<span class="arc-stat" id="arc-time-wrap" hidden>Time <b id="arc-time"></b></span>' +
          '<span class="arc-stat">Best <b id="arc-hud-best">' + A.best(def.id) + '</b></span>' +
        '</div>' +
        '<div class="arc-stage" id="arc-stage"></div>' +
        '<div class="arc-over" id="arc-over">' +
          '<div class="arc-over-inner">' +
            '<h2 id="arc-over-h">' + def.icon + ' ' + def.title + '</h2>' +
            '<p class="arc-help" id="arc-over-p">' + def.help + '</p>' +
            (def.toy ? '' : '<p class="arc-best">Your best: <b id="arc-best">' + A.best(def.id) + '</b></p>') +
            '<button class="btn btn-primary btn-lg" id="arc-go" type="button">▶ Play</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var stage = root.querySelector('#arc-stage');
    var over = root.querySelector('#arc-over');
    var hud = root.querySelector('#arc-hud');
    var listeners = [], intervals = [], rafs = [], timeouts = [], running = false;

    function cleanup() {
      running = false;
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
      rafs.forEach(cancelAnimationFrame);
      listeners = []; intervals = []; rafs = []; timeouts = [];
      if (ctx._onStop) { try { ctx._onStop(); } catch (e) {} ctx._onStop = null; }
      stage.innerHTML = '';
    }

    /* Doré sits in the corner and reacts — cheers streaks, winces at misses,
       celebrates a new best. Poses reuse the existing mascot art. */
    var dore = h('div', 'arc-dore');
    dore.innerHTML = '<span class="arc-dore-say" hidden></span>' +
      '<img src="assets/mascot/dore-play.webp" alt="" width="72" height="72" decoding="async">';
    root.querySelector('.arc-card').appendChild(dore);
    var doreImg = dore.querySelector('img'), doreSay = dore.querySelector('.arc-dore-say'), doreT = null;
    var CHEER = ['Nice!', 'Keep going!', 'You got this!', 'Woof!', 'On fire!'];
    var OUCH = ['Ouch…', 'So close!', 'Shake it off!', 'Next one!'];
    function doreMood(mood, text) {
      dore.classList.remove('cheer', 'ouch', 'wow');
      void dore.offsetWidth;
      dore.classList.add(mood);
      doreImg.src = 'assets/mascot/' + (mood === 'ouch' ? 'dore-404' : mood === 'wow' ? 'dore-hero' : 'dore-play') + '.webp';
      if (text) {
        doreSay.textContent = text; doreSay.hidden = false;
        clearTimeout(doreT);
        doreT = setTimeout(function () { doreSay.hidden = true; }, 1600);
      }
    }

    var lastScore = 0, lastLives = null;
    var ctx = {
      stage: stage,
      running: function () { return running; },
      // HUD --------------------------------------------------------------
      score: function (v) {
        var el = root.querySelector('#arc-score');
        el.textContent = v;
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        if (v > lastScore && v > 0 && v % 10 === 0) doreMood('cheer', CHEER[v / 10 % CHEER.length | 0]);
        lastScore = v;
      },
      dore: doreMood,
      lives: function (n) {
        var w = root.querySelector('#arc-lives-wrap'); w.hidden = false;
        root.querySelector('#arc-lives').textContent = n > 0 ? new Array(n + 1).join('♥') : '—';
        if (lastLives != null && n < lastLives) doreMood('ouch', OUCH[Math.floor(Math.random() * OUCH.length)]);
        lastLives = n;
      },
      time: function (s) {
        var w = root.querySelector('#arc-time-wrap'); w.hidden = false;
        root.querySelector('#arc-time').textContent = s;
      },
      // lifecycle --------------------------------------------------------
      end: function (score, label) {
        if (!running) return;
        cleanup();
        var prevBest = A.best(def.id);
        var best = A.record(def.id, score);
        var isBest = score > 0 && score >= best && score > prevBest;
        root.querySelector('#arc-over-h').textContent = 'Score: ' + score;
        root.querySelector('#arc-over-p').innerHTML = (label || '') +
          (score >= best && score > 0 ? ' <b class="arc-newbest">New best!</b>' : '');
        doreMood(isBest ? 'wow' : score > 0 ? 'cheer' : 'ouch', isBest ? 'NEW BEST! 🎉' : null);
        if (isBest) {
          var over = root.querySelector('#arc-over');
          for (var ci = 0; ci < 26; ci++) {
            var sp = h('span', 'arc-confetti', ['🎵', '🎶', '✦', '♪', '★'][ci % 5]);
            sp.style.left = Math.random() * 100 + '%';
            sp.style.animationDelay = (Math.random() * 0.7) + 's';
            sp.style.fontSize = (12 + Math.random() * 14) + 'px';
            over.appendChild(sp);
            (function (el) { setTimeout(function () { el.remove(); }, 3200); })(sp);
          }
        }
        var b = root.querySelector('#arc-best'); if (b) b.textContent = best;
        root.querySelector('#arc-hud-best').textContent = best;
        root.querySelector('#arc-go').textContent = '↻ Play again';
        over.classList.remove('out');
      },
      onStop: function (fn) { ctx._onStop = fn; },
      // managed timers/input ---------------------------------------------
      key: function (fn) {
        var l = function (e) { if (running) fn(e); };
        window.addEventListener('keydown', l); listeners.push([window, 'keydown', l]);
      },
      keyup: function (fn) {
        var l = function (e) { if (running) fn(e); };
        window.addEventListener('keyup', l); listeners.push([window, 'keyup', l]);
      },
      every: function (ms, fn) { var t = setInterval(function () { if (running) fn(); }, ms); intervals.push(t); return t; },
      after: function (ms, fn) { var t = setTimeout(function () { if (running) fn(); }, ms); timeouts.push(t); return t; },
      raf: function (fn) {
        var last = performance.now();
        (function loop(now) {
          if (!running) return;
          fn(Math.min(0.05, (now - last) / 1000), now); last = now;
          rafs.push(requestAnimationFrame(loop));
        })(last);
      },
      // countdown convenience: shows Time in HUD, calls onDone at zero
      countdown: function (seconds, onDone) {
        var left = seconds; ctx.time(left);
        ctx.every(1000, function () { left--; ctx.time(left); if (left <= 0) onDone(); });
      },
      // audio ------------------------------------------------------------
      note: A.note, chord: A.chord, drum: A.drum, hush: A.hush,
      now: A.now, melody: A.melody, playOpening: A.playOpening,
      loadNotation: A.loadNotation, fitRange: A.fitRange,
      // misc -------------------------------------------------------------
      rand: function (n) { return Math.floor(Math.random() * n); },
      pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      },
      el: h
    };

    root.querySelector('#arc-go').addEventListener('click', function () {
      A.ensure();                        // user gesture: unlock audio here
      cleanup();
      lastScore = 0; lastLives = null; doreMood('cheer');
      over.classList.add('out');
      hud.hidden = !!def.toy;
      root.querySelector('#arc-score').textContent = '0';
      running = true;
      def.start(ctx);
    });

    document.title = def.title + ' — Music Games | DoReDog';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', def.desc + ' Free browser music game on DoReDog — no sign-up, works on phones.');
  };

  /* ---- canvas helper for the action games ------------------------------- */
  A.canvas = function (stage, height) {
    var c = document.createElement('canvas');
    var w = Math.max(300, stage.clientWidth), hgt = height || 430;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr; c.height = hgt * dpr;
    c.style.width = '100%'; c.style.height = hgt + 'px';
    stage.appendChild(c);
    var g = c.getContext('2d'); g.scale(dpr, dpr);
    var cv = { el: c, g: g, w: w, h: hgt, parts: [] };
    // shared particle layer: games call cv.burst() on any hit and cv.fx(dt)
    // at the end of their raf, after their own drawing
    cv.burst = function (x, y, color, n) {
      for (var i = 0; i < (n || 14); i++) {
        var a = Math.random() * 6.283, sp = 40 + Math.random() * 160;
        cv.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          life: 0.5 + Math.random() * 0.35, t: 0, color: color, r: 1.5 + Math.random() * 2.5 });
      }
    };
    cv.fx = function (dt) {
      for (var i = cv.parts.length - 1; i >= 0; i--) {
        var p = cv.parts[i]; p.t += dt;
        if (p.t > p.life) { cv.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
        var k = 1 - p.t / p.life;
        g.globalAlpha = k;
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, p.r * k, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    };
    // ambient backdrop: vignette so the play area reads as a stage, not a void
    cv.bg = function () {
      var grad = g.createRadialGradient(w / 2, hgt * 0.35, 60, w / 2, hgt * 0.5, Math.max(w, hgt) * 0.75);
      grad.addColorStop(0, 'rgba(139,107,255,.07)');
      grad.addColorStop(1, 'rgba(0,0,0,.28)');
      g.fillStyle = grad; g.fillRect(0, 0, w, hgt);
    };
    return cv;
  };

  var L = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
  A.letterOf = function (midi) { return L[midi % 12]; };
  A.octOf = function (midi) { return Math.floor(midi / 12) - 1; };
  A.octColor = function (midi) {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--o' + Math.max(2, Math.min(6, A.octOf(midi)))).trim();
    return v || '#7fc4ff';
  };
})();
