/* ============================================================================
   DoReDog — Page controllers (home / library / song)
   ========================================================================== */
(function () {
  'use strict';
  var DRD = window.DRD || {};
  var SONGS = DRD.SONGS || [];

  // Notation lives in songs/<id>.js and is loaded only when a player is mounted.
  function loadNotation(id, cb, _retry) {
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    if (DRD.NOTATIONS[id]) return cb(DRD.NOTATIONS[id]);
    var sc = document.createElement('script');
    // cache-bust: bump on every content regeneration so browsers never serve a stale/404-cached notation.
    sc.src = 'songs/' + id + '.js?v=86' + (_retry ? '&r=' + Date.now() : '');
    sc.onload = function () {
      var n = (DRD.NOTATIONS || {})[id] || null;
      if (n == null && !_retry) return loadNotation(id, cb, true);   // stale/empty cached response → retry uncached once
      cb(n);
    };
    sc.onerror = function () { if (!_retry) return loadNotation(id, cb, true); cb(null); };
    document.head.appendChild(sc);
  }
  function mountPlayer(mountEl, song, opts) {
    loadNotation(song.id, function (nota) {
      if (nota == null) { mountEl.innerHTML = '<p class="text-mute" style="padding:26px">Sorry — this notation could not be loaded.</p>'; return; }
      var s = {}; for (var k in song) s[k] = song[k];
      s.notation = nota;
      DRD.createPlayer(mountEl, s, opts);
    });
  }

  function reobserve(scope) {
    // let newly-injected [data-reveal] elements animate in
    var els = (scope || document).querySelectorAll('[data-reveal]:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ------------------------------- HOME -------------------------------- */
  function initHome() {
    var statEl = document.getElementById('stat-pieces');   // keep the hero stat in sync with the library
    if (statEl) statEl.textContent = SONGS.length;
    var demo = document.getElementById('demo-player');
    if (demo) {
      var featured = DRD.getSong('ode-to-joy') || SONGS[0];
      mountPlayer(demo, featured);
    }
    var grid = document.getElementById('featured-grid');
    if (grid) {
      grid.innerHTML = SONGS.filter(function (s) { return s.featured; })
        .map(function (s, i) { return DRD.songCard(s, (i % 4) + 1); }).join('');
      reobserve(grid);
    }
    // piece of the day — deterministic by calendar date, drawn from the curated (featured) pool
    var dg = document.getElementById('daily-grid');
    if (dg && SONGS.length) {
      var d = new Date(), seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      var pool = SONGS.filter(function (s) { return s.featured; }); if (pool.length < 20) pool = SONGS;
      dg.innerHTML = DRD.songCard(pool[seed % pool.length], 1);
      reobserve(dg);
    }
    // recently played (localStorage) — the section stays hidden until there's history
    var rg = document.getElementById('recent-grid');
    if (rg && DRD.recent) {
      var items = DRD.recent.all().map(function (id) { return DRD.getSong(id); }).filter(Boolean).slice(0, 8);
      if (items.length) {
        var sec = document.getElementById('recent'); if (sec) sec.hidden = false;
        rg.innerHTML = items.map(function (s, i) { return DRD.songCard(s, (i % 4) + 1); }).join('');
        reobserve(rg);
      }
    }
    // cinematic art marquee — each scene links to a mood-matched piece
    var track = document.getElementById('art-track');
    if (track) {
      var picks = ['clair-de-lune', 'moonlight-sonata', 'ode-to-joy', 'fur-elise', 'twinkle-twinkle', 'silent-night', 'the-entertainer'];
      var item = function (id) {
        var s = DRD.getSong(id); if (!s || !s.cover || !s.cover.image) return '';
        var comp = s.composer || '';
        return '<a class="art-item" href="song?id=' + id + '" aria-label="Play ' + s.title + '">' +
          '<img src="' + s.cover.image + '" alt="' + s.title + '" loading="lazy">' +
          '<span class="art-title">' + s.title + '<i>' + comp + '</i></span></a>';
      };
      var h = picks.map(item).join('');
      track.innerHTML = h + h;   // duplicated for a seamless loop
    }

    // --- Archive depth showcase: stats + browse-by-composer cloud ---
    var counts = {}, genres = {}, accent = {};
    SONGS.forEach(function (s) {
      counts[s.composer] = (counts[s.composer] || 0) + 1;
      genres[s.genre] = true;
      if (!accent[s.composer] && s.cover) accent[s.composer] = s.cover.mid;   // signature colour
    });
    var setNum = function (id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
    setNum('arch-pieces', SONGS.length);
    setNum('arch-composers', Object.keys(counts).length);
    setNum('arch-eras', Object.keys(genres).length);
    var cloud = document.getElementById('composer-cloud');
    if (cloud) {
      var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); }).slice(0, 15);
      cloud.innerHTML = top.map(function (name) {
        return '<a class="composer-link" href="composer.html?name=' + encodeURIComponent(name) + '">' +
          '<span class="dot" style="background:' + (accent[name] || '#8b6bff') + ';color:' + (accent[name] || '#8b6bff') + '"></span>' +
          name + '<span class="n">' + counts[name] + '</span></a>';
      }).join('');
    }
  }

  /* ------------------------------ LIBRARY ------------------------------ */
  var LIB_PAGE = 48;   // cards rendered per chunk — keeps the initial paint fast at 750+ pieces
  function initLibrary() {
    var grid = document.getElementById('library-grid');
    if (!grid) return;
    var search = document.getElementById('lib-search');
    var composerSel = document.getElementById('lib-composer');
    var sortSel = document.getElementById('lib-sort');
    var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var countEl = document.getElementById('lib-count');
    var moreWrap = document.getElementById('lib-more-wrap');
    var moreBtn = document.getElementById('lib-more');
    var qs = new URLSearchParams(location.search);
    var eraSel = document.getElementById('lib-era');
    var state = { q: qs.get('q') || '', filter: (qs.get('filter') || 'all').toLowerCase(), composer: qs.get('composer') || '', sort: qs.get('sort') || '', era: qs.get('era') || '', mood: qs.get('mood') || '', shown: LIB_PAGE };
    if (sortSel && state.sort) sortSel.value = state.sort;
    if (search && state.q) search.value = state.q;   // ?q=… deep link (also powers the Google sitelinks search box)

    // populate the period dropdown with per-century counts (chronological) — powered by song.year
    if (eraSel) {
      var ec = {};
      SONGS.forEach(function (s) { if (s.year) { var c = Math.floor(s.year / 100) * 100; ec[c] = (ec[c] || 0) + 1; } });
      Object.keys(ec).map(Number).sort(function (a, b) { return a - b; })
        .forEach(function (c) {
          var o = document.createElement('option');
          o.value = String(c); o.textContent = c + 's (' + ec[c] + ')';
          eraSel.appendChild(o);
        });
      if (state.era) eraSel.value = state.era;
    }

    // Composers come in two layers so the long tail of 1–2-piece composers doesn't drown the
    // deep catalogues. A visible tier toggle (buttons above the dropdown) swaps which layer the
    // composer <select> lists — "Deep catalogues" (>2 pieces, by depth) or "Rarely-heard" (1–2, A–Z).
    if (composerSel) {
      var counts = {};
      SONGS.forEach(function (s) { counts[s.composer] = (counts[s.composer] || 0) + 1; });
      var names = Object.keys(counts);
      var RARE_MAX = 2;
      var tiers = {
        deep: names.filter(function (n) { return counts[n] > RARE_MAX; })
          .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); }),
        rare: names.filter(function (n) { return counts[n] <= RARE_MAX; })
          .sort(function (a, b) { return a.localeCompare(b); })
      };
      tiers.all = tiers.deep.concat(tiers.rare);   // everyone: deep (by depth) first, then rare (A–Z)
      function labelFor(tier) { return tier === 'rare' ? 'Rarely heard' : tier === 'deep' ? 'Deep catalogues' : 'All composers'; }
      // The reset (value="") option is named after the active tier, so its label is always visible.
      function fill(tier) {
        while (composerSel.options.length > 1) composerSel.remove(1);   // keep the reset option
        composerSel.options[0].textContent = labelFor(tier);
        (tiers[tier] || tiers.all).forEach(function (name) {
          var o = document.createElement('option');
          o.value = name; o.textContent = name + ' (' + counts[name] + ')';
          composerSel.appendChild(o);
        });
        composerSel.value = (state.composer && tiers[tier].indexOf(state.composer) > -1) ? state.composer : '';
      }
      var tierBtns = Array.prototype.slice.call(document.querySelectorAll('[data-tier]'));
      var LABELS = { all: 'All composers · ' + tiers.all.length, deep: 'Deep catalogues · ' + tiers.deep.length, rare: 'Rarely-heard · ' + tiers.rare.length };
      // open on "All composers"; if the URL deep-links a composer, open the tier that contains it
      var startTier = state.composer ? (tiers.rare.indexOf(state.composer) > -1 ? 'rare' : 'deep') : 'all';
      tierBtns.forEach(function (b) {
        var t = b.getAttribute('data-tier');
        b.textContent = LABELS[t] || t;
        b.classList.toggle('active', t === startTier);
        b.addEventListener('click', function () {
          tierBtns.forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          fill(t);
        });
      });
      fill(startTier);
    }
    // reflect a URL ?filter= on the chips
    if (state.filter !== 'all') {
      chips.forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === state.filter);
      });
    }

    function match(s) {
      var matchQ = !state.q || (s.title + ' ' + s.composer + ' ' + s.genre + ' ' + s.tags.join(' '))
        .toLowerCase().indexOf(state.q.toLowerCase()) > -1;
      var matchF = state.filter === 'all' ? true
        : state.filter === 'favorites' ? DRD.favs.has(s.id)
        : (s.difficulty === state.filter || s.genre.toLowerCase() === state.filter);
      var matchC = !state.composer || s.composer === state.composer;
      var matchE = !state.era || (s.year && Math.floor(s.year / 100) * 100 === +state.era);
      var matchM = !state.mood || String(s.mood) === state.mood;
      return matchQ && matchF && matchC && matchE && matchM;
    }

    function sortList(list) {
      var by = state.sort;
      if (!by) return list;                                  // 'Featured' = catalog order
      var big = 9999;
      var copy = list.slice();
      if (by === 'title') copy.sort(function (a, b) { return a.title.localeCompare(b.title); });
      else if (by === 'year') copy.sort(function (a, b) { return (a.year || big) - (b.year || big) || a.composer.localeCompare(b.composer); });
      else if (by === 'year-desc') copy.sort(function (a, b) { return (b.year || -big) - (a.year || -big) || a.composer.localeCompare(b.composer); });
      return copy;
    }

    function render() {
      var list = sortList(SONGS.filter(match));
      var slice = list.slice(0, state.shown);
      grid.innerHTML = list.length
        ? slice.map(function (s, i) { return DRD.songCard(s, (i % 4) + 1); }).join('')
        : '<div style="grid-column:1/-1;text-align:center;padding:56px 0">' +
            '<div class="dsticker s5 bob" role="img" aria-label="Doré napping" style="width:150px;margin:0 auto 12px"></div>' +
            '<p class="text-mute">No pieces match your search yet — even Doré dozed off. Try another keyword.</p></div>';
      if (countEl) {
        var moodTag = (state.mood && DRD.MOODS && DRD.MOODS[+state.mood]) ? DRD.MOODS[+state.mood].label + ' · ' : '';
        countEl.textContent = list.length
          ? moodTag + (list.length > slice.length ? 'Showing ' + slice.length + ' of ' + list.length + ' pieces'
                                        : list.length + (list.length === 1 ? ' piece' : ' pieces'))
          : '0 pieces';
      }
      if (moreWrap) {
        var remaining = list.length - slice.length;
        moreWrap.style.display = remaining > 0 ? 'block' : 'none';
        if (moreBtn && remaining > 0) moreBtn.textContent = 'Load ' + Math.min(LIB_PAGE, remaining) + ' more · ' + remaining + ' left';
      }
      reobserve(grid);
    }
    function reset() { state.shown = LIB_PAGE; render(); }

    if (search) search.addEventListener('input', function () { state.q = this.value; reset(); });
    if (composerSel) composerSel.addEventListener('change', function () { state.composer = this.value; reset(); });
    if (sortSel) sortSel.addEventListener('change', function () { state.sort = this.value; reset(); });
    if (eraSel) eraSel.addEventListener('change', function () { state.era = this.value; reset(); });
    if (moreBtn) moreBtn.addEventListener('click', function () { state.shown += LIB_PAGE; render(); });
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.remove('active'); });
        c.classList.add('active');
        state.filter = c.getAttribute('data-filter');
        reset();
      });
    });
    render();
  }

  /* ------------------------------- SONG -------------------------------- */
  function initSong() {
    var mount = document.getElementById('song-player');
    if (!mount) return;
    var sqs = new URLSearchParams(location.search);
    var id = sqs.get('id');
    var song = DRD.getSong(id) || SONGS[0];
    var startN = parseInt(sqs.get('start'), 10);   // ?start=N — open positioned at measure N (1-indexed)
    var playerOpts = (startN > 0) ? { startBlock: startN - 1 } : undefined;

    document.title = song.title + ' — DoReDog';
    var set = function (sel, val) { var e = document.querySelector(sel); if (e) e.textContent = val; };
    set('#song-title', song.title);
    var scEl = document.querySelector('#song-composer');
    if (scEl) scEl.innerHTML = '<a href="composer.html?name=' + encodeURIComponent(song.composer) + '" style="color:inherit;text-decoration:none;border-bottom:1px solid rgba(246,183,63,.4)">' + song.composer + '</a>' + (song.year ? '  ·  ' + (song.circa ? 'c. ' : '') + song.year : '');
    set('#song-blurb', song.blurb || '');
    set('#song-genre', song.genre);
    set('#song-diff', song.difficulty);
    var diffChip = document.querySelector('#song-diff');
    if (diffChip) diffChip.className = 'chip diff-' + song.difficulty;

    if (DRD.recent) DRD.recent.push(song.id);        // remember for the homepage strip
    var chipRow = diffChip ? diffChip.parentNode : null;
    if (chipRow) {
      if (song.dur) { var dc = document.createElement('span'); dc.className = 'chip'; dc.textContent = DRD.fmtDur(song.dur); chipRow.appendChild(dc); }
      if (DRD.favBtn) { var fw = document.createElement('span'); fw.innerHTML = DRD.favBtn(song.id); var fb = fw.firstChild; fb.classList.add('song-fav-btn'); chipRow.appendChild(fb); }
    }

    var cover = document.getElementById('song-cover');
    if (cover && song.cover) {
      var art = DRD.coverArt(song);
      if (art.img) {
        cover.classList.add('has-img', 'img-cover');
        cover.style.backgroundImage = 'url(' + song.cover.image + ')';
        cover.innerHTML = '';
      } else {
        cover.style.position = 'relative'; cover.style.overflow = 'hidden';
        cover.style.background = art.style.replace(/^background:/, '');
        cover.innerHTML = art.inner;
      }
    }

    mountPlayer(mount, song, playerOpts);

    // export — reuse the notation cache the player just populated
    var withNota = function (fn) {
      loadNotation(song.id, function (nota) {
        if (nota == null) return;
        var s = {}; for (var k in song) s[k] = song[k]; s.notation = nota; fn(s);
      });
    };
    var bindExp = function (id, fn) { var b = document.getElementById(id); if (b) b.addEventListener('click', function () { withNota(fn); }); };
    bindExp('exp-midi', function (s) { if (DRD.exportMIDI) DRD.exportMIDI(s); });
    // MusicXML export intentionally unwired (removed from UI 2026-07-07) — DRD.exportMusicXML still exists in
    // js/export.js, so re-adding is just a button in song.html + one bindExp line here.
    var pb = document.getElementById('exp-print');
    if (pb) pb.addEventListener('click', function () {                       // open synchronously (popup-safe), fill when ready
      var w = window.open('', '_blank');
      if (w) { try { w.document.write('<p style="font:16px sans-serif;padding:40px;color:#333">Preparing sheet…</p>'); } catch (e) {} }
      loadNotation(song.id, function (nota) {
        if (nota == null || !w || !DRD.sheetHTML) return;
        var s = {}; for (var k in song) s[k] = song[k]; s.notation = nota;
        try { w.document.open(); w.document.write(DRD.sheetHTML(s)); w.document.close(); } catch (e) {}
      });
    });

    // "More like this" — nearest melodic neighbours by fingerprint contour (falls back to same-composer)
    var rel = document.getElementById('related-grid');
    if (rel) {
      var picks = (DRD.similar ? DRD.similar(song, 4) : []);
      if (picks.length < 4) {
        var have = {}; picks.forEach(function (s) { have[s.id] = 1; }); have[song.id] = 1;
        SONGS.filter(function (s) { return !have[s.id] && s.composer === song.composer; })
          .concat(SONGS.filter(function (s) { return !have[s.id]; }))
          .some(function (s) { if (picks.length >= 4) return true; if (!have[s.id]) { have[s.id] = 1; picks.push(s); } return false; });
      }
      rel.innerHTML = picks.slice(0, 4).map(function (s, i) { return DRD.songCard(s, (i % 4) + 1); }).join('');
      reobserve(rel);
    }
  }

  /* ------------------------------- GUIDE ------------------------------- */
  function initGuide() {
    var mount = document.getElementById('guide-player');
    if (mount) {
      DRD.createPlayer(mount, {
        title: 'Play with the sandbox',
        composer: 'Edit the notes below and press play',
        cps: 6,
        notation:
          '5|-------------c|\n4|c-d-e-f-g-a-b-|\n1\n5|c-------------|\n4|-b-a-g-f-e-d-c|\n2'
      }, { pianoRange: [3, 5] });
    }
    var editor = document.getElementById('nota-editor');
    var reload = document.getElementById('nota-reload');
    var sandbox = document.getElementById('sandbox-player');
    if (editor && reload && sandbox) {
      var build = function () {
        DRD.createPlayer(sandbox, { title: 'Your notation', composer: 'Live sandbox', cps: 6, notation: editor.value }, { pianoRange: [3, 5] });
      };
      build();
      reload.addEventListener('click', build);
    }
  }

  /* ---------------------------- COMPOSER ------------------------------- */
  function initComposer() {
    var root = document.getElementById('composer-page'); if (!root) return;
    var name = decodeURIComponent((new URLSearchParams(location.search).get('name') || '').replace(/\+/g, ' '));
    var works = SONGS.filter(function (s) { return s.composer === name; });
    var set = function (sel, val) { var e = document.querySelector(sel); if (e) e.textContent = val; };
    if (!works.length) {
      set('#composer-name', 'Composer not found');
      set('#composer-meta', 'We couldn’t find that composer. Browse the full library instead.');
      var g0 = document.getElementById('composer-grid'); if (g0) g0.innerHTML = '';
      return;
    }
    document.title = name + ' — piano letter notes · DoReDog';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', 'All ' + works.length + ' pieces by ' + name + ' in playable piano letter notes — press play and hear each one on DoReDog.');

    var years = works.map(function (s) { return s.year; }).filter(Boolean);
    var minY = years.length ? Math.min.apply(null, years) : null;
    var maxY = years.length ? Math.max.apply(null, years) : null;
    var circa = works.some(function (s) { return s.circa; });
    var eraLabel = minY ? ((circa ? 'c. ' : '') + minY + (maxY && maxY !== minY ? '–' + maxY : '')) : 'Composer';
    set('#composer-era', eraLabel);
    set('#composer-name', name);
    set('#composer-meta', works.length + (works.length === 1 ? ' piece' : ' pieces') + ' in the library, ready to play in colour-coded letter notes.');
    set('#composer-worktitle', 'Every ' + name.split(' ').pop() + ' piece');

    // genre pills
    var genres = {}; works.forEach(function (s) { genres[s.genre] = (genres[s.genre] || 0) + 1; });
    var gl = document.getElementById('composer-genres');
    if (gl) gl.innerHTML = Object.keys(genres).sort(function (a, b) { return genres[b] - genres[a]; })
      .map(function (gn) { return '<span class="chip">' + gn + ' · ' + genres[gn] + '</span>'; }).join('');

    // signature cover from the composer's first piece (real art if any, else the gradient)
    var cov = document.getElementById('composer-cover');
    if (cov) {
      var lead = works.slice().sort(function (a, b) { return (b.cover && b.cover.image ? 1 : 0) - (a.cover && a.cover.image ? 1 : 0); })[0];
      var art = DRD.coverArt(lead);
      if (art.img) { cov.classList.add('has-img', 'img-cover'); cov.style.backgroundImage = 'url(' + lead.cover.image + ')'; }
      else { cov.style.position = 'relative'; cov.style.overflow = 'hidden'; cov.style.background = art.style.replace(/^background:/, ''); cov.innerHTML = art.inner; }
    }

    // works, newest-known first then by title
    var big = 999999;
    works.sort(function (a, b) { return (a.year || big) - (b.year || big) || a.title.localeCompare(b.title); });
    var grid = document.getElementById('composer-grid');
    if (grid) { grid.innerHTML = works.map(function (s, i) { return DRD.songCard(s, (i % 4) + 1); }).join(''); reobserve(grid); }
  }

  /* -------------------------- COLLECTIONS ------------------------------ */
  // a small 2×2 mosaic from a collection's best pieces (real cover images preferred)
  function mosaic(songs) {
    var picks = songs.slice(0, 4);
    while (picks.length && picks.length < 4) picks = picks.concat(picks).slice(0, 4);
    return '<div class="coll-mosaic">' + picks.map(function (s) {
      var art = DRD.coverArt(s);
      return '<div class="coll-tile ' + art.cls + '" style="' + art.style + '">' + (art.img ? '' : art.inner) + '</div>';
    }).join('') + '</div>';
  }
  function initCollections() {
    var grid = document.getElementById('collection-grid');
    if (grid && DRD.COLLECTIONS) {
      grid.innerHTML = DRD.COLLECTIONS.map(function (c, i) {
        var songs = DRD.collectionSongs(c.slug);
        return '<a class="collection-card" href="collection.html?c=' + c.slug + '" data-reveal data-delay="' + ((i % 4) + 1) + '" style="--accent:' + c.accent + '">' +
          mosaic(songs) +
          '<div class="coll-body">' +
            '<div class="coll-glyph" style="color:' + c.accent + '">' + c.glyph + '</div>' +
            '<h3>' + c.title + '</h3>' +
            '<p>' + c.sub + '</p>' +
            '<span class="coll-count">' + songs.length + ' pieces</span>' +
          '</div></a>';
      }).join('');
      reobserve(grid);
    }
    // atmosphere chips — a second browse axis into the library by mood
    var strip = document.getElementById('atmosphere-strip');
    if (strip && DRD.MOODS) {
      var moodCounts = {}; SONGS.forEach(function (s) { if (s.mood != null) moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1; });
      strip.innerHTML = DRD.MOODS.map(function (m, i) {
        if (!moodCounts[i]) return '';
        return '<a class="atmo-chip" href="library.html?mood=' + i + '" style="--accent:' + m.accent + '" data-reveal data-delay="' + ((i % 4) + 1) + '">' +
          '<span class="atmo-dot" style="background:' + m.accent + '"></span>' + m.label +
          '<span class="atmo-n">' + moodCounts[i] + '</span></a>';
      }).join('');
      reobserve(strip);
    }
  }
  function initCollectionDetail() {
    var root = document.getElementById('collection-page'); if (!root) return;
    var slug = new URLSearchParams(location.search).get('c') || '';
    var c = DRD.getCollection ? DRD.getCollection(slug) : null;
    var set = function (sel, val) { var e = document.querySelector(sel); if (e) e.textContent = val; };
    if (!c) {
      set('#collection-name', 'Collection not found');
      set('#collection-sub', 'That collection doesn’t exist. Browse them all instead.');
      return;
    }
    var songs = DRD.collectionSongs(slug, 120);
    document.title = c.title + ' — piano letter notes · DoReDog';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', c.sub + ' ' + songs.length + ' pieces on DoReDog, each playable live in your browser.');
    set('#collection-eyebrow', 'Collection · ' + songs.length + ' pieces');
    set('#collection-name', c.title);
    set('#collection-sub', c.sub);
    var cov = document.getElementById('collection-cover');
    if (cov) { cov.style.setProperty('--accent', c.accent); cov.innerHTML = mosaic(songs) + '<span class="coll-cover-glyph" style="color:' + c.accent + '">' + c.glyph + '</span>'; }
    var grid = document.getElementById('collection-works');
    if (grid) { grid.innerHTML = songs.map(function (s, i) { return DRD.songCard(s, (i % 4) + 1); }).join(''); reobserve(grid); }
  }

  /* ---------------------------- TIMELINE ------------------------------- */
  function initTimeline() {
    var wrap = document.getElementById('era-bands'); if (!wrap) return;
    var ERAS = [
      { name: 'Renaissance', lo: 0, hi: 1600, genre: 'baroque', accent: '#8fa8d8', glyph: '❧' },
      { name: 'Baroque', lo: 1600, hi: 1750, genre: 'baroque', accent: '#e0b84d', glyph: '𝄞' },
      { name: 'Classical', lo: 1750, hi: 1820, genre: 'classical', accent: '#8b6bff', glyph: '☾' },
      { name: 'Romantic', lo: 1820, hi: 1910, genre: 'romantic', accent: '#ff5f64', glyph: '♪' },
      { name: '20th century', lo: 1910, hi: 3000, genre: 'romantic', accent: '#4fa3ff', glyph: '✶' }
    ];
    var withYear = SONGS.filter(function (s) { return s.year; });
    var rows = ERAS.map(function (e) {
      var pieces = withYear.filter(function (s) { return s.year >= e.lo && s.year < e.hi; });
      var comp = {}; pieces.forEach(function (s) { comp[s.composer] = (comp[s.composer] || 0) + 1; });
      var top = Object.keys(comp).sort(function (a, b) { return comp[b] - comp[a] || a.localeCompare(b); }).slice(0, 7);
      return { e: e, count: pieces.length, top: top };
    });
    var maxCount = rows.reduce(function (m, r) { return Math.max(m, r.count); }, 1);
    wrap.innerHTML = rows.map(function (r, i) {
      var e = r.e, range = e.lo === 0 ? 'before ' + e.hi : e.lo + '–' + (e.hi >= 3000 ? 'now' : e.hi);
      var bar = Math.max(5, Math.round(r.count / maxCount * 100));
      var chips = r.top.map(function (n) { return '<a class="chip" href="composer.html?name=' + encodeURIComponent(n) + '">' + n + '</a>'; }).join('');
      return '<div class="era-band" data-reveal data-delay="' + ((i % 4) + 1) + '" style="--accent:' + e.accent + '">' +
        '<div class="era-head">' +
          '<span class="era-glyph">' + e.glyph + '</span>' +
          '<div class="era-titles"><h2 class="era-name">' + e.name + '</h2><span class="era-range">' + range + ' · ' + r.count + ' pieces</span></div>' +
          '<a class="btn btn-ghost era-explore" href="library.html?filter=' + e.genre + '">Explore</a>' +
        '</div>' +
        '<div class="era-bar"><span style="width:' + bar + '%"></span></div>' +
        (chips ? '<div class="era-composers">' + chips + '</div>' : '') +
      '</div>';
    }).join('');
    reobserve(wrap);
  }

  /* ------------------------------ PIANO -------------------------------- */
  // Full-screen playable piano driven by the computer keyboard. Home row = naturals, top row = sharps.
  function initPiano() {
    var scroll = document.getElementById('piano-scroll');
    if (!scroll || !DRD.buildPiano || !DRD.Synth) return;
    var stage = document.getElementById('piano-stage');
    var RANGE = [2, 6];
    var built = DRD.buildPiano(scroll, RANGE, function (freq, keyEl, oct, midi) { DRD.Synth.note(freq); flash(keyEl, oct); recordHit(midi); });
    var keys = built.keys;
    var recording = false, recEvents = [], recStart = 0, recTimer = null;   // melody recorder state
    function recordHit(midi) { if (recording && midi != null) recEvents.push({ midi: midi, t: (performance.now() - recStart) / 1000, vel: 0.9, voice: DRD.Synth.voiceId }); }

    // computer-key → semitone offset from the base-octave C. Home row = white keys, top row = black keys.
    var MAP = [
      ['KeyA', 0, 'A'], ['KeyW', 1, 'W'], ['KeyS', 2, 'S'], ['KeyE', 3, 'E'], ['KeyD', 4, 'D'],
      ['KeyF', 5, 'F'], ['KeyT', 6, 'T'], ['KeyG', 7, 'G'], ['KeyY', 8, 'Y'], ['KeyH', 9, 'H'],
      ['KeyU', 10, 'U'], ['KeyJ', 11, 'J'], ['KeyK', 12, 'K'], ['KeyO', 13, 'O'], ['KeyL', 14, 'L'],
      ['KeyP', 15, 'P'], ['Semicolon', 16, ';']
    ];
    var byCode = {}; MAP.forEach(function (m) { byCode[m[0]] = m; });
    var baseOct = 4, labelsOn = true;
    var midiFor = function (m) { return (baseOct + 1) * 12 + m[1]; };

    function flash(el, oct) {
      var o = Math.max(2, Math.min(6, oct));
      el.classList.add('down', 'lit', 'lit-o' + o);
      setTimeout(function () { el.classList.remove('down', 'lit', 'lit-o' + o); }, 200);
    }
    function playMidi(midi) { var el = keys[midi]; if (!el) return; DRD.Synth.note(DRD.midiToFreq(midi)); flash(el, Math.floor(midi / 12) - 1); recordHit(midi); }
    function relabel() {
      for (var mid in keys) { var old = keys[mid].querySelector('.kbd-hint'); if (old) old.remove(); }
      if (labelsOn) MAP.forEach(function (m) {
        var el = keys[midiFor(m)]; if (!el) return;
        var b = document.createElement('b'); b.className = 'kbd-hint'; b.textContent = m[2]; el.appendChild(b);
      });
      var ol = document.getElementById('oct-label'); if (ol) ol.textContent = baseOct;
    }
    var shiftOct = function (d) { baseOct = Math.max(2, Math.min(5, baseOct + d)); relabel(); };

    var fit = function () { DRD.fitPiano(scroll, RANGE, stage); };
    fit(); relabel();
    window.addEventListener('resize', fit);

    var held = {};
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'KeyZ') { shiftOct(-1); e.preventDefault(); return; }
      if (e.code === 'KeyX') { shiftOct(1); e.preventDefault(); return; }
      var m = byCode[e.code]; if (!m) return;
      e.preventDefault();
      if (held[e.code]) return;                  // ignore key auto-repeat — a real piano key strikes once
      held[e.code] = true; playMidi(midiFor(m));
    });
    document.addEventListener('keyup', function (e) { delete held[e.code]; });

    var voiceSel = document.getElementById('piano-voice');
    if (voiceSel && DRD.Synth.VOICES) {
      voiceSel.innerHTML = DRD.Synth.VOICES.map(function (v) { return '<option value="' + v.id + '">' + v.name + '</option>'; }).join('');
      voiceSel.value = DRD.Synth.voiceId;
      voiceSel.addEventListener('change', function () { DRD.Synth.setVoice(this.value); });
    }
    var vol = document.getElementById('piano-vol');
    if (vol) vol.addEventListener('input', function () { DRD.Synth.ensure(); DRD.Synth.setVolume(+this.value); });
    var od = document.getElementById('oct-down'), ou = document.getElementById('oct-up');
    if (od) od.addEventListener('click', function () { shiftOct(-1); });
    if (ou) ou.addEventListener('click', function () { shiftOct(1); });
    var lt = document.getElementById('labels-toggle');
    if (lt) lt.addEventListener('click', function () {
      labelsOn = !labelsOn; this.textContent = 'Key hints: ' + (labelsOn ? 'on' : 'off');
      this.setAttribute('aria-pressed', String(labelsOn)); relabel();
    });

    var leg = document.getElementById('piano-legend');
    if (leg) { var h = ''; for (var o = RANGE[0]; o <= RANGE[1]; o++) h += '<span class="li"><span class="dot" style="background:var(--o' + o + ');color:var(--o' + o + ')"></span>Octave ' + o + '</span>'; leg.innerHTML = h; }

    // ---- metronome + count-in ----
    var metroBtn = document.getElementById('metro-toggle'), metroBpm = document.getElementById('metro-bpm'), metroVal = document.getElementById('metro-bpm-val');
    var metroOn = false, bpm = 100, metroTimer = null, beat = 0;
    function tickBeat() { DRD.Synth.tick(DRD.Synth.ctx ? DRD.Synth.ctx.currentTime : undefined, beat % 4 === 0); beat++; }
    function startMetro() { metroOn = true; beat = 0; DRD.Synth.ensure(); tickBeat(); metroTimer = setInterval(tickBeat, 60000 / bpm); if (metroBtn) { metroBtn.textContent = 'On'; metroBtn.classList.add('on'); metroBtn.setAttribute('aria-pressed', 'true'); } }
    function stopMetro() { metroOn = false; clearInterval(metroTimer); metroTimer = null; if (metroBtn) { metroBtn.textContent = 'Off'; metroBtn.classList.remove('on'); metroBtn.setAttribute('aria-pressed', 'false'); } }
    // 4-beat count-in at the current BPM, then run cb (used before recording when the metronome is on)
    function countInThen(cb) {
      DRD.Synth.ensure();
      var ctx = DRD.Synth.ctx, period = 60000 / bpm, t0 = ctx ? ctx.currentTime : 0, wasOn = metroOn;
      if (wasOn) { clearInterval(metroTimer); metroTimer = null; }
      for (var i = 0; i < 4; i++) DRD.Synth.tick(t0 + i * (period / 1000), i === 0);
      var n = 4; if (recTxt) recTxt.textContent = 'Count ' + n;
      var ci = setInterval(function () {
        n--;
        if (n > 0) { if (recTxt) recTxt.textContent = 'Count ' + n; }
        else { clearInterval(ci); if (wasOn) { beat = 0; metroTimer = setInterval(tickBeat, period); } cb(); }
      }, period);
    }
    if (metroBtn) metroBtn.addEventListener('click', function () { if (metroOn) stopMetro(); else startMetro(); });
    if (metroBpm) metroBpm.addEventListener('input', function () {
      bpm = +this.value || 100; if (metroVal) metroVal.textContent = bpm;
      if (metroOn) { clearInterval(metroTimer); metroTimer = setInterval(tickBeat, 60000 / bpm); }
    });

    // ---- melody recorder → play back / WAV / MIDI / share (fully client-side) ----
    var recBtn = document.getElementById('piano-rec'), wavBtn = document.getElementById('piano-wav'), playBtn = document.getElementById('piano-play');
    var midiBtn = document.getElementById('piano-midi');
    var recTxt = recBtn ? recBtn.querySelector('.rec-txt') : null;
    var elapsed = function (ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
    var setHaveRec = function (on) { [wavBtn, playBtn, midiBtn].forEach(function (b) { if (b) b.disabled = !on; }); };
    var playing = false, playTimers = [];
    function stopPlay() {
      playing = false; playTimers.forEach(clearTimeout); playTimers = [];
      if (playBtn) playBtn.textContent = '▶ Play';
      if (recBtn) recBtn.disabled = false;
    }
    function startPlay() {
      if (!recEvents.length) return;
      playing = true; DRD.Synth.ensure();
      if (playBtn) playBtn.textContent = '■ Stop';
      if (recBtn) recBtn.disabled = true;
      var last = 0;
      recEvents.forEach(function (e) {
        if (e.t > last) last = e.t;
        playTimers.push(setTimeout(function () {
          var el = keys[e.midi]; DRD.Synth.note(DRD.midiToFreq(e.midi)); if (el) flash(el, Math.floor(e.midi / 12) - 1);
        }, e.t * 1000));
      });
      playTimers.push(setTimeout(stopPlay, last * 1000 + 500));
    }
    function startRec() {
      if (playing) stopPlay();
      DRD.Synth.ensure();
      if (recBtn) recBtn.classList.add('recording');
      setHaveRec(false);
      var begin = function () {
        recording = true; recEvents = []; recStart = performance.now();
        if (recTxt) recTxt.textContent = 'Stop 0:00';
        recTimer = setInterval(function () { if (recTxt) recTxt.textContent = 'Stop ' + elapsed(performance.now() - recStart); }, 500);
      };
      if (metroOn) countInThen(begin); else begin();   // metronome on → 4-beat count-in, then capture
    }
    function stopRec() {
      recording = false; clearInterval(recTimer);
      if (recBtn) recBtn.classList.remove('recording');
      if (recTxt) recTxt.textContent = 'Record';
      setHaveRec(recEvents.length > 0);
    }
    if (recBtn) recBtn.addEventListener('click', function () { if (recording) stopRec(); else startRec(); });
    if (playBtn) playBtn.addEventListener('click', function () { if (playing) stopPlay(); else startPlay(); });
    if (wavBtn) wavBtn.addEventListener('click', function () {
      if (!recEvents.length || !DRD.renderMelodyWav) return;
      var self = this, prev = self.textContent; self.disabled = true; self.textContent = 'Rendering…';
      DRD.renderMelodyWav(recEvents).then(function (blob) {
        self.textContent = prev; self.disabled = false;
        if (blob && DRD.downloadBlob) DRD.downloadBlob('doredog-melody.wav', blob);
      }).catch(function () { self.textContent = prev; self.disabled = false; });
    });
    if (midiBtn) midiBtn.addEventListener('click', function () {
      if (!recEvents.length || !DRD.buildMIDIFromEvents || !DRD.downloadBlob) return;
      DRD.downloadBlob('doredog-melody.mid', new Blob([DRD.buildMIDIFromEvents(recEvents)], { type: 'audio/midi' }));
    });
  }

  /* ------------------------------ LEARN -------------------------------- */
  // "Letter notes in 5 steps" — each lesson is a tiny playable createPlayer example.
  function initLearn() {
    var root = document.getElementById('learn-page'); if (!root || !DRD.createPlayer) return;
    var lessons = [
      { n: 1, title: 'The white keys', sub: 'C-major scale', cps: 4, range: [4, 5], nota: '4|c-d-e-f-g-a-b-|\n5|--------------c-|' },
      { n: 2, title: 'Octaves & colour', sub: 'One note, three octaves', cps: 3, range: [3, 5], nota: '5|----c---|\n4|--c-----|\n3|c-------|' },
      { n: 3, title: 'The black keys', sub: 'Chromatic c → e', cps: 4, range: [4, 5], nota: '4|c-C-d-D-e-|' },
      { n: 4, title: 'Holding notes', sub: 'Long, then quick', cps: 4, range: [4, 5], nota: '4|c-------e-f-g---|' },
      { n: 5, title: 'Both hands', sub: 'Ode to Joy — opening', cps: 4, range: [3, 5], nota: 'RH 4|e-e-f-g-g-f-e-d-|\nLH 3|c-------g-------|' }
    ];
    lessons.forEach(function (l) {
      var el = document.getElementById('lesson-' + l.n); if (!el) return;
      DRD.createPlayer(el, { title: l.title, composer: 'Step ' + l.n + ' of 5 · ' + l.sub, cps: l.cps, notation: l.nota }, { pianoRange: l.range });
    });
    reobserve(root);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    if (page === 'home') initHome();
    else if (page === 'library') initLibrary();
    else if (page === 'song') initSong();
    else if (page === 'guide') initGuide();
    else if (page === 'learn') initLearn();
    else if (page === 'composer') initComposer();
    else if (page === 'collections') initCollections();
    else if (page === 'collection') initCollectionDetail();
    else if (page === 'timeline') initTimeline();
    else if (page === 'piano') initPiano();
  });
})();
