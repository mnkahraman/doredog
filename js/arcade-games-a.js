/* ============================================================================
   Arcade games, batch A — action and ear games.
   Every melody is a real piece from the catalogue, so a round can end with
   "that was Für Elise — go learn it". See js/arcade.js for the shell contract.
   ========================================================================== */
(function () {
  'use strict';
  var A = DRD.arcade;

  /* 1. LETTER RAIN — our letter notation as a typing game ------------------ */
  A.register({
    id: 'letter-rain', title: 'Letter Rain', icon: '🌧', tag: 'Action',
    desc: 'The letters of a real melody fall from the sky. Type them before they land — and you are playing the piece.',
    help: 'Type the lowest falling letter on your keyboard (c d e f g a b — hold Shift for a sharp). On a phone, tap the letter buttons. Three misses and the rain stops.',
    start: function (ctx) {
      ctx.melody({ min: 24, max: 200, keepRepeats: true }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var cv = A.canvas(ctx.stage, 380);
        var pads = ctx.el('div', 'arc-pads');
        'c d e f g a b'.split(' ').forEach(function (l) {
          var b = ctx.el('button', 'arc-pad', l);
          b.type = 'button';
          b.addEventListener('click', function () { hit(l); });
          pads.appendChild(b);
        });
        ctx.stage.appendChild(pads);

        var drops = [], next = 0, score = 0, miss = 0, speed = 42, spawnGap = 1.5, sinceSpawn = 9;
        ctx.lives(3 - miss);

        function spawn() {
          if (next >= mel.length) next = 0;                    // loop the piece
          var m = mel[next++];
          drops.push({ midi: m, letter: A.letterOf(m), x: 30 + Math.random() * (cv.w - 60), y: -16 });
        }
        function hit(letter) {
          var low = null, li = -1;
          for (var i = 0; i < drops.length; i++) if (!low || drops[i].y > low.y) { low = drops[i]; li = i; }
          if (!low) return;
          if (low.letter.toLowerCase() === letter.toLowerCase() &&
              (low.letter === low.letter.toLowerCase()) === (letter === letter.toLowerCase())) {
            drops.splice(li, 1);
            cv.burst(low.x, low.y, A.octColor(low.midi));
            ctx.note(low.midi, null, 0.9);
            score++; ctx.score(score);
            if (score % 12 === 0) { speed += 7; spawnGap = Math.max(0.55, spawnGap - 0.1); }
          } else {
            ctx.drum('clave');
          }
        }
        ctx.key(function (e) {
          if (e.key.length !== 1) return;
          var k = e.key;
          if ('abcdefg'.indexOf(k.toLowerCase()) < 0) return;
          e.preventDefault();
          hit(e.shiftKey ? k.toUpperCase() : k.toLowerCase());
        });

        ctx.raf(function (dt) {
          sinceSpawn += dt;
          if (sinceSpawn > spawnGap) { sinceSpawn = 0; spawn(); }
          var g = cv.g;
          g.clearRect(0, 0, cv.w, cv.h);
          cv.bg();
          g.font = '600 26px "IBM Plex Mono", monospace';
          g.textAlign = 'center';
          for (var i = drops.length - 1; i >= 0; i--) {
            var d = drops[i]; d.y += speed * dt;
            g.shadowColor = A.octColor(d.midi); g.shadowBlur = 14;
            g.fillStyle = A.octColor(d.midi);
            g.fillText(d.letter, d.x, d.y);
            g.shadowBlur = 0;
            if (d.y > cv.h - 8) {
              drops.splice(i, 1); miss++; ctx.lives(3 - miss); ctx.drum('kick');
              if (miss >= 3) ctx.end(score, 'That was <b>' + song.title + '</b> — <a href="song?id=' + song.id + '">go learn the whole piece</a>.');
            }
          }
          var fl = g.createLinearGradient(0, 0, cv.w, 0);
          fl.addColorStop(0, 'rgba(139,107,255,.0)'); fl.addColorStop(0.5, 'rgba(139,107,255,.5)'); fl.addColorStop(1, 'rgba(139,107,255,.0)');
          g.fillStyle = fl; g.fillRect(0, cv.h - 3, cv.w, 3);
          cv.fx(dt);
        });
      });
    }
  });

  /* 2. MELODY TILES — Piano Tiles on real repertoire ----------------------- */
  A.register({
    id: 'melody-tiles', title: 'Melody Tiles', icon: '🎹', tag: 'Action',
    desc: 'Tap the black tiles as they fall and a real piece plays itself under your fingers. Miss one and it ends.',
    help: 'Four lanes: D F J K on your keyboard, or tap. Hit the tile while it crosses the bright strike line. Every hit plays the next note of the melody.',
    start: function (ctx) {
      ctx.melody({ min: 24, max: 400, keepRepeats: true }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var cv = A.canvas(ctx.stage, 430);
        var KEYSET = ['d', 'f', 'j', 'k'];
        var laneW = cv.w / 4, tileH = 64, strikeY = cv.h - 78;
        var LANE_COLORS = ['#ff54b2', '#35e08c', '#f6b73f', '#4fa3ff'];
        var tiles = [], next = 0, score = 0, speed = 150, t = 0, sinceSpawn = 9, gap = 0.62;
        var flash = [0, 0, 0, 0];

        var padRow = ctx.el('div', 'arc-lanes');
        KEYSET.forEach(function (k, i) {
          var b = ctx.el('button', 'arc-lane-btn', k.toUpperCase());
          b.type = 'button';
          b.addEventListener('click', function () { strike(i); });
          padRow.appendChild(b);
        });
        ctx.stage.appendChild(padRow);

        function spawn() {
          if (next >= mel.length) next = 0;
          var m = mel[next++];
          // pitch decides the lane, so runs sweep across the board like the real hand
          var lane = Math.max(0, Math.min(3, Math.floor((m - 48) / 9)));
          tiles.push({ lane: lane, y: -tileH, midi: m, hit: false });
        }
        function strike(lane) {
          var best = null;
          for (var i = 0; i < tiles.length; i++) {
            var tl = tiles[i];
            if (tl.hit || tl.lane !== lane) continue;
            if (tl.y + tileH > strikeY - 30 && tl.y < strikeY + 46) { best = tl; break; }
          }
          if (best) {
            best.hit = true;
            flash[lane] = 0.18;
            cv.burst(lane * laneW + laneW / 2, strikeY, LANE_COLORS[lane], 16);
            ctx.note(best.midi, null, 0.9);
            score++; ctx.score(score);
            if (score % 16 === 0) { speed += 16; gap = Math.max(0.32, gap - 0.04); }
          } else {
            ctx.drum('kick');
            ctx.end(score, 'Wrong lane. That was <b>' + song.title + '</b> — <a href="song?id=' + song.id + '">learn it for real</a>.');
          }
        }
        ctx.key(function (e) {
          var i = KEYSET.indexOf(e.key.toLowerCase());
          if (i >= 0) { e.preventDefault(); strike(i); }
        });

        ctx.raf(function (dt) {
          t += dt; sinceSpawn += dt;
          if (sinceSpawn > gap) { sinceSpawn = 0; spawn(); }
          var g = cv.g;
          g.clearRect(0, 0, cv.w, cv.h);
          cv.bg();
          for (var l = 0; l < 4; l++) {
            if (flash[l] > 0) {
              flash[l] -= dt;
              g.globalAlpha = Math.max(0, flash[l] / 0.18) * 0.5;
              g.fillStyle = LANE_COLORS[l];
              g.fillRect(l * laneW, 0, laneW, cv.h);
              g.globalAlpha = 1;
            }
            if (l) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(l * laneW, 0, 1, cv.h); }
          }
          g.shadowColor = 'rgba(246,183,63,.9)'; g.shadowBlur = 10;
          g.fillStyle = 'rgba(246,183,63,.75)'; g.fillRect(0, strikeY, cv.w, 2);
          g.shadowBlur = 0;
          for (var i = tiles.length - 1; i >= 0; i--) {
            var tl = tiles[i]; tl.y += speed * dt;
            if (tl.hit) { tiles.splice(i, 1); continue; }
            var tg = g.createLinearGradient(0, tl.y, 0, tl.y + tileH);
            tg.addColorStop(0, '#f4f2fa'); tg.addColorStop(1, '#c9c5d8');
            g.fillStyle = tg;
            g.beginPath();
            g.roundRect(tl.lane * laneW + 5, tl.y, laneW - 10, tileH, 8);
            g.fill();
            g.fillStyle = LANE_COLORS[tl.lane];
            g.fillRect(tl.lane * laneW + 5, tl.y + tileH - 5, laneW - 10, 5);
            if (tl.y > cv.h) {
              ctx.end(score, 'A tile got away. That was <b>' + song.title + '</b> — <a href="song?id=' + song.id + '">learn it for real</a>.');
              return;
            }
          }
          cv.fx(dt);
        });
      });
    }
  });

  /* 3. NOTE CATCH — move the basket, catch the melody in order ------------- */
  A.register({
    id: 'note-catch', title: 'Note Catch', icon: '🧺', tag: 'Action',
    desc: 'Golden notes fall — catch them and the melody assembles itself. Grey notes are wrong; let them pass.',
    help: 'Move with ← → (or tap left/right half of the board). Catch the gold notes: each one is the next note of a real piece. Grey notes are decoys — catching one costs a life.',
    start: function (ctx) {
      ctx.melody({ min: 16, max: 120 }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var cv = A.canvas(ctx.stage, 400);
        var bx = cv.w / 2, bw = 84, drops = [], next = 0, score = 0, lives = 3;
        var speed = 90, gap = 1.25, since = 9, left = false, right = false;
        ctx.lives(lives);

        cv.el.addEventListener('pointerdown', function (e) {
          var r = cv.el.getBoundingClientRect();
          if (e.clientX - r.left < r.width / 2) { left = true; } else { right = true; }
        });
        cv.el.addEventListener('pointerup', function () { left = right = false; });
        ctx.key(function (e) {
          if (e.key === 'ArrowLeft') { left = true; e.preventDefault(); }
          if (e.key === 'ArrowRight') { right = true; e.preventDefault(); }
        });
        ctx.keyup(function (e) {
          if (e.key === 'ArrowLeft') left = false;
          if (e.key === 'ArrowRight') right = false;
        });

        function spawn() {
          var real = Math.random() < 0.62;
          var midi = real ? mel[next % mel.length] : 36 + Math.floor(Math.random() * 48);
          drops.push({ x: 24 + Math.random() * (cv.w - 48), y: -14, midi: midi, real: real });
        }
        ctx.raf(function (dt) {
          since += dt;
          if (since > gap) { since = 0; spawn(); }
          if (left) bx -= 300 * dt;
          if (right) bx += 300 * dt;
          bx = Math.max(bw / 2, Math.min(cv.w - bw / 2, bx));
          var g = cv.g;
          g.clearRect(0, 0, cv.w, cv.h);
          cv.bg();
          g.font = '600 22px "IBM Plex Mono", monospace'; g.textAlign = 'center';
          for (var i = drops.length - 1; i >= 0; i--) {
            var d = drops[i]; d.y += speed * dt;
            if (d.real) {
              var gg = g.createRadialGradient(d.x - 4, d.y - 4, 2, d.x, d.y, 14);
              gg.addColorStop(0, '#ffe3a3'); gg.addColorStop(1, '#e09b12');
              g.shadowColor = 'rgba(246,183,63,.8)'; g.shadowBlur = 12;
              g.fillStyle = gg;
            } else {
              g.shadowBlur = 0;
              g.fillStyle = 'rgba(255,255,255,.25)';
            }
            g.beginPath(); g.arc(d.x, d.y, 13, 0, 7); g.fill();
            g.shadowBlur = 0;
            g.fillStyle = '#0c0c16';
            g.fillText(A.letterOf(d.midi), d.x, d.y + 8);
            var caught = d.y > cv.h - 46 && d.y < cv.h - 22 && Math.abs(d.x - bx) < bw / 2;
            if (caught) {
              drops.splice(i, 1);
              if (d.real) {
                cv.burst(d.x, cv.h - 40, '#f6b73f', 18);
                ctx.note(d.midi, null, 0.9); next++; score++; ctx.score(score);
                if (score % 10 === 0) { speed += 14; gap = Math.max(0.5, gap - 0.08); }
              } else {
                ctx.drum('kick'); lives--; ctx.lives(lives);
                if (lives <= 0) return ctx.end(score, 'Too many sour notes. The melody was <b>' + song.title + '</b> — <a href="song?id=' + song.id + '">hear the whole thing</a>.');
              }
            } else if (d.y > cv.h) {
              drops.splice(i, 1);
              if (d.real) {
                lives--; ctx.lives(lives);
                if (lives <= 0) return ctx.end(score, 'The melody got away: it was <b>' + song.title + '</b> — <a href="song?id=' + song.id + '">hear the whole thing</a>.');
              }
            }
          }
          g.shadowColor = 'rgba(139,107,255,.7)'; g.shadowBlur = 14;
          g.fillStyle = '#8b6bff';
          g.beginPath(); g.roundRect(bx - bw / 2, cv.h - 26, bw, 12, 5); g.fill();
          g.shadowBlur = 0;
          g.fillRect(bx - bw / 2, cv.h - 34, 4, 8);
          g.fillRect(bx + bw / 2 - 4, cv.h - 34, 4, 8);
          cv.fx(dt);
        });
      });
    }
  });

  /* 4. BUMBLEBEE DASH — alternate two keys as fast as you can -------------- */
  A.register({
    id: 'bumblebee-dash', title: 'Bumblebee Dash', icon: '🐝', tag: 'Action',
    desc: 'Flight of the Bumblebee, powered by your fingers. Alternate two keys as fast as you can for 20 seconds.',
    help: 'Alternate Z and X (or tap the two buttons) as fast as possible. Every press plays the next note of Rimsky-Korsakov’s Flight of the Bumblebee. Same key twice does nothing — the bee needs both wings.',
    start: function (ctx) {
      ctx.loadNotation('flight-of-the-bumblebee', function (nota) {
        var mel = null;
        if (nota) {
          var cols = DRD.buildTimeline(DRD.parseNotation(nota)).cols, line = [];
          for (var i = 0; i < cols.length; i++) {
            for (var k = 0; k < cols[i].events.length; k++) { line.push(cols[i].events[k].midi); break; }
          }
          mel = ctx.fitRange(line, 36, 96) || line;
        }
        if (!mel || mel.length < 40) {
          mel = [];                                            // chromatic fallback, still bee-ish
          for (var j = 0; j < 120; j++) mel.push(70 - (j % 24));
        }
        var wrap = ctx.el('div', 'arc-center');
        var bee = ctx.el('div', 'arc-bee', '🐝');
        var bar = ctx.el('div', 'arc-progress');
        var fill = ctx.el('div', 'arc-progress-fill');
        bar.appendChild(fill);
        var btns = ctx.el('div', 'arc-pads');
        ['Z', 'X'].forEach(function (kk, i) {
          var b = ctx.el('button', 'arc-pad arc-pad-big', kk);
          b.type = 'button';
          b.addEventListener('click', function () { press(i); });
          btns.appendChild(b);
        });
        wrap.appendChild(bee); wrap.appendChild(bar); wrap.appendChild(btns);
        ctx.stage.appendChild(wrap);

        var n = 0, lastSide = -1, score = 0, total = 20;
        function press(side) {
          if (side === lastSide) { ctx.drum('clave', null, 0.5); return; }
          lastSide = side;
          ctx.note(mel[n % mel.length], null, 0.85); n++;
          score++; ctx.score(score);
          fill.style.width = Math.min(100, (score / 160) * 100) + '%';
          bee.style.transform = 'translateX(' + Math.min(100, (score / 160) * 100) + '%) rotate(' + (side ? 8 : -8) + 'deg)';
        }
        ctx.key(function (e) {
          var k = e.key.toLowerCase();
          if (k === 'z') { e.preventDefault(); press(0); }
          if (k === 'x') { e.preventDefault(); press(1); }
        });
        ctx.countdown(total, function () {
          ctx.end(score, score >= 120 ? 'A genuine bumblebee: ' + (score / total).toFixed(1) + ' notes a second.'
            : (score / total).toFixed(1) + ' notes a second. The real thing runs at about 11 — <a href="song?id=flight-of-the-bumblebee">hear it</a>.');
        });
      });
    }
  });

  /* 5. INTERVAL INVADERS — shoot the right interval before it lands -------- */
  A.register({
    id: 'interval-invaders', title: 'Interval Invaders', icon: '👾', tag: 'Ear',
    desc: 'An interval sounds. Four invaders descend, each wearing a name — zap the right one before they land.',
    help: 'Listen (replay with Space), then click or tap the invader with the right interval name. A wrong zap or a landing costs a life.',
    start: function (ctx) {
      var IV = [
        [1, 'Minor 2nd'], [2, 'Major 2nd'], [3, 'Minor 3rd'], [4, 'Major 3rd'],
        [5, 'Perfect 4th'], [6, 'Tritone'], [7, 'Perfect 5th'], [8, 'Minor 6th'],
        [9, 'Major 6th'], [10, 'Minor 7th'], [11, 'Major 7th'], [12, 'Octave']
      ];
      var score = 0, lives = 3, wave = 0, cur = null, fallDur = 14000;
      ctx.lives(lives);
      var board = ctx.el('div', 'arc-invade');
      ctx.stage.appendChild(board);
      var replay = ctx.el('button', 'btn btn-ghost arc-replay', '↻ Hear it again (Space)');
      replay.type = 'button';
      replay.addEventListener('click', function () { play(); });
      ctx.stage.appendChild(replay);

      function play() {
        if (!cur) return;
        var t0 = ctx.now() + 0.05;
        ctx.note(cur.root, t0, 0.85);
        ctx.note(cur.root + cur.iv[0], t0 + 0.55, 0.85);
      }
      function nextWave() {
        wave++;
        board.innerHTML = '';
        var right = ctx.pick(IV);
        var opts = ctx.shuffle(IV.filter(function (x) { return x !== right; })).slice(0, 3).concat([right]);
        cur = { iv: right, root: 50 + ctx.rand(18) };
        ctx.shuffle(opts).forEach(function (iv, i) {
          var b = ctx.el('button', 'arc-invader', '👾<span>' + iv[1] + '</span>');
          b.type = 'button';
          b.style.left = (6 + i * 24) + '%';
          b.style.animationDuration = fallDur + 'ms';
          b.addEventListener('click', function () {
            if (iv === right) {
              score++; ctx.score(score);
              ctx.chord([cur.root, cur.root + right[0]], null, 1);
              fallDur = Math.max(5200, fallDur - 480);
              nextWave();
            } else {
              ctx.drum('kick'); lose();
            }
          });
          board.appendChild(b);
        });
        ctx.after(120, play);
        ctx.after(fallDur, function () { if (cur && cur.iv === right) { lose(); } });
      }
      function lose() {
        lives--; ctx.lives(lives);
        if (lives <= 0) {
          var was = cur ? cur.iv[1] : '';
          ctx.end(score, 'The one that got you was a <b>' + was + '</b>. Train it in <a href="ear-training.html">ear training</a>.');
        } else nextWave();
      }
      ctx.key(function (e) { if (e.key === ' ') { e.preventDefault(); play(); } });
      nextWave();
    }
  });

  /* 6. PITCH SNIPER — hear the note, hit the key --------------------------- */
  A.register({
    id: 'pitch-sniper', title: 'Pitch Sniper', icon: '🎯', tag: 'Ear',
    desc: 'A note sounds. Find it on the keyboard — fast. Sixty seconds on the clock.',
    help: 'Click the key you heard (replay with Space). A first-try hit is 3 points, second try 1. The reference C plays at the start of every round.',
    start: function (ctx) {
      var wrap = ctx.el('div', 'arc-keys-wrap');
      ctx.stage.appendChild(wrap);
      var score = 0, target = null, tries = 0, played = [];
      // buildPiano hands its callback (freq, keyEl, oct, midi) — midi is FOURTH
      DRD.buildPiano(wrap, [4, 5], function (freq, k, oct, midi) {
        if (target == null) return;
        if (midi === target) {
          score += (tries === 0 ? 3 : 1); ctx.score(score);
          tries = 0; ctx.after(350, ask);
        } else {
          tries++; ctx.drum('clave', null, 0.6);
        }
      });
      function ask() {
        target = 60 + ctx.rand(24);
        ctx.hush(played);
        played.push(ctx.note(60, null, 0.5));               // reference C, quiet
        ctx.after(420, function () { played.push(ctx.note(target, null, 0.95)); });
      }
      ctx.key(function (e) {
        if (e.key === ' ') { e.preventDefault(); if (target != null) ctx.note(target, null, 0.95); }
      });
      ctx.countdown(60, function () {
        ctx.end(score, score >= 45 ? 'Sharpshooter ears.' : 'Keep training in <a href="ear-training.html">ear training</a>.');
      });
      ask();
    }
  });

  /* 7. HIGHER OR LOWER — the gap keeps shrinking --------------------------- */
  A.register({
    id: 'higher-lower', title: 'Higher or Lower', icon: '↕️', tag: 'Ear',
    desc: 'Two notes. Is the second higher or lower? Easy — until the gap shrinks to a semitone.',
    help: 'Press ↑ if the second note is higher, ↓ if lower (or tap the arrows). The interval gets narrower as your streak grows. Three lives.',
    start: function (ctx) {
      var score = 0, lives = 3, gap = 12, a, b, played = [];
      ctx.lives(lives);
      var wrap = ctx.el('div', 'arc-center');
      var lab = ctx.el('div', 'arc-bignum', '♪ ♪');
      var row = ctx.el('div', 'arc-pads');
      var up = ctx.el('button', 'arc-pad arc-pad-big', '↑ Higher');
      var dn = ctx.el('button', 'arc-pad arc-pad-big', '↓ Lower');
      up.type = dn.type = 'button';
      var rp = ctx.el('button', 'btn btn-ghost arc-replay', '↻ Hear it again (Space)');
      rp.type = 'button';
      row.appendChild(up); row.appendChild(dn);
      wrap.appendChild(lab); wrap.appendChild(row); wrap.appendChild(rp);
      ctx.stage.appendChild(wrap);

      function play() {
        ctx.hush(played);
        var t0 = ctx.now() + 0.05;
        played.push(ctx.note(a, t0, 0.9));
        played.push(ctx.note(b, t0 + 0.6, 0.9));
      }
      function ask() {
        a = 52 + ctx.rand(20);
        var dir = Math.random() < 0.5 ? 1 : -1;
        b = a + dir * Math.max(1, Math.round(gap));
        if (b < 40 || b > 88) b = a - dir * Math.max(1, Math.round(gap));
        play();
      }
      function answer(higher) {
        var right = higher === (b > a);
        if (right) {
          score++; ctx.score(score);
          gap = Math.max(1, gap * 0.82);
          ctx.chord([a, b], null, 0.8);
          ask();
        } else {
          lives--; ctx.lives(lives); ctx.drum('kick');
          gap = Math.min(12, gap + 2);
          if (lives <= 0) return ctx.end(score, 'It got down to ' + Math.max(1, Math.round(gap)) + ' semitone(s). <a href="ear-training.html">Ear training</a> makes this easy.');
          ask();
        }
      }
      up.addEventListener('click', function () { answer(true); });
      dn.addEventListener('click', function () { answer(false); });
      rp.addEventListener('click', play);
      ctx.key(function (e) {
        if (e.key === 'ArrowUp') { e.preventDefault(); answer(true); }
        if (e.key === 'ArrowDown') { e.preventDefault(); answer(false); }
        if (e.key === ' ') { e.preventDefault(); play(); }
      });
      ask();
    }
  });

  /* 8. CHORD CRUSH — major, minor, diminished, augmented, quick-fire ------- */
  A.register({
    id: 'chord-crush', title: 'Chord Crush', icon: '🧊', tag: 'Ear',
    desc: 'A chord sounds. Major, minor, diminished or augmented? Sixty seconds, streak multiplier.',
    help: 'Tap the quality you hear (keys 1–4, Space replays). A streak of five doubles your points; a wrong answer resets it.',
    start: function (ctx) {
      var Q = [['Major', [0, 4, 7]], ['Minor', [0, 3, 7]], ['Diminished', [0, 3, 6]], ['Augmented', [0, 4, 8]]];
      var score = 0, streak = 0, cur = null, played = [];
      var wrap = ctx.el('div', 'arc-center');
      var streakEl = ctx.el('div', 'arc-streak', '');
      var row = ctx.el('div', 'arc-pads arc-pads-grid');
      var padEls = [];
      Q.forEach(function (q, i) {
        var b = ctx.el('button', 'arc-pad', (i + 1) + '<span>' + q[0] + '</span>');
        b.type = 'button';
        b.addEventListener('click', function () { answer(i, b); });
        row.appendChild(b); padEls.push(b);
      });
      var rp = ctx.el('button', 'btn btn-ghost arc-replay', '↻ Hear it again (Space)');
      rp.type = 'button'; rp.addEventListener('click', play);
      wrap.appendChild(streakEl); wrap.appendChild(row); wrap.appendChild(rp);
      ctx.stage.appendChild(wrap);

      function play() {
        if (!cur) return;
        ctx.hush(played);
        played.push.apply(played, ctx.chord(cur.midis, null, 1));
      }
      function ask() {
        var qi = ctx.rand(4), root = 48 + ctx.rand(20);
        cur = { qi: qi, midis: Q[qi][1].map(function (s) { return root + s; }) };
        play();
      }
      function answer(qi, btn) {
        if (!cur) return;
        var target = btn || padEls[qi];
        if (target) {
          target.classList.remove('good-flash', 'bad-flash'); void target.offsetWidth;
          target.classList.add(qi === cur.qi ? 'good-flash' : 'bad-flash');
        }
        if (qi === cur.qi) {
          streak++;
          score += streak >= 5 ? 2 : 1;
          ctx.score(score);
          streakEl.textContent = streak >= 5 ? '🔥 streak ×2 (' + streak + ')' : 'streak ' + streak;
        } else {
          streak = 0; streakEl.textContent = 'It was ' + Q[cur.qi][0];
          ctx.drum('clave');
        }
        ask();
      }
      ctx.key(function (e) {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) { e.preventDefault(); answer(n - 1); }
        if (e.key === ' ') { e.preventDefault(); play(); }
      });
      ctx.countdown(60, function () {
        ctx.end(score, 'The <a href="chord-finder.html">chord finder</a> lets you hear all of these side by side.');
      });
      ask();
    }
  });

  /* 9. HAPPY OR SAD — major/minor as a reflex ------------------------------ */
  A.register({
    id: 'happy-sad', title: 'Happy or Sad', icon: '🎭', tag: 'Ear',
    desc: 'A tiny phrase plays. Major or minor — happy or sad? Trust your gut, beat the clock.',
    help: 'Tap 😊 for major, 😢 for minor (keys 1 and 2). It plays a short arpeggio then the phrase. Sixty seconds.',
    start: function (ctx) {
      var score = 0, cur = null, played = [];
      var wrap = ctx.el('div', 'arc-center');
      var row = ctx.el('div', 'arc-pads');
      var hap = ctx.el('button', 'arc-pad arc-pad-big', '😊<span>Major</span>');
      var sad = ctx.el('button', 'arc-pad arc-pad-big', '😢<span>Minor</span>');
      hap.type = sad.type = 'button';
      row.appendChild(hap); row.appendChild(sad);
      var rp = ctx.el('button', 'btn btn-ghost arc-replay', '↻ Hear it again (Space)');
      rp.type = 'button'; rp.addEventListener('click', play);
      wrap.appendChild(row); wrap.appendChild(rp);
      ctx.stage.appendChild(wrap);

      function play() {
        if (!cur) return;
        ctx.hush(played);
        var t0 = ctx.now() + 0.05, third = cur.minor ? 3 : 4;
        [0, third, 7, 12, 7, third, 0].forEach(function (s, i) {
          played.push(ctx.note(cur.root + s, t0 + i * 0.16, 0.85));
        });
      }
      function ask() { cur = { root: 50 + ctx.rand(18), minor: Math.random() < 0.5 }; play(); }
      function answer(minor) {
        if (!cur) return;
        if (minor === cur.minor) { score++; ctx.score(score); }
        else ctx.drum('clave');
        ask();
      }
      hap.addEventListener('click', function () { answer(false); });
      sad.addEventListener('click', function () { answer(true); });
      ctx.key(function (e) {
        if (e.key === '1') { e.preventDefault(); answer(false); }
        if (e.key === '2') { e.preventDefault(); answer(true); }
        if (e.key === ' ') { e.preventDefault(); play(); }
      });
      ctx.countdown(60, function () {
        ctx.end(score, 'Every piece page shows its key — hear the difference in the <a href="library.html">library</a>.');
      });
      ask();
    }
  });

  /* 10. ODD ONE OUT — three snippets, one impostor ------------------------- */
  A.register({
    id: 'odd-one-out', title: 'Odd One Out', icon: '🔍', tag: 'Ear',
    desc: 'Three short phrases — two identical, one with a single note changed. Find the impostor.',
    help: 'Play all three (keys 1 2 3), then click the odd one. Early rounds change a note by a lot; later rounds by a semitone. Three lives.',
    start: function (ctx) {
      var score = 0, lives = 3, phrase = [], odd = 0, delta = 5, played = [];
      ctx.lives(lives);
      var wrap = ctx.el('div', 'arc-center');
      var row = ctx.el('div', 'arc-pads');
      var picks = [];
      [0, 1, 2].forEach(function (i) {
        var b = ctx.el('button', 'arc-pad arc-oddpad', '▶<span>' + (i + 1) + '</span>');
        b.type = 'button';
        b.addEventListener('click', function () { play(i); });
        var p = ctx.el('button', 'btn btn-ghost arc-oddpick', 'this one');
        p.type = 'button';
        p.addEventListener('click', function () { answer(i); });
        var col = ctx.el('div', 'arc-oddcol');
        col.appendChild(b); col.appendChild(p);
        row.appendChild(col);
        picks.push(p);
      });
      wrap.appendChild(row);
      ctx.stage.appendChild(wrap);

      function makePhrase() {
        var root = 55 + ctx.rand(12), steps = [0, 2, 4, 5, 7];
        phrase = [];
        for (var i = 0; i < 5; i++) phrase.push(root + ctx.pick(steps));
        odd = ctx.rand(3);
      }
      function variantOf(i) {
        if (i !== odd) return phrase;
        var v = phrase.slice(), at = 1 + ctx.rand(3);
        v[at] = Math.max(40, Math.min(88, v[at] + (Math.random() < 0.5 ? delta : -delta)));
        if (v[at] === phrase[at]) v[at] += 1;
        return v;
      }
      function play(i) {
        ctx.hush(played);
        var t0 = ctx.now() + 0.05;
        variantOf(i).forEach(function (m, k) { played.push(ctx.note(m, t0 + k * 0.28, 0.85)); });
      }
      function answer(i) {
        if (i === odd) {
          score++; ctx.score(score);
          delta = Math.max(1, delta - 1);
          makePhrase();
        } else {
          lives--; ctx.lives(lives); ctx.drum('kick');
          if (lives <= 0) return ctx.end(score, 'It was number ' + (odd + 1) + '. <a href="melody-detective.html">Melody detective</a> trains exactly this.');
          play(odd);
        }
      }
      ctx.key(function (e) {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= 3) { e.preventDefault(); play(n - 1); }
      });
      makePhrase();
      ctx.after(150, function () { play(0); });
    }
  });
})();
