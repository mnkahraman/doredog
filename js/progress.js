/* ============================================================================
   Your progress — everything the site knows about you, which is only what this
   browser has recorded: pieces you pressed play on, the levels they sat at, your
   daily streak, your quiz best, your favourites and your playlist.

   No account, no server, nothing uploaded. Clearing your browser data clears this.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD || {};

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function readJSON(k, dflt) { try { return JSON.parse(localStorage.getItem(k)) || dflt; } catch (e) { return dflt; } }

  /* ------------------------------------------------------------- badges */
  /* Each badge states its own test, so the list is the spec. Nothing is awarded
     for turning up — every one of these needs you to have played something. */
  var BADGES = [
    { id: 'first',      icon: '🎹', name: 'First note',        want: 'Play your first piece',
      test: function (d) { return d.played >= 1; } },
    { id: 'ten',        icon: '📚', name: 'Ten pieces',        want: 'Play 10 different pieces',
      test: function (d) { return d.pieces >= 10; } },
    { id: 'fifty',      icon: '🏛️', name: 'Fifty pieces',      want: 'Play 50 different pieces',
      test: function (d) { return d.pieces >= 50; } },
    { id: 'climber',    icon: '⛰️', name: 'Level 5 climber',   want: 'Play something at level 5 or above',
      test: function (d) { return d.topLevel >= 5; } },
    { id: 'summit',     icon: '🗻', name: 'Level 8 summit',    want: 'Play something at level 8 or above',
      test: function (d) { return d.topLevel >= 8; } },
    { id: 'ladder',     icon: '🪜', name: 'Full ladder',       want: 'Play a piece at five different levels',
      test: function (d) { return d.levelsUsed >= 5; } },
    { id: 'tour',       icon: '🧭', name: 'Composer tour',     want: 'Play pieces by 10 different composers',
      test: function (d) { return d.composers >= 10; } },
    { id: 'eras',       icon: '🕰️', name: 'Time traveller',    want: 'Play pieces from four different genres',
      test: function (d) { return d.genres >= 4; } },
    { id: 'daily3',     icon: '🔥', name: 'Three in a row',    want: 'A 3-day streak on the melody of the day',
      test: function (d) { return d.dailyBest >= 3; } },
    { id: 'daily7',     icon: '🌟', name: 'A full week',       want: 'A 7-day streak on the melody of the day',
      test: function (d) { return d.dailyBest >= 7; } },
    { id: 'ear',        icon: '👂', name: 'Good ear',          want: 'A 10-answer streak in endless quiz mode',
      test: function (d) { return d.quizBest >= 10; } },
    { id: 'collector',  icon: '❤️', name: 'Collector',         want: 'Save 10 pieces to your favourites',
      test: function (d) { return d.favs >= 10; } },
    { id: 'alongside',  icon: '🎼', name: 'Played along',      want: 'Score a piece with "Score me" turned on',
      test: function (d) { return d.scores.count >= 1; } },
    { id: 'accurate',   icon: '🎯', name: 'Dead on',           want: 'Land 90% of your notes in one play-along',
      test: function (d) { return d.scores.best >= 90; } }
  ];

  /* --------------------------------------------------------------- data */
  function gather() {
    var songs = DRD.SONGS || [];
    var plays = (DRD.progress ? DRD.progress.read().plays : null) || {};
    var ids = Object.keys(plays);
    var played = ids.reduce(function (a, id) { return a + plays[id]; }, 0);

    var levels = {}, composers = {}, genres = {}, topLevel = 0;
    var items = [];
    ids.forEach(function (id) {
      var s = DRD.getSong && DRD.getSong(id); if (!s) return;
      var l = DRD.level ? DRD.level(s).n : 5;
      levels[l] = (levels[l] || 0) + 1;
      if (l > topLevel) topLevel = l;
      if (s.composer) composers[s.composer] = (composers[s.composer] || 0) + 1;
      if (s.genre) genres[s.genre] = (genres[s.genre] || 0) + 1;
      items.push({ song: s, n: plays[id], level: l });
    });
    items.sort(function (a, b) { return b.n - a.n || a.song.title.localeCompare(b.song.title); });

    var daily = readJSON('drd-daily', {});
    return {
      played: played,
      pieces: items.length,
      levels: levels,
      levelsUsed: Object.keys(levels).length,
      topLevel: topLevel,
      composers: Object.keys(composers).length,
      topComposers: Object.keys(composers).sort(function (a, b) { return composers[b] - composers[a]; }).slice(0, 6)
        .map(function (n) { return { name: n, n: composers[n] }; }),
      genres: Object.keys(genres).length,
      items: items,
      favs: (DRD.favs ? DRD.favs.all() : []).length,
      queue: readJSON('drd-queue-v1', []).length,
      dailyStreak: daily.streak || 0,
      dailyBest: daily.best || 0,
      dailyPlayed: daily.played || 0,
      dailyWins: daily.wins || 0,
      quizBest: +(localStorage.getItem('drd-quiz-best') || 0),
      scores: (function () {
        var o = readJSON('drd-scores', {}), ids = Object.keys(o);
        var best = 0, bestId = null;
        ids.forEach(function (id) { if (o[id].best > best) { best = o[id].best; bestId = id; } });
        return { count: ids.length, best: best, id: bestId };
      })(),
      catalogue: songs.length
    };
  }

  /* --------------------------------------------------------------- view */
  function render() {
    var d = gather();

    el('pg-stats').innerHTML = [
      ['Pieces played', d.pieces],
      ['Times played', d.played],
      ['Highest level', d.topLevel || '—'],
      ['Composers heard', d.composers],
      ['Daily streak', d.dailyStreak],
      ['Best quiz streak', d.quizBest]
    ].map(function (r) {
      return '<div class="pg-stat"><b>' + r[1] + '</b><span>' + r[0] + '</span></div>';
    }).join('');

    // level ladder — how far up the catalogue you have actually gone
    var maxCount = Math.max.apply(null, [1].concat(Object.keys(d.levels).map(function (k) { return d.levels[k]; })));
    var bars = '';
    for (var i = 1; i <= 10; i++) {
      var c = d.levels[i] || 0;
      var band = DRD.LEVEL_BANDS ? DRD.LEVEL_BANDS.filter(function (b) { return i <= b.max; })[0] : null;
      bars += '<div class="pg-bar' + (c ? ' on' : '') + '" style="--lvl:' + (band ? band.accent : '#f6b73f') + '">' +
              '<span class="pg-bar-fill" style="height:' + (c ? Math.max(8, Math.round(c / maxCount * 100)) : 3) + '%"></span>' +
              '<span class="pg-bar-n">' + (c || '') + '</span><span class="pg-bar-l">L' + i + '</span></div>';
    }
    el('pg-ladder').innerHTML = bars;
    el('pg-ladder-note').textContent = d.pieces
      ? 'You have played ' + d.pieces + ' of the ' + d.catalogue.toLocaleString('en-GB') + ' pieces in the library, across ' +
        d.levelsUsed + (d.levelsUsed === 1 ? ' level' : ' levels') + '. Highest so far: level ' + d.topLevel + '.'
      : 'Nothing here yet. Press play on any piece and it will appear.';

    // badges
    el('pg-badges').innerHTML = BADGES.map(function (b) {
      var got = b.test(d);
      return '<div class="pg-badge' + (got ? ' got' : '') + '" title="' + esc(b.want) + '">' +
        '<span class="pg-badge-icon">' + b.icon + '</span>' +
        '<b>' + esc(b.name) + '</b><i>' + esc(got ? 'Earned' : b.want) + '</i></div>';
    }).join('');
    var got = BADGES.filter(function (b) { return b.test(d); }).length;
    el('pg-badge-count').textContent = got + ' of ' + BADGES.length;

    // most played
    var mp = el('pg-played');
    if (!d.items.length) {
      mp.innerHTML = '<p class="text-mute" style="padding:8px 2px">Once you press play on something it shows up here, with how many times you have come back to it.</p>';
    } else {
      mp.innerHTML = d.items.slice(0, 12).map(function (it) {
        return '<a class="pg-row" href="song?id=' + esc(it.song.id) + '">' +
          (DRD.levelBadge ? DRD.levelBadge(it.song) : '') +
          '<span class="pg-row-txt"><b>' + esc(it.song.title) + '</b><i>' + esc(it.song.composer || '') + '</i></span>' +
          '<span class="pg-row-n">' + it.n + '×</span></a>';
      }).join('');
    }

    // composers
    el('pg-composers').innerHTML = d.topComposers.length
      ? d.topComposers.map(function (c) {
          return '<a class="pg-chip" href="composer?name=' + encodeURIComponent(c.name) + '">' + esc(c.name) + '<span>' + c.n + '</span></a>';
        }).join('')
      : '<p class="text-mute" style="margin:0">—</p>';

    // daily + quiz detail
    el('pg-daily').innerHTML =
      '<div class="pg-stat"><b>' + d.dailyStreak + '</b><span>Current streak</span></div>' +
      '<div class="pg-stat"><b>' + d.dailyBest + '</b><span>Best streak</span></div>' +
      '<div class="pg-stat"><b>' + d.dailyPlayed + '</b><span>Puzzles played</span></div>' +
      '<div class="pg-stat"><b>' + (d.dailyPlayed ? Math.round(d.dailyWins / d.dailyPlayed * 100) : 0) + '%</b><span>Solved</span></div>';

    el('pg-saved').innerHTML =
      '<div class="pg-stat"><b>' + d.favs + '</b><span>Favourites</span></div>' +
      '<div class="pg-stat"><b>' + d.queue + '</b><span>In your playlist</span></div>' +
      '<div class="pg-stat"><b>' + d.quizBest + '</b><span>Best quiz streak</span></div>' +
      '<div class="pg-stat"><b>' + (d.scores.best || 0) + '%</b><span>Best play-along</span></div>' +
      '<div class="pg-stat"><b>' + d.scores.count + '</b><span>Pieces scored</span></div>';
  }

  function init() {
    if (!el('pg-stats')) return;
    render();
    var reset = el('pg-reset');
    if (reset) reset.addEventListener('click', function () {
      if (!confirm('Clear everything this browser has recorded — plays, streaks, favourites and playlist? This cannot be undone.')) return;
      ['drd-progress', 'drd-daily', 'drd-quiz-best', 'drd-favs', 'drd-recent', 'drd-queue-v1', 'drd-scores'].forEach(function (k) {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      render();
    });
  }

  global.DRDProgress = { init: init, gather: gather, BADGES: BADGES };
  if (global.document) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(window);
