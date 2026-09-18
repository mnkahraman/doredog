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
    help: 'Type the lowest falling letter (c d e f g a b — hold Shift for a sharp), or tap the buttons: the top row is the sharps, the bottom the naturals. Three misses and the rain stops.',
    start: function (ctx) {
      ctx.melody({ min: 24, max: 200, keepRepeats: true }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var cv = A.canvas(ctx.stage, 380);
        /* The pad row held only the seven naturals, but melodies from the pool
           are full of sharps — and a sharp needs Shift, which a phone has not
           got. A sharp at the bottom of the screen was simply uncatchable on
           touch, and letting it land costs a life. Both rows are here now. */
        var pads = ctx.el('div', 'arc-pads arc-pads-keys');
        'C D F G A'.split(' ').forEach(function (l) {
          var b = ctx.el('button', 'arc-pad arc-pad-sharp', l);
          b.type = 'button';
          b.addEventListener('click', function () { hit(l); });
          pads.appendChild(b);
        });
        var padsNat = ctx.el('div', 'arc-pads arc-pads-keys');
        'c d e f g a b'.split(' ').forEach(function (l) {
          var b = ctx.el('button', 'arc-pad', l);
          b.type = 'button';
          b.addEventListener('click', function () { hit(l); });
          padsNat.appendChild(b);
        });
        ctx.stage.appendChild(pads);
        ctx.stage.appendChild(padsNat);

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
    help: 'Four lanes: D F J K on your keyboard, or tap. Hit each tile as it crosses the bright strike line — every hit plays the next note of the melody. A missed tile or a press on an empty lane costs a life; you have three.',
    start: function (ctx) {
      ctx.melody({ min: 24, max: 400, keepRepeats: true }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var cv = A.canvas(ctx.stage, 430);
        var KEYSET = ['d', 'f', 'j', 'k'];
        var laneW = cv.w / 4, tileH = 64, strikeY = cv.h - 78;
        var LANE_COLORS = ['#ff54b2', '#35e08c', '#f6b73f', '#4fa3ff'];
        var tiles = [], next = 0, score = 0, speed = 150, t = 0, sinceSpawn = 9, gap = 0.62;
        var flash = [0, 0, 0, 0], lives = 3;
        ctx.lives(lives);
        function costLife(why) {
          lives--; ctx.lives(lives); ctx.drum('kick');
          if (lives <= 0) ctx.end(score, why + ' That was <b>' + song.title +
            '</b> — <a href="song?id=' + song.id + '">learn it for real</a>.');
          return lives <= 0;
        }

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
            // A stray press used to end the run outright. It costs a life now —
            // punishing enough that mashing all four keys still loses, but one
            // twitchy finger no longer wipes out a good round.
            costLife('Out of lives.');
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
              tiles.splice(i, 1);
              if (costLife('A tile got away.')) return;
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
    help: 'Drag anywhere on the board to move the basket, or use ← →. Catch the gold notes — each is the next note of a real piece. Grey notes are decoys: catching one costs a life, and so does letting a gold one fall.',
    start: function (ctx) {
      ctx.melody({ min: 16, max: 120 }, function (mel, song) {
        if (!mel) return ctx.end(0, 'Could not load a melody — try again.');
        var cv = A.canvas(ctx.stage, 400);
        var bx = cv.w / 2, bw = 84, drops = [], next = 0, score = 0, lives = 3;
        var speed = 90, gap = 1.25, since = 9, left = false, right = false;
        var target = null;                       // pointer target, when dragging
        ctx.lives(lives);

        /* The basket has to be able to REACH the far edge before a note lands,
           or the game stops being a game. At 300px/s fixed it could not: on an
           860px board a far-edge note became uncatchable at 40 points, and a
           missed gold note costs a life — so the run ended on geometry, not on
           skill. Key speed is now derived from the fall speed and the board,
           with a margin, so the worst case is always reachable. */
        function keySpeed() {
          var fallTime = (cv.h - 32) / speed;    // spawn (-14) to the catch band
          return Math.max(340, ((cv.w - bw) / fallTime) * 1.35);
        }

        // Dragging is instant and always fair, so it is the primary control.
        function aim(e) {
          var r = cv.el.getBoundingClientRect();
          target = (e.clientX - r.left) * (cv.w / r.width);
        }
        cv.el.style.touchAction = 'none';
        cv.el.addEventListener('pointerdown', function (e) {
          aim(e);                                // aim first: capture is a bonus,
          // and setPointerCapture throws for any pointer the browser does not
          // consider active — which would otherwise swallow the aim entirely
          try { cv.el.setPointerCapture(e.pointerId); } catch (err) {}
        });
        cv.el.addEventListener('pointermove', function (e) { if (target !== null) aim(e); });
        // release on every exit path — without pointercancel/leave the basket
        // kept sliding after the finger left the canvas
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
          cv.el.addEventListener(ev, function () { target = null; });
        });

        ctx.key(function (e) {
          if (e.key === 'ArrowLeft') { left = true; target = null; e.preventDefault(); }
          if (e.key === 'ArrowRight') { right = true; target = null; e.preventDefault(); }
        });
        ctx.keyup(function (e) {
          if (e.key === 'ArrowLeft') left = false;
          if (e.key === 'ArrowRight') right = false;
        });
        // a key held when the tab loses focus never fires keyup
        ctx.onStop(function () { left = right = false; target = null; });

        function spawn() {
          var real = Math.random() < 0.62;
          var midi = real ? mel[next % mel.length] : 36 + Math.floor(Math.random() * 48);
          drops.push({ x: 24 + Math.random() * (cv.w - 48), y: -14, midi: midi, real: real });
        }
        ctx.raf(function (dt) {
          since += dt;
          if (since > gap) { since = 0; spawn(); }
          if (target !== null) {
            var d2 = target - bx, step = keySpeed() * 1.8 * dt;
            bx += Math.abs(d2) <= step ? d2 : (d2 > 0 ? step : -step);
          } else {
            if (left) bx -= keySpeed() * dt;
            if (right) bx += keySpeed() * dt;
          }
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
                // capped: past ~260px/s a 400px board gives under 1.5s to react
                if (score % 10 === 0) { speed = Math.min(240, speed + 14); gap = Math.max(0.5, gap - 0.08); }
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

  /* 5. INTERVAL INVADERS — hear two notes, find the second on the keys -------
     Used to ask for the interval's NAME from four labels — a vocabulary quiz.
     Now the answer is a key: the first note is lit, you find the second. The
     name only appears afterwards, as a caption, for anyone who wants it. */
  A.register({
    id: 'interval-invaders', title: 'Interval Invaders', icon: '👾', tag: 'Ear', scoreKey: 'interval-invaders@2',
    desc: 'Two notes play and an invader starts to fall. The first note glows on the keyboard — find the second before it lands. No theory, no names: your ear and your hand.',
    help: 'Listen (Space replays), then press the key of the SECOND note — the first one is glowing gold, and you can press it freely to hear it again. Click the keys or type A W S E D F T G Y H U J K O L P ; \' from middle C, Shift for an octave up. First try scores 3, a later try 1. A landed invader costs a life; you have three.',
    start: function (ctx) {
      var NAMES = A.INTERVAL_NAMES;
      var score = 0, lives = 3, wave = 0, cur = null, fallMs = 11000;
      ctx.lives(lives);
      var board = ctx.el('div', 'arc-invade arc-invade-solo');
      var cap = ctx.el('div', 'arc-streak arc-invade-cap', '');
      var keysWrap = ctx.el('div', 'arc-keys-wrap');
      var rp = ctx.el('button', 'btn btn-ghost arc-replay', '↻ Hear it again <kbd>Space</kbd>');
      rp.type = 'button';
      rp.addEventListener('click', function () { play(); });
      ctx.stage.appendChild(board); ctx.stage.appendChild(cap);
      ctx.stage.appendChild(keysWrap); ctx.stage.appendChild(rp);
      var keys = DRD.buildPiano(keysWrap, [4, 5], function (freq, k, oct, midi) { press(midi); }).keys;

      // widen the ear gradually: the three skeleton intervals first
      function tier() {
        if (score < 9) return { ivs: [4, 7, 12], down: false };
        if (score < 21) return { ivs: [2, 4, 5, 7, 9, 12], down: false };
        if (score < 36) return { ivs: [2, 3, 4, 5, 7, 8, 9, 10, 12], down: true };
        return { ivs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], down: true };
      }
      function article(iv) { return /^[aeiou]/.test(NAMES[iv]) ? 'an ' : 'a '; }
      function name(m) { return '<b>' + A.letterOf(m) + '</b>'; }
      function flashKey(m, cls) {
        var k = keys[m]; if (!k) return;
        k.classList.remove('arc-right', 'arc-wrong'); void k.offsetWidth; k.classList.add(cls);
        ctx.after(650, function () { k.classList.remove(cls); });
      }
      function play() {
        if (!cur) return;
        var t0 = ctx.now() + 0.05;
        ctx.note(cur.root, t0, 0.85);
        ctx.note(cur.target, t0 + 0.6, 0.85);
      }
      function nextWave() {
        wave++;
        var mine = wave;
        if (cur && keys[cur.root]) keys[cur.root].classList.remove('arc-root');
        var t = tier(), iv = ctx.pick(t.ivs), down = t.down && Math.random() < 0.4;
        // the root is chosen so the answer is always on the keyboard (60..83)
        var root = down ? 72 + ctx.rand(12) : 60 + ctx.rand(12);
        cur = { root: root, target: down ? root - iv : root + iv, iv: iv, down: down, wrong: 0, wave: mine, done: false };
        if (keys[root]) keys[root].classList.add('arc-root');
        board.innerHTML = '';
        var inv = ctx.el('div', 'arc-invader arc-invader-solo', '👾');
        inv.style.left = (8 + Math.random() * 74) + '%';
        inv.style.animationDuration = fallMs + 'ms';
        board.appendChild(inv);
        cur.inv = inv;
        cap.innerHTML = '&nbsp;';
        ctx.after(150, play);
        ctx.after(fallMs, function () { if (cur.wave === mine && !cur.done) landed(); });
      }
      function landed() {
        cur.done = true;
        lives--; ctx.lives(lives); ctx.drum('kick');
        flashKey(cur.target, 'arc-right');
        ctx.note(cur.target, null, 0.8);
        cap.innerHTML = 'It was ' + name(cur.root) + ' → ' + name(cur.target) + ' — ' + article(cur.iv) + NAMES[cur.iv] + (cur.down ? ' down' : ' up') + '.';
        if (lives <= 0) {
          return ctx.after(1100, function () {
            ctx.end(score, 'Train the same skill slowly in <a href="ear-training.html">ear training</a>, or hunt whole melodies in <a href="melody-detective.html">Melody Detective</a>.');
          });
        }
        ctx.after(1500, nextWave);
      }
      function press(midi) {
        ctx.note(midi, null, 0.72);                 // you always hear what you pressed
        if (!cur || cur.done || midi === cur.root) return;
        if (midi !== cur.target) { cur.wrong++; flashKey(midi, 'arc-wrong'); return; }
        cur.done = true;
        var pts = cur.wrong ? 1 : 3;
        score += pts; ctx.score(score);
        flashKey(midi, 'arc-right');
        cur.inv.classList.add('boom');
        cap.innerHTML = '✓ ' + name(cur.root) + ' → ' + name(cur.target) + ': ' + article(cur.iv) + NAMES[cur.iv] + ' · +' + pts;
        fallMs = Math.max(5000, fallMs - 260);
        ctx.after(850, nextWave);
      }
      var MAP = { KeyA: 60, KeyW: 61, KeyS: 62, KeyE: 63, KeyD: 64, KeyF: 65, KeyT: 66, KeyG: 67, KeyY: 68, KeyH: 69,
        KeyU: 70, KeyJ: 71, KeyK: 72, KeyO: 73, KeyL: 74, KeyP: 75, Semicolon: 76, Quote: 77 };
      ctx.key(function (e) {
        if (e.key === ' ') { e.preventDefault(); play(); return; }
        if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
        var m = MAP[e.code];
        if (m == null) return;
        e.preventDefault();
        if (e.shiftKey) m += 12;
        if (m <= 83) press(m);
      });
      ctx.onStop(function () { if (cur && keys[cur.root]) keys[cur.root].classList.remove('arc-root'); });
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
        ctx.note(midi, null, 0.7);                 // hear your guess — the miss is the lesson
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

  /* 8. CHORD MATCH — the same colour in a different key ----------------------
     Used to ask "Major / Minor / Diminished / Augmented?" — words. Now you
     hear a chord, then four in another key, and pick the one that FEELS the
     same. Transposing the options is what makes it an ear skill rather than
     spotting an identical sound. The name is revealed afterwards. */
  A.register({
    id: 'chord-crush', title: 'Chord Match', icon: '🎨', tag: 'Ear', scoreKey: 'chord-crush@2',
    desc: 'A chord rings out. Four more follow in a different key — one of them has the same colour. Match it by ear. No chord names needed.',
    help: 'Hear the mystery chord (Space), then play the four options (keys 1–4, as often as you like) and pick the one with the same colour: bright, dark, tense, dreamy… The options are in another key, so listen for the feeling, not the notes. First pick scores 3, second 1. Ten rounds.',
    start: function (ctx) {
      var Q = [
        { name: 'major', feel: 'the bright one', iv: [0, 4, 7] },
        { name: 'minor', feel: 'the dark one', iv: [0, 3, 7] },
        { name: 'diminished', feel: 'the tense one', iv: [0, 3, 6] },
        { name: 'augmented', feel: 'the dreamy, unsettled one', iv: [0, 4, 8] },
        { name: 'suspended', feel: 'the open, unresolved one', iv: [0, 5, 7] },
        { name: 'dominant seventh', feel: 'the one that wants to move on', iv: [0, 4, 7, 10] }
      ];
      var round = 0, score = 0, ui = null, cur = null, played = [];
      function playChord(root, q) {
        ctx.hush(played);
        var t0 = ctx.now() + 0.04, v = Math.min(0.8, 1.7 / q.iv.length);
        q.iv.forEach(function (s, i) { played.push(ctx.note(root + s, t0 + i * 0.045, v)); });   // a light roll
      }
      function next() {
        round++;
        if (round > 10) return ctx.end(score, 'Every one of these colours lives in the <a href="chord-finder.html">chord finder</a>, with its name and its keys.');
        ctx.stage.innerHTML = '';
        var avail = round <= 3 ? [0, 1, 2, 3] : round <= 6 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
        var qi = ctx.pick(round <= 3 ? [0, 1] : avail);
        var opts = ctx.shuffle(ctx.shuffle(avail.filter(function (x) { return x !== qi; })).slice(0, 3).concat([qi]));
        var r1 = 50 + ctx.rand(9);
        cur = { qi: qi, opts: opts, r1: r1, r2: r1 + ctx.pick([-5, -4, -3, 3, 4, 5]) };
        ui = A.choices(ctx, {
          count: 4, pickLabel: 'Same colour', maxWrong: 1,
          status: 'Round ' + round + ' of 10 — which one has the same colour?',
          mysteryLabel: 'Hear the mystery chord',
          onMystery: function () { playChord(cur.r1, Q[cur.qi]); },
          onPlay: function (i) { playChord(cur.r2, Q[cur.opts[i]]); },
          onPick: function (i, wrongSoFar) {
            if (cur.opts[i] !== cur.qi) { ctx.drum('clave'); return false; }
            var pts = wrongSoFar ? 1 : 3;
            score += pts; ctx.score(score);
            reveal(pts);
            return true;
          },
          onGiveUp: function () { reveal(0); }
        });
        ctx.stage.appendChild(ui.el);
        ctx.after(200, function () { playChord(cur.r1, Q[cur.qi]); });
      }
      function reveal(pts) {
        ui.markRight(cur.opts.indexOf(cur.qi));
        cur.opts.forEach(function (q, k) { ui.caption(k, Q[q].name); });
        ui.status.innerHTML = (pts ? '✓ +' + pts + ' — ' : 'Not this time — ') +
          'that colour is called <b>' + Q[cur.qi].name + '</b>, ' + Q[cur.qi].feel + '.';
        ctx.after(2400, next);
      }
      ctx.key(function (e) { if (ui) ui.key(e); });
      next();
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
