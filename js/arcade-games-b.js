/* ============================================================================
   Arcade games, batch B — rhythm, memory, knowledge, and the two toys.
   See js/arcade.js for the shell contract and js/arcade-games-a.js for batch A.
   ========================================================================== */
(function () {
  'use strict';
  var A = DRD.arcade;

  /* ---- shared by the two listening games below ---------------------------- */
  // pieces long enough to give a real six-second excerpt, and not the wildest
  function clipPool() {
    var by = {};
    (DRD.SONGS || []).forEach(function (s) {
      if (s.dur >= 20 && s.ds < 85) (by[s.composer] = by[s.composer] || []).push(s);
    });
    return by;
  }
  // "Partita III — V" and "Partita III — VI" are the same work; a "sibling"
  // from the same work would be matching a sound, not a composer
  function workStem(t) { return String(t).split(/ — | – | - |,|\(|:/)[0].trim().toLowerCase(); }
  function songLink(s) {
    return '<a href="song?id=' + encodeURIComponent(s.id) + '" target="_blank" rel="noopener">' + A.esc(s.title) + '</a>';
  }
  /* Load every clip of a round in parallel. A file that fails redraws the
     round; three failures in a row end the run with a plain message rather
     than spinning forever. */
  function loadRound(ctx, songs, onReady, onFail) {
    ctx.loading(true);
    var got = 0, notas = [];
    songs.forEach(function (s, k) {
      ctx.loadNotation(s.id, function (n) {
        notas[k] = n;
        if (++got < songs.length) return;
        ctx.loading(false);
        if (!ctx.running()) return;
        if (notas.some(function (x) { return !x; })) onFail(); else onReady(notas);
      });
    });
  }

  /* 11. ODD ERA OUT — two belong together, one is a time traveller -----------
     Used to ask you to NAME the era from one clip — a history quiz. Now three
     excerpts play and you pick the one that does not belong: pure comparison,
     by ear. Eras come from a hand-checked composer list rather than the
     catalogue's genre field, which has Bach filed as "Classical" in places —
     an answer key has to be right every time. Beethoven and Schubert straddle
     two eras and are left out on purpose. */
  A.register({
    id: 'era-detective', title: 'Odd Era Out', icon: '🕰', tag: 'Listening', scoreKey: 'era-detective@2',
    desc: 'Three short excerpts. Two were written in the same era — one comes from another century. Which one is the time traveller? The eras are revealed after.',
    help: 'Listen to A, B and C (keys 1–3) as often as you like, then pick the one that does not belong. First pick scores 3, second 1. Early rounds are centuries apart; later rounds are neighbours. Eight rounds.',
    start: function (ctx) {
      var ERA = {
        Baroque: ['J. S. Bach', 'G. F. Handel', 'Domenico Scarlatti', 'Henry Purcell', 'Jean-Philippe Rameau', 'Johann Pachelbel', 'François Couperin'],
        Classical: ['W. A. Mozart', 'Joseph Haydn', 'Muzio Clementi', 'Friedrich Kuhlau'],
        Romantic: ['Frédéric Chopin', 'Robert Schumann', 'Johannes Brahms', 'Franz Liszt', 'P. I. Tchaikovsky', 'Edvard Grieg', 'Felix Mendelssohn', 'Friedrich Burgmüller'],
        Ragtime: ['Scott Joplin']
      };
      // [the era two clips share, the odd era]. Ragtime has one composer, so it
      // can only ever be the odd one — the pair must be two different composers.
      var FAR = [['Baroque', 'Romantic'], ['Romantic', 'Baroque'], ['Baroque', 'Ragtime'], ['Classical', 'Ragtime'], ['Romantic', 'Ragtime']];
      var NEAR = [['Baroque', 'Classical'], ['Classical', 'Baroque'], ['Classical', 'Romantic'], ['Romantic', 'Classical']];
      var by = clipPool();
      function comps(era) { return ERA[era].filter(function (c) { return by[c] && by[c].length; }); }
      var round = 0, score = 0, ui = null, cur = null, handle = null, fails = 0, waiting = false;
      function stop() { if (handle) { handle.stop(); handle = null; } }
      function clip(i) { stop(); handle = ctx.playOpening(cur.clips[i].song, cur.clips[i].nota, 6, 0.85); }
      function next() {
        waiting = false;
        stop();
        round++;
        if (round > 8) return ctx.end(score, 'The <a href="timeline.html">timeline</a> walks through every era with pieces you can play from each.');
        ctx.stage.innerHTML = '';
        var pair = ctx.pick(round <= 4 ? FAR : (Math.random() < 0.6 ? NEAR : FAR));
        var two = ctx.shuffle(comps(pair[0])).slice(0, 2);
        var odd = ctx.pick(comps(pair[1]));
        var picks = ctx.shuffle([
          { song: ctx.pick(by[two[0]]), era: pair[0] },
          { song: ctx.pick(by[two[1]]), era: pair[0] },
          { song: ctx.pick(by[odd]), era: pair[1], odd: true }
        ]);
        loadRound(ctx, picks.map(function (p) { return p.song; }), function (notas) {
          fails = 0;
          picks.forEach(function (p, k) { p.nota = notas[k]; });
          cur = { clips: picks };
          ui = A.choices(ctx, {
            count: 3, pickLabel: 'The odd one', maxWrong: 1,
            status: 'Round ' + round + ' of 8 — which one is from another era?',
            onPlay: clip,
            onPick: function (i, wrongSoFar) {
              if (!cur.clips[i].odd) { ctx.drum('clave'); return false; }
              var pts = wrongSoFar ? 1 : 3;
              score += pts; ctx.score(score);
              reveal(pts);
              return true;
            },
            onGiveUp: function () { reveal(0); }
          });
          ctx.stage.appendChild(ui.el);
          ctx.after(250, function () { clip(0); });
        }, function () {
          if (++fails >= 3) return ctx.end(score, 'Could not load the excerpts — check your connection and press R to try again.');
          round--; next();
        });
      }
      function reveal(pts) {
        stop();
        var oddAt = 0;
        cur.clips.forEach(function (c, k) {
          if (c.odd) oddAt = k;
          ui.caption(k, '<b>' + c.era + '</b><br>' + songLink(c.song) + '<br>' + A.esc(c.song.composer));
        });
        ui.markRight(oddAt);
        ui.status.innerHTML = (pts ? '✓ +' + pts + ' — ' : 'Not this time — ') +
          'two ' + cur.clips[(oddAt + 1) % 3].era + ' pieces and one ' + cur.clips[oddAt].era + '.';
        var nx = ctx.el('button', 'btn btn-primary arc-next', 'Next round → <kbd>Enter</kbd>');
        nx.type = 'button';
        nx.addEventListener('click', next);
        ui.el.appendChild(nx);
        waiting = true;
      }
      ctx.key(function (e) {
        if (waiting && e.key === 'Enter') { e.preventDefault(); next(); return; }
        if (ui) ui.key(e);
      });
      ctx.onStop(stop);
      next();
    }
  });

  /* 12. ECHO CHAMBER — Simon on a chord, so it always sounds musical ------- */
  A.register({
    id: 'echo-chamber', title: 'Echo Chamber', icon: '🔁', tag: 'Memory',
    desc: 'Four glowing pads sing a growing melody. Sing it back by ear and memory — how long can you follow?',
    help: 'Watch and listen, then repeat the sequence (pads or keys 1–4). The pads are C, E, G and high C, so every sequence is music. One mistake ends it.',
    start: function (ctx) {
      var PADS = [60, 64, 67, 72], COLS = ['#ff54b2', '#35e08c', '#f6b73f', '#4fa3ff'];
      var seq = [], at = 0, accepting = false, score = 0;
      var wrap = ctx.el('div', 'arc-center');
      var grid = ctx.el('div', 'arc-simon');
      var pads = PADS.map(function (m, i) {
        var b = ctx.el('button', 'arc-simon-pad', '');
        b.type = 'button';
        b.style.background = COLS[i];
        b.addEventListener('pointerdown', function () { press(i); });
        grid.appendChild(b);
        return b;
      });
      wrap.appendChild(grid);
      ctx.stage.appendChild(wrap);

      function flash(i, when) {
        ctx.after(Math.max(0, (when - ctx.now()) * 1000), function () {
          pads[i].classList.add('lit');
          ctx.after(280, function () { pads[i].classList.remove('lit'); });
        });
        ctx.note(PADS[i], when, 0.9);
      }
      function playback() {
        accepting = false; at = 0;
        var t0 = ctx.now() + 0.5;
        seq.forEach(function (i, k) { flash(i, t0 + k * 0.46); });
        ctx.after(500 + seq.length * 460, function () { accepting = true; });
      }
      function grow() { seq.push(ctx.rand(4)); playback(); }
      function press(i) {
        if (!accepting) return;
        flash(i, ctx.now());
        if (i === seq[at]) {
          at++;
          if (at >= seq.length) {
            score = seq.length; ctx.score(score);
            accepting = false;
            ctx.after(650, grow);
          }
        } else {
          ctx.drum('kick');
          ctx.end(score, 'The sequence reached ' + seq.length + '. <a href="melody-detective.html">Melody detective</a> is the next step up.');
        }
      }
      ctx.key(function (e) {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) { e.preventDefault(); press(n - 1); }
      });
      grow();
    }
  });

  /* 13. CLAP BACK — hear a rhythm, tap it back ----------------------------- */
  A.register({
    id: 'clap-back', title: 'Clap Back', icon: '👏', tag: 'Rhythm',
    desc: 'A rhythm claps at you. Clap it back on the spacebar. Eight rounds, each one busier.',
    help: 'Listen to the pattern, wait for the four count-in ticks, then tap it back with Space (or tap the big pad). Hits within the window score; the window shrinks each round.',
    start: function (ctx) {
      var round = 0, score = 0, targets = [], t0 = 0, taken = [], listening = false, win = 0.18;
      var wrap = ctx.el('div', 'arc-center');
      var status = ctx.el('div', 'arc-streak', '');
      var pad = ctx.el('button', 'arc-clap', '👏');
      pad.type = 'button';
      pad.addEventListener('pointerdown', function () { tap(); });
      wrap.appendChild(status); wrap.appendChild(pad);
      ctx.stage.appendChild(wrap);

      function makePattern(n) {
        // n hits on a 16-slot eighth-note grid over two bars at 100 bpm
        var beat = 60 / 100 / 2, slots = ctx.shuffle([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]).slice(0, n - 1);
        slots.push(0);
        slots.sort(function (a, b) { return a - b; });
        return slots.map(function (s) { return s * beat; });
      }
      function playRound() {
        round++;
        if (round > 8) return ctx.end(score, 'Steady hands. The player has a <a href="guide.html">count-in metronome</a> for real pieces.');
        status.textContent = 'Round ' + round + ' of 8 — listen…';
        win = Math.max(0.1, 0.19 - round * 0.01);
        targets = makePattern(Math.min(8, 2 + round));
        taken = []; listening = false;
        var start = ctx.now() + 0.4;
        targets.forEach(function (at) { ctx.drum('snare', start + at); });
        var last = targets[targets.length - 1];
        var cinStart = start + last + 0.7;
        [0, 1, 2, 3].forEach(function (i) { ctx.drum('hat', cinStart + i * 0.6); });
        ctx.after((cinStart + 4 * 0.6 - ctx.now()) * 1000, function () {
          t0 = ctx.now(); listening = true;
          status.textContent = 'Round ' + round + ' — your turn!';
          ctx.after((last + 0.9) * 1000, judge);
        });
      }
      function tap() {
        if (!listening) return;
        ctx.drum('clave', null, 0.9);
        taken.push(ctx.now() - t0);
      }
      function judge() {
        listening = false;
        var hits = 0, used = [];
        targets.forEach(function (at) {
          for (var i = 0; i < taken.length; i++) {
            if (used.indexOf(i) < 0 && Math.abs(taken[i] - at) < win) { used.push(i); hits++; return; }
          }
        });
        var extra = taken.length - used.length;
        var pts = Math.max(0, hits - Math.floor(extra / 2));
        score += pts; ctx.score(score);
        status.textContent = hits + ' of ' + targets.length + ' in time' + (extra > 0 ? ' (' + extra + ' extra)' : '');
        ctx.after(1300, playRound);
      }
      ctx.key(function (e) { if (e.key === ' ') { e.preventDefault(); tap(); } });
      playRound();
    }
  });

  /* 14. TEMPO KEEPER — the metronome stops; you don't ---------------------- */
  A.register({
    id: 'tempo-keeper', title: 'Tempo Keeper', icon: '🫀', tag: 'Rhythm',
    desc: 'Eight clicks set the tempo, then the metronome goes silent. Keep the beat alive — it measures your drift.',
    help: 'Tap Space (or the pad) in time. The first eight beats click; the next eight are yours alone. The closer your silent beats land, the more you score. Five rounds at five tempos.',
    start: function (ctx) {
      var rounds = [72, 96, 120, 84, 132], ri = 0, score = 0;
      var wrap = ctx.el('div', 'arc-center');
      var status = ctx.el('div', 'arc-streak', '');
      var pulse = ctx.el('div', 'arc-pulse', '');
      var pad = ctx.el('button', 'arc-clap', '🫀');
      pad.type = 'button';
      pad.addEventListener('pointerdown', function () { tap(); });
      wrap.appendChild(status); wrap.appendChild(pulse); wrap.appendChild(pad);
      ctx.stage.appendChild(wrap);
      var beat = 0, t0 = 0, taps = [], counting = false;

      function playRound() {
        if (ri >= rounds.length) {
          return ctx.end(score, score >= 400 ? 'A human metronome.' : 'Every player page has a real <a href="guide.html">metronome</a> to train with.');
        }
        var bpm = rounds[ri]; beat = 60 / bpm;
        status.textContent = 'Round ' + (ri + 1) + ' of 5 — ' + bpm + ' bpm. Listen…';
        taps = []; counting = false;
        var start = ctx.now() + 0.5;
        for (var i = 0; i < 8; i++) ctx.drum(i === 0 ? 'kick' : 'hat', start + i * beat);
        ctx.after((start + 7 * beat - ctx.now()) * 1000, function () {
          status.textContent = 'Now you — eight silent beats.';
          t0 = start + 8 * beat; counting = true;
          ctx.after((8.6 * beat) * 1000 + 400, judge);
        });
      }
      function tap() {
        pulse.classList.remove('go'); void pulse.offsetWidth; pulse.classList.add('go');
        if (!counting) return;
        ctx.drum('clave', null, 0.7);
        taps.push(ctx.now());
      }
      function judge() {
        counting = false;
        var pts = 0;
        for (var i = 0; i < 8; i++) {
          var ideal = t0 + i * beat, best = 1e9;
          taps.forEach(function (tp) { best = Math.min(best, Math.abs(tp - ideal)); });
          if (best < beat / 2) pts += Math.max(0, Math.round(25 * (1 - best / (beat / 2))));
        }
        score += pts; ctx.score(score);
        status.textContent = '+' + pts + ' (of 200 possible)';
        ri++;
        ctx.after(1500, playRound);
      }
      ctx.key(function (e) { if (e.key === ' ') { e.preventDefault(); tap(); } });
      playRound();
    }
  });

  /* 15. MELODY MIX-UP — reassemble a famous tune --------------------------- */
  A.register({
    id: 'melody-mixup', title: 'Melody Mix-up', icon: '🧩', tag: 'Puzzle',
    desc: 'A famous melody, chopped into four pieces and shuffled. Listen and put it back together.',
    help: 'Play each fragment, then click two fragments to swap them. When you think the order is right, lock it in. Fewer wrong locks, more points.',
    start: function (ctx) {
      ctx.melody({ min: 24, max: 24, keepRepeats: true }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var chunks = [0, 1, 2, 3].map(function (i) { return mel.slice(i * 6, i * 6 + 6); });
        var order = ctx.shuffle([0, 1, 2, 3]);
        if (order.join('') === '0123') order = [1, 0, 2, 3];
        var sel = -1, points = 10, played = [];

        var wrap = ctx.el('div', 'arc-center');
        var row = ctx.el('div', 'arc-pads');
        var status = ctx.el('div', 'arc-streak', 'Rebuild the melody — 10 points on the table');
        function paint() {
          row.innerHTML = '';
          order.forEach(function (ci, pos) {
            var b = ctx.el('button', 'arc-pad arc-chunk' + (pos === sel ? ' picked' : ''), '▶<span>' + 'ABCD'[ci] + '</span>');
            b.type = 'button';
            b.addEventListener('click', function () {
              ctx.hush(played);
              var t0 = ctx.now() + 0.05;
              chunks[ci].forEach(function (m, k) { played.push(ctx.note(m, t0 + k * 0.3, 0.9)); });
              if (sel === -1) { sel = pos; }
              else if (sel === pos) { sel = -1; }
              else { var t = order[sel]; order[sel] = order[pos]; order[pos] = t; sel = -1; }
              paint();
            });
            row.appendChild(b);
          });
        }
        var lock = ctx.el('button', 'btn btn-primary', 'Lock it in');
        lock.type = 'button';
        lock.addEventListener('click', function () {
          if (order.join('') === '0123') {
            ctx.score(points);
            ctx.hush(played);
            var t0 = ctx.now() + 0.1;
            mel.forEach(function (m, k) { played.push(ctx.note(m, t0 + k * 0.28, 0.9)); });
            ctx.after(mel.length * 280 + 400, function () {
              ctx.end(points, 'It was <b>' + song.title + '</b> — ' + song.composer + '. <a href="song?id=' + song.id + '">Learn the whole piece</a>.');
            });
          } else {
            points = Math.max(2, points - 2);
            status.textContent = 'Not yet — ' + points + ' points still on the table';
            ctx.drum('clave');
          }
        });
        wrap.appendChild(status); wrap.appendChild(row); wrap.appendChild(lock);
        ctx.stage.appendChild(wrap);
        paint();
      });
    }
  });

  /* 16. NAME THAT TUNE — fewer notes, more glory --------------------------- */
  A.register({
    id: 'name-that-tune', title: 'Name That Tune', icon: '🎼', tag: 'Knowledge',
    desc: 'Three notes of a famous piece. Know it already? Every extra note you ask for costs points. Ten rounds.',
    help: 'Listen, then pick the title. Naming it on three notes scores 9; each extra note (Space or the button) costs one. A wrong pick ends the round.',
    start: function (ctx) {
      var round = 0, score = 0, cur = null, played = [];
      var wrap = ctx.el('div', 'arc-center');
      var status = ctx.el('div', 'arc-streak', '');
      var opts = ctx.el('div', 'arc-pads arc-pads-col');
      var more = ctx.el('button', 'btn btn-ghost arc-replay', '+ One more note (Space)');
      more.type = 'button'; more.addEventListener('click', reveal);
      wrap.appendChild(status); wrap.appendChild(opts); wrap.appendChild(more);
      ctx.stage.appendChild(wrap);

      function play() {
        if (!cur) return;
        ctx.hush(played);
        var t0 = ctx.now() + 0.05;
        cur.mel.slice(0, cur.shown).forEach(function (m, k) { played.push(ctx.note(m, t0 + k * 0.42, 0.9)); });
      }
      function reveal() {
        if (!cur || cur.shown >= 9) return;
        cur.shown++;
        play();
      }
      function ask() {
        round++;
        if (round > 10) return ctx.end(score, 'All of these live in the <a href="daily.html">melody of the day</a> pool.');
        status.textContent = 'Round ' + round + ' of 10';
        opts.innerHTML = '';
        ctx.melody({ min: 9, max: 9 }, function (mel, song) {
          if (!mel) return ctx.end(score, 'Ran out of melodies.');
          cur = { mel: mel, song: song, shown: 3 };
          var wrong = ctx.shuffle((DRD.DAILY_POOL || []).filter(function (id) { return id !== song.id; })).slice(0, 3)
            .map(function (id) { return ((DRD.SONGS || []).filter(function (s) { return s.id === id; })[0] || { title: id }).title; });
          ctx.shuffle(wrong.concat([song.title])).forEach(function (title) {
            var b = ctx.el('button', 'arc-pad arc-pad-wide', title);
            b.type = 'button';
            b.addEventListener('click', function () {
              if (!cur) return;
              if (title === cur.song.title) {
                var pts = 12 - cur.shown; score += pts; ctx.score(score);
                status.innerHTML = '✓ +' + pts + ' — <b>' + cur.song.title + '</b>';
              } else {
                status.innerHTML = '✗ It was <b>' + cur.song.title + '</b> — ' + cur.song.composer;
                ctx.drum('clave');
              }
              cur = null;
              ctx.after(1400, ask);
            });
            opts.appendChild(b);
          });
          play();
        });
      }
      ctx.key(function (e) { if (e.key === ' ') { e.preventDefault(); reveal(); } });
      ask();
    }
  });

  /* 17. NOTLE — Wordle, but the word is a melody --------------------------- */
  A.register({
    id: 'notle', title: 'Notle', icon: '🟩', tag: 'Puzzle',
    desc: 'Wordle, but the secret is five notes of a real piece. Hear it, guess it, six tries.',
    help: 'The five-note melody plays (Space replays). Tap keys to fill a row of five; it checks automatically. Green = right note, right place. Yellow = in the melody, wrong place. It is all inside one octave.',
    start: function (ctx) {
      ctx.melody({ min: 5, max: 5, lo: 60, hi: 71 }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var secret = mel.map(function (m) { return m % 12; });
        var rowsEl = ctx.el('div', 'arc-notle');
        var rows = [];
        for (var r = 0; r < 6; r++) {
          var row = ctx.el('div', 'arc-notle-row');
          var cells = [];
          for (var c = 0; c < 5; c++) { var cell = ctx.el('span', 'arc-notle-cell', ''); row.appendChild(cell); cells.push(cell); }
          rowsEl.appendChild(row); rows.push(cells);
        }
        ctx.stage.appendChild(rowsEl);
        var keysWrap = ctx.el('div', 'arc-keys-wrap');
        ctx.stage.appendChild(keysWrap);
        var rp = ctx.el('button', 'btn btn-ghost arc-replay', '↻ Hear the melody (Space)');
        rp.type = 'button'; rp.addEventListener('click', playSecret);
        ctx.stage.appendChild(rp);

        var guess = [], row = 0, played = [];
        function playSecret() {
          ctx.hush(played);
          var t0 = ctx.now() + 0.05;
          mel.forEach(function (m, k) { played.push(ctx.note(m, t0 + k * 0.42, 0.9)); });
        }
        // buildPiano hands its callback (freq, keyEl, oct, midi) — midi is FOURTH
        DRD.buildPiano(keysWrap, [4, 4], function (freq, k, oct, midi) {
          if (row >= 6 || guess.length >= 5) return;
          guess.push(midi % 12);
          rows[row][guess.length - 1].textContent = A.letterOf(midi);
          rows[row][guess.length - 1].style.color = A.octColor(midi);
          if (guess.length === 5) ctx.after(250, check);
        });
        function check() {
          var pool = secret.slice(), marks = [0, 0, 0, 0, 0];
          for (var i = 0; i < 5; i++) if (guess[i] === secret[i]) { marks[i] = 2; pool[pool.indexOf(guess[i])] = -1; }
          for (i = 0; i < 5; i++) if (marks[i] === 0 && pool.indexOf(guess[i]) >= 0) { marks[i] = 1; pool[pool.indexOf(guess[i])] = -1; }
          marks.forEach(function (m, k) {
            rows[row][k].classList.add(m === 2 ? 'good' : m === 1 ? 'near' : 'off');
          });
          if (marks.join('') === '22222') {
            var pts = (6 - row) * 10; ctx.score(pts);
            playSecret();
            return ctx.end(pts, 'It was <b>' + song.title + '</b> — ' + song.composer + '. <a href="song?id=' + song.id + '">Play the whole piece</a>.');
          }
          row++; guess = [];
          if (row >= 6) {
            playSecret();
            return ctx.end(0, 'It was <b>' + song.title + '</b> — ' + song.composer + '. <a href="song?id=' + song.id + '">Hear the whole piece</a>.');
          }
        }
        ctx.key(function (e) { if (e.key === ' ') { e.preventDefault(); playSecret(); } });
        playSecret();
      });
    }
  });

  /* 18. SOUND-ALIKE — find the other piece by the same composer --------------
     Used to be Composer Clues: four written hints and four names — trivia.
     Now a mystery excerpt plays and one of three others shares its composer.
     You find it by hearing texture, rhythm and the way the harmony moves; the
     names arrive only when the round is over. */
  A.register({
    id: 'composer-clues', title: 'Sound-alike', icon: '👯', tag: 'Listening', scoreKey: 'composer-clues@2',
    desc: 'A mystery excerpt plays. Three more follow — exactly one was written by the same composer. Find it by ear. Names are revealed after.',
    help: 'Hear the mystery (Space), then listen to A, B and C (keys 1–3) as often as you like and pick the one by the same composer. First pick scores 3, second 1. Early rounds set three very different composers side by side; later ones put neighbours together. Eight rounds.',
    start: function (ctx) {
      var GROUPS = {
        baroque: ['J. S. Bach', 'G. F. Handel', 'Domenico Scarlatti'],
        classical: ['W. A. Mozart', 'Joseph Haydn'],
        romantic: ['Frédéric Chopin', 'Robert Schumann', 'Johannes Brahms', 'Franz Schubert', 'Friedrich Burgmüller'],
        ragtime: ['Scott Joplin'],
        modern: ['Erik Satie', 'Claude Debussy']
      };
      var groupOf = {};
      Object.keys(GROUPS).forEach(function (g) { GROUPS[g].forEach(function (c) { groupOf[c] = g; }); });
      var all = clipPool(), by = {};
      Object.keys(groupOf).forEach(function (c) { if (all[c] && all[c].length >= 2) by[c] = all[c]; });
      var names = Object.keys(by);
      var round = 0, score = 0, ui = null, cur = null, handle = null, fails = 0, waiting = false;
      function stop() { if (handle) { handle.stop(); handle = null; } }
      function clip(i) { stop(); handle = ctx.playOpening(cur.clips[i].song, cur.clips[i].nota, 6, 0.85); }

      function draw() {
        var a = ctx.pick(names), d1, d2;
        if (round <= 4) {                           // three different worlds
          var far = names.filter(function (c) { return groupOf[c] !== groupOf[a]; });
          d1 = ctx.pick(far);
          var far2 = far.filter(function (c) { return groupOf[c] !== groupOf[d1]; });
          d2 = ctx.pick(far2.length ? far2 : far.filter(function (c) { return c !== d1; }));
        } else {                                     // a neighbour sneaks in
          var near = names.filter(function (c) { return c !== a && groupOf[c] === groupOf[a]; });
          d1 = near.length ? ctx.pick(near) : ctx.pick(names.filter(function (c) { return c !== a; }));
          d2 = ctx.pick(names.filter(function (c) { return c !== a && c !== d1; }));
        }
        var mine = ctx.shuffle(by[a]), mystery = mine[0];
        var sibling = mine.filter(function (s) { return workStem(s.title) !== workStem(mystery.title); })[0] || mine[1];
        return {
          mystery: mystery,
          opts: ctx.shuffle([{ song: sibling, same: true }, { song: ctx.pick(by[d1]) }, { song: ctx.pick(by[d2]) }])
        };
      }
      function next() {
        waiting = false;
        stop();
        round++;
        if (round > 8) return ctx.end(score, 'Meet all 435 composers — and hear them side by side — in the <a href="atlas.html">composer atlas</a>.');
        ctx.stage.innerHTML = '';
        var r = draw();
        var songs = [r.mystery].concat(r.opts.map(function (o) { return o.song; }));
        loadRound(ctx, songs, function (notas) {
          fails = 0;
          cur = {
            clips: songs.map(function (s, k) { return { song: s, nota: notas[k] }; }),   // [0] = mystery
            opts: r.opts
          };
          ui = A.choices(ctx, {
            count: 3, pickLabel: 'Same composer', maxWrong: 1,
            status: 'Round ' + round + ' of 8 — which one shares the mystery’s composer?',
            mysteryLabel: 'Hear the mystery',
            onMystery: function () { clip(0); },
            onPlay: function (i) { clip(i + 1); },
            onPick: function (i, wrongSoFar) {
              if (!cur.opts[i].same) { ctx.drum('clave'); return false; }
              var pts = wrongSoFar ? 1 : 3;
              score += pts; ctx.score(score);
              reveal(pts);
              return true;
            },
            onGiveUp: function () { reveal(0); }
          });
          ctx.stage.appendChild(ui.el);
          ctx.after(250, function () { clip(0); });
        }, function () {
          if (++fails >= 3) return ctx.end(score, 'Could not load the excerpts — check your connection and press R to try again.');
          round--; next();
        });
      }
      function reveal(pts) {
        stop();
        var at = 0;
        cur.opts.forEach(function (o, k) {
          if (o.same) at = k;
          ui.caption(k, '<b>' + A.esc(o.song.composer) + '</b><br>' + songLink(o.song));
        });
        ui.markRight(at);
        ui.status.innerHTML = (pts ? '✓ +' + pts + ' — ' : 'Not this time — ') +
          'the mystery was ' + songLink(cur.clips[0].song) + ' by <b>' + A.esc(cur.clips[0].song.composer) + '</b>.';
        var nx = ctx.el('button', 'btn btn-primary arc-next', 'Next round → <kbd>Enter</kbd>');
        nx.type = 'button';
        nx.addEventListener('click', next);
        ui.el.appendChild(nx);
        waiting = true;
      }
      ctx.key(function (e) {
        if (waiting && e.key === 'Enter') { e.preventDefault(); next(); return; }
        if (ui) ui.key(e);
      });
      ctx.onStop(stop);
      next();
    }
  });

  /* 19. TONE GRID — the ToneMatrix, pointed at our pentatonic -------------- */
  A.register({
    id: 'tone-grid', title: 'Tone Grid', icon: '🌌', tag: 'Toy', toy: true,
    desc: 'A glowing loop grid where everything you draw sounds good. No rules, no score — just patterns.',
    help: 'Tap cells to light them. The playhead sweeps left to right forever; lit cells sing. Pentatonic scale, so there are no wrong answers. Share button copies your pattern as a link.',
    start: function (ctx) {
      var ROWS = 10, COLS = 16;
      var SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];   // C pentatonic, two octaves
      var grid = [], playing = true, tempo = 120, col = 0, nextTime = 0;
      for (var r = 0; r < ROWS; r++) { grid.push(new Array(COLS).fill(false)); }

      // pattern from the URL, if someone shared one
      var m = location.hash.match(/tg=([0-9a-z.]+)/);
      if (m) {
        m[1].split('.').forEach(function (mask, r) {
          if (r >= ROWS) return;
          var bits = parseInt(mask, 36) || 0;
          for (var c = 0; c < COLS; c++) grid[r][c] = !!(bits & (1 << c));
        });
      }

      var wrap = ctx.el('div', 'arc-grid-wrap');
      var table = ctx.el('div', 'arc-grid');
      table.style.gridTemplateColumns = 'repeat(' + COLS + ', 1fr)';
      var cells = [];
      for (r = 0; r < ROWS; r++) {
        cells.push([]);
        for (var c = 0; c < COLS; c++) {
          (function (r, c) {
            var b = ctx.el('button', 'arc-cell' + (grid[r][c] ? ' on' : ''), '');
            b.type = 'button';
            b.addEventListener('pointerdown', function () {
              grid[r][c] = !grid[r][c];
              b.classList.toggle('on', grid[r][c]);
              if (grid[r][c]) ctx.note(SCALE[ROWS - 1 - r], null, 0.5);
            });
            table.appendChild(b); cells[r].push(b);
          })(r, c);
        }
      }
      var bar = ctx.el('div', 'arc-toy-bar');
      var tempoLab = ctx.el('span', 'arc-toy-lab', tempo + ' bpm');
      var slider = ctx.el('input', 'arc-toy-slider');
      slider.type = 'range'; slider.min = 60; slider.max = 180; slider.value = tempo;
      slider.addEventListener('input', function () { tempo = +slider.value; tempoLab.textContent = tempo + ' bpm'; });
      var clear = ctx.el('button', 'btn btn-ghost', 'Clear');
      clear.type = 'button';
      clear.addEventListener('click', function () {
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { grid[r][c] = false; cells[r][c].classList.remove('on'); }
      });
      var rnd = ctx.el('button', 'btn btn-ghost', 'Surprise me');
      rnd.type = 'button';
      rnd.addEventListener('click', function () {
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          grid[r][c] = Math.random() < 0.12; cells[r][c].classList.toggle('on', grid[r][c]);
        }
      });
      var share = ctx.el('button', 'btn btn-ghost', 'Share');
      share.type = 'button';
      share.addEventListener('click', function () {
        var enc = grid.map(function (row) {
          var bits = 0; row.forEach(function (v, c) { if (v) bits |= (1 << c); });
          return bits.toString(36);
        }).join('.');
        var url = location.origin + location.pathname + '?g=tone-grid#tg=' + enc;
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
          function () { share.textContent = 'Copied!'; setTimeout(function () { share.textContent = 'Share'; }, 1500); },
          function () { prompt('Copy your pattern link:', url); }
        );
      });
      bar.appendChild(tempoLab); bar.appendChild(slider); bar.appendChild(clear); bar.appendChild(rnd); bar.appendChild(share);
      wrap.appendChild(table); wrap.appendChild(bar);
      ctx.stage.appendChild(wrap);

      nextTime = ctx.now() + 0.1;
      ctx.every(30, function () {
        var ahead = ctx.now() + 0.12;
        while (nextTime < ahead) {
          var stepDur = 60 / tempo / 2;
          for (var r = 0; r < ROWS; r++) if (grid[r][col]) ctx.note(SCALE[ROWS - 1 - r], nextTime, 0.55);
          (function (c) {
            ctx.after(Math.max(0, (nextTime - ctx.now()) * 1000), function () {
              for (var r = 0; r < ROWS; r++) {
                cells[r][c].classList.add('lit');
                (function (r) { ctx.after(stepDur * 900, function () { cells[r][c].classList.remove('lit'); }); })(r);
              }
            });
          })(col);
          col = (col + 1) % COLS;
          nextTime += stepDur;
        }
      });
      ctx.onStop(function () { playing = false; });
    }
  });

  /* 20. BEAT LAB — a pocket drum machine ----------------------------------- */
  A.register({
    id: 'beat-lab', title: 'Beat Lab', icon: '🥁', tag: 'Toy', toy: true,
    desc: 'Kick, snare, hat, clave on a sixteen-step loop. Build a groove, swing it, share it.',
    help: 'Tap steps to build a beat — four rows: kick, snare, hi-hat, clave. Swing pushes every second step late, like a human would. Share copies your groove as a link.',
    start: function (ctx) {
      var KITS = ['kick', 'snare', 'hat', 'clave'], LABELS = ['🦶 Kick', '🥁 Snare', '🎩 Hat', '🪵 Clave'];
      var COLS = 16, grid = [], tempo = 100, swing = 0, col = 0, nextTime = 0;
      KITS.forEach(function () { grid.push(new Array(COLS).fill(false)); });
      // a starter groove so it makes sound within one tap of Play
      grid[0][0] = grid[0][8] = true; grid[1][4] = grid[1][12] = true;
      for (var c = 0; c < COLS; c += 2) grid[2][c] = true;

      var m = location.hash.match(/bl=([0-9a-z.]+)/);
      if (m) {
        m[1].split('.').forEach(function (mask, r) {
          if (r >= 4) return;
          var bits = parseInt(mask, 36) || 0;
          for (var c = 0; c < COLS; c++) grid[r][c] = !!(bits & (1 << c));
        });
      }

      var wrap = ctx.el('div', 'arc-grid-wrap');
      var cells = [];
      KITS.forEach(function (_, r) {
        var rowEl = ctx.el('div', 'arc-beat-row');
        rowEl.appendChild(ctx.el('span', 'arc-toy-lab arc-beat-lab', LABELS[r]));
        var line = ctx.el('div', 'arc-grid arc-beat-line');
        line.style.gridTemplateColumns = 'repeat(' + COLS + ', 1fr)';
        cells.push([]);
        for (var c = 0; c < COLS; c++) {
          (function (r, c) {
            var b = ctx.el('button', 'arc-cell' + (grid[r][c] ? ' on' : '') + (c % 4 === 0 ? ' bar' : ''), '');
            b.type = 'button';
            b.addEventListener('pointerdown', function () {
              grid[r][c] = !grid[r][c];
              b.classList.toggle('on', grid[r][c]);
              if (grid[r][c]) ctx.drum(KITS[r]);
            });
            line.appendChild(b); cells[r].push(b);
          })(r, c);
        }
        rowEl.appendChild(line);
        wrap.appendChild(rowEl);
      });
      var bar = ctx.el('div', 'arc-toy-bar');
      var tempoLab = ctx.el('span', 'arc-toy-lab', tempo + ' bpm');
      var slider = ctx.el('input', 'arc-toy-slider');
      slider.type = 'range'; slider.min = 70; slider.max = 160; slider.value = tempo;
      slider.addEventListener('input', function () { tempo = +slider.value; tempoLab.textContent = tempo + ' bpm'; });
      var swLab = ctx.el('span', 'arc-toy-lab', 'swing 0%');
      var sw = ctx.el('input', 'arc-toy-slider');
      sw.type = 'range'; sw.min = 0; sw.max = 60; sw.value = 0;
      sw.addEventListener('input', function () { swing = +sw.value; swLab.textContent = 'swing ' + swing + '%'; });
      var rnd = ctx.el('button', 'btn btn-ghost', 'Surprise me');
      rnd.type = 'button';
      rnd.addEventListener('click', function () {
        for (var r = 0; r < 4; r++) for (var c = 0; c < COLS; c++) {
          grid[r][c] = Math.random() < [0.28, 0.22, 0.5, 0.12][r] && !(r === 0 && c % 2);
          cells[r][c].classList.toggle('on', grid[r][c]);
        }
        grid[0][0] = true; cells[0][0].classList.add('on');
      });
      var share = ctx.el('button', 'btn btn-ghost', 'Share');
      share.type = 'button';
      share.addEventListener('click', function () {
        var enc = grid.map(function (row) {
          var bits = 0; row.forEach(function (v, c) { if (v) bits |= (1 << c); });
          return bits.toString(36);
        }).join('.');
        var url = location.origin + location.pathname + '?g=beat-lab#bl=' + enc;
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
          function () { share.textContent = 'Copied!'; setTimeout(function () { share.textContent = 'Share'; }, 1500); },
          function () { prompt('Copy your groove link:', url); }
        );
      });
      bar.appendChild(tempoLab); bar.appendChild(slider);
      bar.appendChild(swLab); bar.appendChild(sw);
      bar.appendChild(rnd); bar.appendChild(share);
      wrap.appendChild(bar);
      ctx.stage.appendChild(wrap);

      nextTime = ctx.now() + 0.1;
      ctx.every(30, function () {
        var ahead = ctx.now() + 0.12;
        while (nextTime < ahead) {
          var stepDur = 60 / tempo / 4;
          var late = (col % 2 === 1) ? stepDur * (swing / 100) : 0;
          for (var r = 0; r < 4; r++) if (grid[r][col]) ctx.drum(KITS[r], nextTime + late);
          (function (c) {
            ctx.after(Math.max(0, (nextTime - ctx.now()) * 1000), function () {
              for (var r = 0; r < 4; r++) {
                cells[r][c].classList.add('lit');
                (function (r) { ctx.after(stepDur * 900, function () { cells[r][c].classList.remove('lit'); }); })(r);
              }
            });
          })(col);
          col = (col + 1) % COLS;
          nextTime += stepDur;
        }
      });
    }
  });
})();
