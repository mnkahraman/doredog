/* ============================================================================
   DoReDog — Shared site chrome & interactions
   Injects the header/footer, handles nav state, cursor spotlight, reveals.
   ========================================================================== */
(function () {
  'use strict';

  var MARK =
    '<svg class="mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="2" y="2" width="36" height="36" rx="11" fill="#0c0c16" stroke="rgba(255,255,255,.12)"/>' +
    '<g stroke-linecap="round">' +
    '<line x1="11" y1="26" x2="11" y2="16" stroke="#ff54b2" stroke-width="3"/>' +
    '<line x1="16.5" y1="26" x2="16.5" y2="12" stroke="#35e08c" stroke-width="3"/>' +
    '<line x1="22" y1="26" x2="22" y2="18" stroke="#f6b73f" stroke-width="3"/>' +
    '<line x1="27.5" y1="26" x2="27.5" y2="14" stroke="#4fa3ff" stroke-width="3"/>' +
    '</g>' +
    '<circle cx="30.5" cy="12" r="2.4" fill="#f4c15d"/>' +
    '</svg>';

  // Doré — the DoReDog mascot: a music-loving pup in headphones (placeholder art;
  // swap for generated illustration per IMAGE_PROMPTS.md).
  var MASCOT =
    '<svg class="mascot-svg" viewBox="0 0 128 132" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Doré, the DoReDog mascot">' +
    '<defs>' +
      '<linearGradient id="drdFur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7dcab"/><stop offset="1" stop-color="#e4b374"/></linearGradient>' +
      '<linearGradient id="drdBand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f4c15d"/><stop offset="0.5" stop-color="#ff54b2"/><stop offset="1" stop-color="#8b6bff"/></linearGradient>' +
    '</defs>' +
    '<ellipse cx="33" cy="70" rx="12" ry="23" transform="rotate(-15 33 70)" fill="#c9884b"/>' +
    '<ellipse cx="95" cy="70" rx="12" ry="23" transform="rotate(15 95 70)" fill="#c9884b"/>' +
    '<ellipse cx="64" cy="68" rx="33" ry="35" fill="url(#drdFur)"/>' +
    '<path d="M30 56 A35 35 0 0 1 98 56" stroke="url(#drdBand)" stroke-width="7.5" fill="none" stroke-linecap="round"/>' +
    '<rect x="23" y="52" width="15" height="27" rx="7.5" fill="#8b6bff"/>' +
    '<rect x="90" y="52" width="15" height="27" rx="7.5" fill="#4dd0ff"/>' +
    '<ellipse cx="64" cy="84" rx="17" ry="13" fill="#fbeccd"/>' +
    '<circle cx="52" cy="66" r="4.7" fill="#2a2233"/><circle cx="76" cy="66" r="4.7" fill="#2a2233"/>' +
    '<circle cx="53.6" cy="64.3" r="1.5" fill="#fff"/><circle cx="77.6" cy="64.3" r="1.5" fill="#fff"/>' +
    '<ellipse cx="64" cy="78" rx="6.2" ry="4.8" fill="#2a2233"/>' +
    '<path d="M64 82 v6 M64 88 q-5.5 3 -8.5 -1 M64 88 q5.5 3 8.5 -1" stroke="#2a2233" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<g transform="translate(96 88)"><circle cx="0" cy="7" r="5" fill="#f6b73f"/><path d="M4 7 V-9 q9 0 9 7" stroke="#f6b73f" stroke-width="3" fill="none" stroke-linecap="round"/></g>' +
    '</svg>';

  var NAV = [
    ['index.html', 'Home'],
    ['library.html', 'Library'],
    ['piano.html', 'Piano'],
    ['collections.html', 'Collections'],
    ['timeline.html', 'Timeline'],
    ['learn.html', 'Learn'],
    ['about.html', 'About'],
    ['contact.html', 'Contact']
  ];

  function page() {
    var p = location.pathname.split('/').pop();
    return p === '' ? 'index.html' : p;
  }

  function buildHeader() {
    var here = page();
    var links = NAV.map(function (n) {
      var active = n[0] === here ? ' class="active"' : '';
      return '<a href="' + n[0] + '"' + active + '>' + n[1] + '</a>';
    }).join('');
    return (
      '<div class="container"><nav class="nav">' +
        '<a class="brand" href="index.html">' + MARK + '<span>Do<b>Re</b>Dog</span></a>' +
        '<div class="nav-links">' + links + '</div>' +
        '<div class="nav-cta">' +
          '<a class="btn btn-primary" href="library.html">Browse Library</a>' +
          '<button class="nav-toggle" aria-label="Menu"><span></span></button>' +
        '</div>' +
      '</nav></div>'
    );
  }

  function buildFooter() {
    var year = document.documentElement.getAttribute('data-year') || '2026';
    return (
      '<div class="container"><div class="footer-grid">' +
        '<div class="footer-col footer-about">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<a class="brand" href="index.html">' + MARK + '<span>Do<b>Re</b>Dog</span></a>' +
            '<span class="dsticker s1 bob" role="img" aria-label="Doré, the DoReDog mascot" style="width:50px;flex:none"></span>' +
          '</div>' +
          '<p>Play any melody with letters. A cinematic, free library of piano letter notes with a built-in live player.</p>' +
          '<div class="spectrum-bar" style="margin-top:18px">' +
            '<i style="background:var(--o2)"></i><i style="background:var(--o3)"></i><i style="background:var(--o4)"></i><i style="background:var(--o5)"></i><i style="background:var(--o6)"></i>' +
          '</div>' +
        '</div>' +
        '<div class="footer-col"><h4>Explore</h4>' +
          '<a href="library.html">Library</a><a href="guide.html">How to Read</a><a href="index.html#featured">Featured</a><a href="library.html#new">New Arrivals</a></div>' +
        '<div class="footer-col"><h4>Company</h4>' +
          '<a href="about.html">About</a><a href="contact.html">Contact</a><a href="mailto:mnkahraman@gmail.com">mnkahraman@gmail.com</a></div>' +
        '<div class="footer-col"><h4>Legal</h4>' +
          '<a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms of Use</a><a href="contact.html">Copyright / DMCA</a></div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<span>© ' + year + ' DoReDog · doredog.com — All rights reserved.</span>' +
        '<span>Made for people who play by ear.</span>' +
      '</div></div>'
    );
  }

  function mountChrome() {
    var h = document.getElementById('site-header');
    if (h) { h.className = 'site-header'; h.innerHTML = buildHeader(); }
    var f = document.getElementById('site-footer');
    if (f) { f.className = 'site-footer'; f.innerHTML = buildFooter(); }

    // ambient layers (added once)
    if (!document.querySelector('.bg-aurora')) {
      ['bg-aurora', 'bg-rays', 'bg-grid', 'bg-vignette', 'bg-grain'].forEach(function (c) {
        var d = document.createElement('div'); d.className = c; document.body.appendChild(d);
      });
      var spot = document.createElement('div'); spot.className = 'spotlight'; document.body.appendChild(spot);
    }

    // drop the mascot (real art, SVG fallback) into any placeholder
    var slots = document.querySelectorAll('[data-mascot]');
    for (var i = 0; i < slots.length; i++) if (!slots[i].firstChild) injectMascot(slots[i]);
    // favicon → Doré
    var fav = document.querySelector('link[rel="icon"]');
    if (fav) fav.href = 'assets/mascot/dore-favicon.webp';

    wireHeader();
    wireSpotlight();
    wireReveal();
    wireParallax();
    wireTilt();
  }

  /* --------- pointer parallax: writes smoothed --mx/--my (-1..1) on :root --------- */
  function wireParallax() {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches || matchMedia('(pointer:coarse)').matches) return;
    var root = document.documentElement, tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function apply() {
      raf = 0;
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      root.style.setProperty('--mx', cx.toFixed(3));
      root.style.setProperty('--my', cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(apply);
    }
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* --------- 3D tilt: any [data-tilt] element leans toward the cursor --------- */
  function wireTilt() {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches || matchMedia('(pointer:coarse)').matches) return;
    var MAX = 6;
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('[data-tilt]');
      if (!el) return;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((px - 0.5) * 2 * MAX).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-(py - 0.5) * 2 * MAX).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      var el = e.target.closest && e.target.closest('[data-tilt]');
      if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    }, { passive: true });
  }

  function wireHeader() {
    var header = document.getElementById('site-header');
    if (!header) return;
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 20); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    var toggle = header.querySelector('.nav-toggle');
    if (toggle) toggle.addEventListener('click', function () { header.classList.toggle('nav-open'); });
  }

  function wireSpotlight() {
    var spot = document.querySelector('.spotlight');
    if (!spot || matchMedia('(pointer:coarse)').matches) return;
    window.addEventListener('pointermove', function (e) {
      spot.style.opacity = '1';
      spot.style.left = e.clientX + 'px';
      spot.style.top = e.clientY + 'px';
    });
  }

  function wireReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  function injectMascot(el) {
    var variant = el.getAttribute('data-mascot') || 'wave';
    var img = document.createElement('img');
    img.className = 'mascot-img'; img.alt = 'Doré, the DoReDog mascot'; img.decoding = 'async';
    img.src = 'assets/mascot/dore-' + variant + '.webp';
    img.onerror = function () { el.innerHTML = MASCOT; };   // fall back to inline SVG art
    el.appendChild(img);
  }

  /* --------- reusable: song card markup + mascot --------- */
  window.DRD = window.DRD || {};
  window.DRD.MASCOT = MASCOT;

  // Generative cover art: render the piece's melody fingerprint (song.fp) as octave-coloured bars.
  // Zero image files — every one of the 700+ pieces gets a unique cover derived from its own notes.
  var OCT_HEX = { 2: '#ff54b2', 3: '#35e08c', 4: '#ff5f64', 5: '#f6b73f', 6: '#4fa3ff' };
  function fingerprintSVG(fp) {
    if (!fp) return '';
    var v = [], i;
    for (i = 0; i < fp.length; i++) v.push(fp.charCodeAt(i) - 33 + 24);   // decode -> MIDI
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v), range = Math.max(6, max - min);
    var N = v.length, bw = 100 / N, bars = '';
    for (i = 0; i < N; i++) {
      var h = 7 + (v[i] - min) / range * 30;                              // 7..37 of a 42 tall box
      var oct = Math.max(2, Math.min(6, Math.floor(v[i] / 12) - 1));
      bars += '<rect x="' + (i * bw + bw * 0.16).toFixed(2) + '" y="' + (42 - h).toFixed(2) +
        '" width="' + (bw * 0.68).toFixed(2) + '" height="' + h.toFixed(2) +
        '" rx="' + Math.min(1.3, bw * 0.34).toFixed(2) + '" fill="' + OCT_HEX[oct] + '"/>';
    }
    return '<svg class="cover-fp" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">' + bars + '</svg>';
  }
  window.DRD.coverArt = function (song) {
    var c = song.cover || {};
    if (c.image) return { cls: 'cover-art has-img', style: 'background-image:url(' + c.image + ')', inner: '', img: true };
    var style = 'background:radial-gradient(120% 120% at 22% 8%, ' + (c.mid || '#8b6bff') + '44, transparent 60%),' +
      'linear-gradient(150deg, ' + (c.from || '#3a1c71') + ', ' + (c.to || '#12122a') + ')';
    // atmosphere tile from the mood atlas (if the atlas image is present), tinted by the composer colour,
    // sits under the melody fingerprint. Degrades gracefully to the pure gradient when the atlas is absent.
    var mood = (song.mood != null) ? '<div class="cover-mood m' + song.mood + '" style="--tint:' + (c.mid || '#8b6bff') + '"></div>' : '';
    return { cls: 'cover-art', style: style, inner: mood + fingerprintSVG(song.fp) + '<span class="cover-glyph">' + (c.glyph || '♪') + '</span>', img: false };
  };

  // ---- localStorage: favourites + recently-played (no account needed) ----
  function lsGet(k) { try { return JSON.parse(window.localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function lsSet(k, a) { try { window.localStorage.setItem(k, JSON.stringify(a)); } catch (e) {} }
  window.DRD.favs = {
    all: function () { return lsGet('drd-favs'); },
    has: function (id) { return this.all().indexOf(id) > -1; },
    toggle: function (id) { var a = this.all(), i = a.indexOf(id); if (i > -1) a.splice(i, 1); else a.unshift(id); lsSet('drd-favs', a); return i < 0; }
  };
  window.DRD.recent = {
    all: function () { return lsGet('drd-recent'); },
    push: function (id) { var a = this.all().filter(function (x) { return x !== id; }); a.unshift(id); lsSet('drd-recent', a.slice(0, 24)); }
  };
  var HEART = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  window.DRD.fmtDur = function (s) { if (!s) return ''; var m = Math.floor(s / 60), ss = s % 60; return m + ':' + (ss < 10 ? '0' : '') + ss; };
  window.DRD.favBtn = function (id) { return '<button class="fav-btn' + (DRD.favs.has(id) ? ' on' : '') + '" data-fav="' + id + '" aria-label="Save to favourites" title="Save to favourites">' + HEART + '</button>'; };

  window.DRD.songCard = function (song, delay) {
    var art = DRD.coverArt(song);
    return (
      '<a class="card song-card tilt" data-tilt href="song?id=' + song.id + '" data-reveal data-delay="' + (delay || 1) + '">' +
        '<div class="cover' + (art.img ? ' img-cover' : '') + '"><div class="' + art.cls + '" style="' + art.style + '">' + art.inner +
        '</div>' +
          DRD.favBtn(song.id) +
          (song.dur ? '<span class="dur-badge">' + DRD.fmtDur(song.dur) + '</span>' : '') +
          '<div class="play-badge"><svg viewBox="0 0 24 24" fill="currentColor" width="18"><path d="M8 5v14l11-7z"/></svg></div>' +
        '</div>' +
        '<div class="meta">' +
          '<h3>' + song.title + '</h3>' +
          '<div class="sub">' + song.composer + (song.year ? ' · ' + (song.circa ? 'c. ' : '') + song.year : '') + '</div>' +
          '<div class="tags">' +
            '<span class="chip diff-' + song.difficulty + '">' + song.difficulty + '</span>' +
            '<span class="chip">' + song.genre + '</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  };

  // ---- Curated collections (rule-based over the whole catalogue) ----------
  // Each collection is a predicate; membership is derived live so new pieces flow in automatically.
  var WOMEN = { 'Clara Schumann': 1, 'Cécile Chaminade': 1, 'Teresa Carreño': 1, 'Louise Farrenc': 1,
    'Lili Boulanger': 1, 'Mel Bonis': 1, 'Florence Price': 1, 'Ethel Smyth': 1, 'Fanny Mendelssohn': 1,
    'Fanny Hensel': 1, 'Amy Beach': 1, 'Maria Szymanowska': 1, 'Agathe Backer Grøndahl': 1 };
  var CALM_RE = /nocturne|lullab|berceuse|r[eê]verie|reverie|clair|gymnop|romance|serenade|barcarolle|tr[aä]umerei/i;
  var WED_RE = /canon in d|ave maria|wedding|bridal|jesu, joy|jesu joy|panis angelicus|air on the g/i;
  var XMAS_RE = /christmas|no[eë]l|carol|silent night|jingle|holy night|wenceslas|adeste|first noel|ding dong|we three|greensleeves/i;
  var STUDY_RE = /[eé]tude|study|inventio|invention/i;
  window.DRD.COLLECTIONS = [
    { slug: 'first-steps', title: 'First Steps', glyph: '✿', accent: '#35e08c',
      sub: 'Gentle, easy pieces to begin with — the least demanding letter notes in the library.',
      match: function (s) { return s.difficulty === 'easy'; } },
    { slug: 'calm-evening', title: 'Calm Evening', glyph: '☾', accent: '#8b6bff',
      sub: 'Nocturnes, reveries and lullabies to wind the night down.',
      match: function (s) { return CALM_RE.test(s.title); } },
    { slug: 'women-composers', title: 'Women Composers', glyph: '❀', accent: '#ff54b2',
      sub: 'Clara Schumann, Chaminade, Boulanger, Price and more — voices long overlooked.',
      match: function (s) { return WOMEN[s.composer] === 1; } },
    { slug: 'baroque-counterpoint', title: 'Baroque Counterpoint', glyph: '𝄞', accent: '#e0b84d',
      sub: 'Bach, Handel and Scarlatti — the age of the fugue and the dance suite.',
      match: function (s) { return s.genre === 'Baroque'; } },
    { slug: 'virtuoso-fireworks', title: 'Virtuoso Fireworks', glyph: '✦', accent: '#ff5f64',
      sub: 'Storming showpieces for when you want a real challenge.',
      match: function (s) { return s.difficulty === 'hard' && (s.mood === 2 || /Liszt|Rachmaninoff|Paganini|Chopin|Alkan|Scriabin/.test(s.composer)); } },
    { slug: 'impressionist-colours', title: 'Impressionist Colours', glyph: '❖', accent: '#5fd8e6',
      sub: 'Debussy, Satie and Fauré — music made of light and haze.',
      match: function (s) { return s.genre === 'Impressionist'; } },
    { slug: 'ragtime-parlour', title: 'Ragtime Parlour', glyph: '♫', accent: '#f6b73f',
      sub: 'Syncopated rags and struts from the ragtime age.',
      match: function (s) { return s.genre === 'Ragtime' || /Joplin|Scott Joplin/.test(s.composer); } },
    { slug: 'wedding-ceremony', title: 'Wedding & Ceremony', glyph: '⟡', accent: '#f4d06a',
      sub: 'Canon in D, Ave Maria, Jesu Joy — music for the aisle and the altar.',
      match: function (s) { return WED_RE.test(s.title); } },
    { slug: 'christmas-carols', title: 'Christmas & Carols', glyph: '❄', accent: '#7fc4ff',
      sub: 'Carols and Christmas favourites, ready to play in letter notes.',
      match: function (s) { return XMAS_RE.test(s.title); } },
    { slug: 'etudes-studies', title: 'Études & Studies', glyph: '◈', accent: '#8fa8d8',
      sub: 'Inventions and studies that quietly build real technique.',
      match: function (s) { return STUDY_RE.test(s.title); } }
  ];
  window.DRD.getCollection = function (slug) {
    return DRD.COLLECTIONS.filter(function (c) { return c.slug === slug; })[0] || null;
  };
  // members, best-first: featured, then those with a bespoke cover image, then chronological.
  window.DRD.collectionSongs = function (slug, cap) {
    var c = DRD.getCollection(slug); if (!c) return [];
    var list = (DRD.SONGS || []).filter(c.match);
    list.sort(function (a, b) {
      var fa = a.featured ? 1 : 0, fb = b.featured ? 1 : 0; if (fa !== fb) return fb - fa;
      var ia = (a.cover && a.cover.image) ? 1 : 0, ib = (b.cover && b.cover.image) ? 1 : 0; if (ia !== ib) return ib - ia;
      return (a.year || 3000) - (b.year || 3000) || a.title.localeCompare(b.title);
    });
    return cap ? list.slice(0, cap) : list;
  };

  // ---- Mood atlas labels (0..11) — a second, atmospheric browse axis --------
  window.DRD.MOODS = [
    { label: 'Nocturnes', accent: '#8b6bff' }, { label: 'Baroque Gold', accent: '#e0b84d' },
    { label: 'Storm & Fire', accent: '#ff5f64' }, { label: 'Impressionist Haze', accent: '#5fd8e6' },
    { label: 'Spanish Amber', accent: '#f0a94e' }, { label: 'Sacred Light', accent: '#f4e7c3' },
    { label: 'Ballet Blue', accent: '#4fa3ff' }, { label: 'Romance', accent: '#ff54b2' },
    { label: 'Salon Sparkle', accent: '#f6b73f' }, { label: 'Nordic Forest', accent: '#35e08c' },
    { label: 'Ragtime Amber', accent: '#e0a13a' }, { label: 'Twilight & Song', accent: '#9a7cff' }
  ];

  // ---- Melodic similarity (for "More like this") ----------------------------
  // Compare two 28-char contour fingerprints, key-invariant: subtract each one's own mean, then
  // sum absolute differences. Lower = closer melodic shape. Returns a big number if either is missing.
  function fpVec(fp) {
    var v = [], sum = 0, i;
    for (i = 0; i < fp.length; i++) { var n = fp.charCodeAt(i) - 33; v.push(n); sum += n; }
    var mean = sum / v.length;
    for (i = 0; i < v.length; i++) v[i] -= mean;
    return v;
  }
  window.DRD.similar = function (song, count) {
    if (!song || !song.fp) return [];
    var base = fpVec(song.fp), N = base.length;
    var scored = (DRD.SONGS || []).map(function (s) {
      if (s.id === song.id || !s.fp || s.fp.length !== song.fp.length) return null;
      var v = fpVec(s.fp), d = 0;
      for (var i = 0; i < N; i++) d += Math.abs(base[i] - v[i]);
      if (s.composer === song.composer) d += 6;   // nudge toward variety across composers
      if (s.mood !== song.mood) d += 4;            // slight bonus for a shared atmosphere
      return { s: s, d: d };
    }).filter(Boolean);
    scored.sort(function (a, b) { return a.d - b.d; });
    return scored.slice(0, count || 6).map(function (x) { return x.s; });
  };

  // one delegated handler for every heart on the page (cards are HTML strings)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.fav-btn'); if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    var id = btn.getAttribute('data-fav'), on = DRD.favs.toggle(id);
    document.querySelectorAll('.fav-btn[data-fav="' + id + '"]').forEach(function (b) { b.classList.toggle('on', on); });
  });

  document.addEventListener('DOMContentLoaded', mountChrome);
})();
