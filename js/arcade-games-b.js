/* ============================================================================
   Arcade games, batch B — rhythm, memory, knowledge, and the two toys.
   See js/arcade.js for the shell contract and js/arcade-games-a.js for batch A.
   ========================================================================== */
(function () {
  'use strict';
  var A = DRD.arcade;

  /* 11. ERA DETECTIVE — hear eight seconds, name the century --------------- */
  A.register({
    id: 'era-detective', title: 'Era Detective', icon: '🕰', tag: 'Listening',
    desc: 'Eight seconds of a real piece. Baroque, Classical, Romantic or Ragtime? Ten rounds.',
    help: 'Listen (Space replays), then pick the era. Streaks earn bonus points. Every answer reveals the piece so you can go hear the rest of it.',
    start: function (ctx) {
      var ERAS = ['Baroque', 'Classical', 'Romantic', 'Ragtime'];
      var pool = (DRD.DAILY_POOL || []).map(function (id) {
        return (DRD.SONGS || []).filter(function (s) { return s.id === id; })[0];
      }).filter(function (s) { return s && ERAS.indexOf(s.genre) >= 0; });
      var score = 0, streak = 0, round = 0, cur = null, handle = null;

      var wrap = ctx.el('div', 'arc-center');
      var status = ctx.el('div', 'arc-streak', 'Round 1 of 10');
      var row = ctx.el('div', 'arc-pads arc-pads-grid');
      ERAS.forEach(function (era) {
        var b = ctx.el('button', 'arc-pad', era);
        b.type = 'button';
        b.addEventListener('click', function () { answer(era); });
        row.appendChild(b);
      });
      var rp = ctx.el('button', 'btn btn-ghost arc-replay', '↻ Hear it again (Space)');
      rp.type = 'button'; rp.addEventListener('click', play);
      var reveal = ctx.el('p', 'arc-reveal', '');
      wrap.appendChild(status); wrap.appendChild(row); wrap.appendChild(rp); wrap.appendChild(reveal);
      ctx.stage.appendChild(wrap);

      function play() {
        if (!cur) return;
        if (handle) handle.stop();
        handle = ctx.playOpening(cur.song, cur.nota, 8, 0.9);
      }
      function ask() {
        round++;
        if (round > 10) return ctx.end(score, 'The <a href="timeline.html">timeline</a> walks through every era with examples.');
        status.textContent = 'Round ' + round + ' of 10';
        reveal.textContent = '';
        var era = ERAS[ctx.rand(ERAS.length)];
        var cands = pool.filter(function (s) { return s.genre === era; });
        var song = cands[ctx.rand(cands.length)];
        if (!song) return ask();
        ctx.loadNotation(song.id, function (nota) {
          if (!nota) { pool = pool.filter(function (s) { return s.id !== song.id; }); return ask(); }
          cur = { song: song, nota: nota };
          play();
        });
      }
      function answer(era) {
        if (!cur) return;
        if (handle) handle.stop();
        if (era === cur.song.genre) {
          streak++; score += streak >= 3 ? 2 : 1; ctx.score(score);
          reveal.innerHTML = '✓ <b>' + cur.song.title + '</b> — ' + cur.song.composer;
        } else {
          streak = 0; ctx.drum('clave');
          reveal.innerHTML = '✗ ' + cur.song.genre + ': <b>' + cur.song.title + '</b> — ' + cur.song.composer;
        }
        cur = null;
        ctx.after(1400, ask);
      }
      ctx.key(function (e) { if (e.key === ' ') { e.preventDefault(); play(); } });
      ask();
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

  /* 18. COMPOSER CLUES — who am I? ----------------------------------------- */
  A.register({
    id: 'composer-clues', title: 'Composer Clues', icon: '🎩', tag: 'Knowledge',
    desc: 'Four clues, four names. Guess the composer early and score big. Five rounds.',
    help: 'Read the clue and pick a name, or ask for the next clue. Clue one is worth 8 points, then 6, 4, 2.',
    start: function (ctx) {
      var DATES = (DRD.COMPOSER_DATES || {});
      var count = {}, byName = {};
      (DRD.SONGS || []).forEach(function (s) {
        count[s.composer] = (count[s.composer] || 0) + 1;
        (byName[s.composer] = byName[s.composer] || []).push(s);
      });
      var cands = Object.keys(count).filter(function (n) { return count[n] >= 3 && DATES[n] && DATES[n].b; });
      var round = 0, score = 0, cur = null;

      var wrap = ctx.el('div', 'arc-center');
      var status = ctx.el('div', 'arc-streak', '');
      var clueEl = ctx.el('p', 'arc-clue', '');
      var opts = ctx.el('div', 'arc-pads arc-pads-grid');
      var next = ctx.el('button', 'btn btn-ghost arc-replay', 'Next clue →');
      next.type = 'button'; next.addEventListener('click', function () { moreClue(); });
      wrap.appendChild(status); wrap.appendChild(clueEl); wrap.appendChild(opts); wrap.appendChild(next);
      ctx.stage.appendChild(wrap);

      function cluesFor(name) {
        var d = DATES[name], pieces = byName[name];
        var genres = {};
        pieces.forEach(function (s) { genres[s.genre] = (genres[s.genre] || 0) + 1; });
        var mainGenre = Object.keys(genres).sort(function (a, b) { return genres[b] - genres[a]; })[0];
        var famous = pieces.slice().sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.ds - b.ds; })[0];
        var other = pieces.filter(function (s) { return s !== famous; })[ctx.rand(pieces.length - 1)] || famous;
        return [
          'Most of this composer’s music here is <b>' + mainGenre + '</b>.',
          'They lived <b>' + d.b + '–' + d.d + '</b>.',
          'This library holds <b>' + pieces.length + '</b> of their pieces — one is “' + other.title + '”.',
          'Their best-known piece here is “<b>' + famous.title + '</b>”.'
        ];
      }
      function ask() {
        round++;
        if (round > 5) return ctx.end(score, 'Meet all 435 of them in the <a href="atlas.html">composer atlas</a>.');
        var name = cands[ctx.rand(cands.length)];
        var decoys = ctx.shuffle(cands.filter(function (n) { return n !== name; })).slice(0, 3);
        cur = { name: name, clues: cluesFor(name), ci: 0, worth: [8, 6, 4, 2] };
        status.textContent = 'Round ' + round + ' of 5';
        clueEl.innerHTML = '1/4 · ' + cur.clues[0];
        opts.innerHTML = '';
        ctx.shuffle(decoys.concat([name])).forEach(function (n) {
          var b = ctx.el('button', 'arc-pad arc-pad-wide', n);
          b.type = 'button';
          b.addEventListener('click', function () {
            if (!cur) return;
            if (n === cur.name) {
              var pts = cur.worth[cur.ci]; score += pts; ctx.score(score);
              clueEl.innerHTML = '✓ +' + pts + ' — it was <b>' + cur.name + '</b>';
              var t0 = ctx.now() + 0.05;
              [0, 4, 7, 12].forEach(function (s, i) { ctx.note(60 + s, t0 + i * 0.1, 0.8); });
            } else {
              clueEl.innerHTML = '✗ It was <b>' + cur.name + '</b>';
              ctx.drum('clave');
            }
            cur = null;
            ctx.after(1500, ask);
          });
          opts.appendChild(b);
        });
      }
      function moreClue() {
        if (!cur || cur.ci >= 3) return;
        cur.ci++;
        clueEl.innerHTML = (cur.ci + 1) + '/4 · ' + cur.clues[cur.ci];
      }
      ask();
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
