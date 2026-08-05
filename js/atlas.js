/* ============================================================================
   The Atlas — five and a half centuries of the library on one map.

   Each composer is a bar spanning the years they lived, packed into rows so that
   nothing overlaps, coloured by period and thickened by how much of them the
   library holds. Time runs left to right; drag to pan, scroll or pinch to zoom.

   Every bar is real data: the lifespans are the sourced ones, the thickness is a
   piece count. Nothing here is decorative invention.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD || {};

  var BANDS = [
    ['Renaissance',    '#8fa8d8'],
    ['Baroque',        '#e0b84d'],
    ['Classical',      '#7fc4ff'],
    ['Romantic',       '#ff54b2'],
    ['Impressionist',  '#5fd8e6'],
    ['Ragtime',        '#f6b73f'],
    ['15th century',   '#6b7a99'],
    ['16th century',   '#7d8bab'],
    ['17th century',   '#9a8fc0'],
    ['18th century',   '#8b6bff'],
    ['19th century',   '#a99bff'],
    ['20th century',   '#35e08c'],
    ['Unknown',        '#5a5a6a']
  ];
  var COLOUR = {};
  BANDS.forEach(function (b) { COLOUR[b[0]] = b[1]; });

  var PAD_L = 8, ROW_H = 13, BAR_H = 8, GAP = 6;   // px, in map space
  var view = { x0: 0, x1: 0, drag: null };
  var rows = [], packed = [], filter = null, svg = null, host = null, hidden = 0;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* Greedy interval packing, done in PIXELS at the current zoom rather than in years.
     Packing in years reserved label room proportional to the name length, which at full
     zoom-out is hundreds of years wide — every composer landed in their own lane and the
     map came out 3,000px tall. In pixel space the rows stay dense when zoomed out, and
     names appear as you zoom in and the bars have room for them. */
  /* A lifespan Gantt cannot be short: in the 1800s over a hundred of these composers
     were alive at once, and non-overlapping rows need at least that many lanes. So the
     map shows the weightiest composers when zoomed out and reveals the rest as you zoom
     in — the same bargain Musicmap makes with its super-genres. */
  /* The gate hides the lighter composers when zoomed out. It kept the map short, but it
     also meant 250 of the 327 were unreachable without knowing to scroll-zoom and then
     hunt across five centuries — panning does not reveal them, because the gate depends
     on the zoom level and not on where you are. `showAll` turns it off: the map gets tall
     and the container scrolls, which is a fair trade for being able to see everyone. */
  var showAll = false;
  function minPieces(span) {
    if (showAll) return 0;
    return span > 420 ? 6 : span > 260 ? 4 : span > 150 ? 3 : span > 80 ? 2 : 1;
  }

  function pack(list, X) {
    var lanes = [], out = [];
    list.forEach(function (r) {
      var x = X(r.b), x2 = X(r.d), w = x2 - x;
      var labelled = w > 34;                                 // only then is there room to write the name
      var end = x2 + (labelled ? r.n.length * 4.9 + 12 : 4);
      var i;
      for (i = 0; i < lanes.length; i++) if (lanes[i] <= x) break;
      lanes[i] = end;
      out.push({ r: r, lane: i, x: x, x2: x2, labelled: labelled });
    });
    return { items: out, lanes: lanes.length };
  }

  function draw() {
    if (!svg) return;
    var w = host.clientWidth || 900;
    var span = view.x1 - view.x0;
    var scale = w / span;
    var X = function (year) { return (year - view.x0) * scale + PAD_L; };

    var floor = minPieces(span);
    var shown = rows.filter(function (r) { return r.c >= floor; });
    packed = pack(shown, X);                                 // lanes depend on zoom, so repack each draw
    var height = Math.max(240, packed.lanes * ROW_H + 40);
    hidden = rows.length - shown.length;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + height);
    svg.style.height = height + 'px';

    var parts = [];

    // century gridlines + labels
    var step = span > 400 ? 100 : span > 160 ? 50 : span > 60 ? 20 : 10;
    var first = Math.ceil(view.x0 / step) * step;
    for (var y = first; y <= view.x1; y += step) {
      var x = X(y);
      parts.push('<line class="atlas-grid" x1="' + x + '" y1="18" x2="' + x + '" y2="' + height + '"/>');
      parts.push('<text class="atlas-year" x="' + (x + 4) + '" y="13">' + y + '</text>');
    }

    packed.items.forEach(function (it) {
      var r = it.r, x = it.x, x2 = it.x2, yTop = 24 + it.lane * ROW_H;
      if (x2 < -120 || x > w + 240) return;                 // off-screen, skip
      var dim = filter && r.era !== filter;
      var thick = Math.min(BAR_H, 2.5 + Math.log(r.c + 1) * 1.9);
      parts.push(
        '<g class="atlas-bar' + (dim ? ' dim' : '') + '" data-name="' + esc(r.n) + '" tabindex="0">' +
          '<rect class="atlas-hit" x="' + (x - 3) + '" y="' + (yTop - 3) + '" width="' + Math.max(10, x2 - x + 6) + '" height="' + ROW_H + '"/>' +
          '<rect class="atlas-life" x="' + x + '" y="' + (yTop + (BAR_H - thick) / 2) + '" width="' + Math.max(2, x2 - x) + '" height="' + thick + '" rx="' + (thick / 2) + '" fill="' + COLOUR[r.era] + '"/>' +
          (it.labelled
            ? '<text class="atlas-name" x="' + (x2 + 5) + '" y="' + (yTop + BAR_H - 0.5) + '">' + esc(r.n) + (r.c > 8 ? ' <tspan class="atlas-n">' + r.c + '</tspan>' : '') + '</text>'
            : '') +
        '</g>');
    });

    svg.innerHTML = parts.join('');

    var note = el('atlas-zoomnote');
    if (note) note.textContent = hidden
      ? 'Showing ' + (rows.length - hidden) + ' of ' + rows.length + ' composers — zoom in, or tick “Show every composer”'
      : 'All ' + rows.length + ' composers shown' + (showAll ? ' — scroll the map to see them all' : '');
  }

  function panel(name) {
    var r = rows.filter(function (x) { return x.n === name; })[0];
    var p = el('atlas-panel');
    if (!r) { p.hidden = true; return; }
    var yrs = r.d - r.b;
    p.hidden = false;
    p.innerHTML =
      '<button class="atlas-close" aria-label="Close">×</button>' +
      '<span class="atlas-panel-era" style="--c:' + COLOUR[r.era] + '">' + esc(r.era) + '</span>' +
      '<h3>' + esc(r.n) + '</h3>' +
      '<p class="atlas-panel-life">' + r.b + ' – ' + r.d + ' · ' + yrs + ' years' + (r.e ? ' · ' + esc(r.e) + ' period' : '') + '</p>' +
      '<p class="atlas-panel-count"><b>' + r.c + '</b> ' + (r.c === 1 ? 'piece' : 'pieces') + ' in the library</p>' +
      (r.ez ? '<a class="atlas-panel-link" href="song?id=' + esc(r.ez[0]) + '">Easiest: ' + esc(r.ez[1]) + '</a>' : '') +
      (r.kn && (!r.ez || r.kn[0] !== r.ez[0]) ? '<a class="atlas-panel-link" href="song?id=' + esc(r.kn[0]) + '">Best known: ' + esc(r.kn[1]) + '</a>' : '') +
      '<a class="atlas-panel-all" href="composer?name=' + encodeURIComponent(r.n) + '">All ' + r.c + ' →</a>';
    p.querySelector('.atlas-close').addEventListener('click', function () { p.hidden = true; });
  }

  /* --------------------------------------------------------------- input */
  function zoomAt(clientX, factor) {
    var rect = host.getBoundingClientRect();
    var frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    var span = view.x1 - view.x0;
    var focus = view.x0 + span * frac;
    var next = Math.max(25, Math.min(rows.length ? (DRD.ATLAS.span.to - DRD.ATLAS.span.from + 40) : 600, span * factor));
    view.x0 = focus - next * frac;
    view.x1 = view.x0 + next;
    clampView();
    draw();
  }
  function clampView() {
    var lo = DRD.ATLAS.span.from - 20, hi = DRD.ATLAS.span.to + 20;
    var span = view.x1 - view.x0;
    if (view.x0 < lo) { view.x0 = lo; view.x1 = lo + span; }
    if (view.x1 > hi) { view.x1 = hi; view.x0 = hi - span; }
    if (view.x0 < lo) view.x0 = lo;
  }

  function bind() {
    host.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;   // let horizontal trackpad scroll pan
      e.preventDefault();
      zoomAt(e.clientX, e.deltaY > 0 ? 1.12 : 0.89);
    }, { passive: false });

    host.addEventListener('pointerdown', function (e) {
      var g = e.target.closest && e.target.closest('.atlas-bar');
      view.drag = { x: e.clientX, x0: view.x0, x1: view.x1, moved: 0, hit: g ? g.getAttribute('data-name') : null };
      host.setPointerCapture(e.pointerId);
    });
    host.addEventListener('pointermove', function (e) {
      if (!view.drag) return;
      var dx = e.clientX - view.drag.x;
      view.drag.moved = Math.max(view.drag.moved, Math.abs(dx));
      var years = (view.drag.x1 - view.drag.x0) * (dx / (host.clientWidth || 900));
      view.x0 = view.drag.x0 - years; view.x1 = view.drag.x1 - years;
      clampView(); draw();
    });
    host.addEventListener('pointerup', function (e) {
      if (view.drag && view.drag.moved < 4 && view.drag.hit) panel(view.drag.hit);
      view.drag = null;
      try { host.releasePointerCapture(e.pointerId); } catch (err) {}
    });
    svg.addEventListener('keydown', function (e) {
      var g = e.target.closest && e.target.closest('.atlas-bar');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); panel(g.getAttribute('data-name')); }
    });
    global.addEventListener('resize', draw);
  }

  /* ----------------------------------------------------------------- run */
  function init() {
    host = el('atlas'); if (!host || !DRD.ATLAS) return;
    rows = DRD.ATLAS.rows;
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'atlas-svg');
    host.appendChild(svg);

    view.x0 = DRD.ATLAS.span.from - 10;
    view.x1 = DRD.ATLAS.span.to + 10;
    bind();
    draw();

    // legend, only for the bands actually present
    var present = {};
    rows.forEach(function (r) { present[r.era] = (present[r.era] || 0) + 1; });
    el('atlas-legend').innerHTML = BANDS.filter(function (b) { return present[b[0]]; }).map(function (b) {
      return '<button class="atlas-key" data-era="' + esc(b[0]) + '" style="--c:' + b[1] + '">' +
        '<i></i>' + esc(b[0]) + '<span>' + present[b[0]] + '</span></button>';
    }).join('');
    el('atlas-legend').addEventListener('click', function (e) {
      var b = e.target.closest('.atlas-key'); if (!b) return;
      var era = b.getAttribute('data-era');
      filter = (filter === era) ? null : era;
      [].forEach.call(this.querySelectorAll('.atlas-key'), function (k) {
        k.classList.toggle('on', filter && k.getAttribute('data-era') === filter);
      });
      draw();
    });

    // search — jump the view to a composer and open their panel
    var find = el('atlas-find');
    if (find) find.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      var sug = el('atlas-suggest');
      if (!q) { sug.innerHTML = ''; return; }
      var hits = rows.filter(function (r) { return r.n.toLowerCase().indexOf(q) > -1; }).slice(0, 6);
      sug.innerHTML = hits.map(function (r) {
        return '<button data-name="' + esc(r.n) + '">' + esc(r.n) + '<i>' + r.b + '–' + r.d + ' · ' + r.c + '</i></button>';
      }).join('');
    });
    var sug = el('atlas-suggest');
    if (sug) sug.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-name]'); if (!b) return;
      var name = b.getAttribute('data-name');
      var r = rows.filter(function (x) { return x.n === name; })[0];
      if (r) {
        var mid = (r.b + r.d) / 2, span = Math.max(90, (r.d - r.b) * 3);
        view.x0 = mid - span / 2; view.x1 = mid + span / 2;
        // A composer with one or two pieces is below the gate even at this zoom, so the
        // search would jump to an empty patch of map. Lift the gate when that would happen.
        if (r.c < minPieces(span)) {
          showAll = true;
          var box = el('atlas-showall'); if (box) box.checked = true;
        }
        clampView(); draw();
      }
      panel(name);
      this.innerHTML = ''; el('atlas-find').value = '';
    });

    // zoom buttons — scroll-to-zoom is undiscoverable, and on a trackpad it fights the page
    var zin = el('atlas-in'), zout = el('atlas-out');
    function zoomCentre(f) {
      var rect = host.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, f);
    }
    if (zin) zin.addEventListener('click', function () { zoomCentre(0.7); });
    if (zout) zout.addEventListener('click', function () { zoomCentre(1.43); });

    var all = el('atlas-showall');
    if (all) all.addEventListener('change', function () {
      showAll = this.checked;
      draw();
      if (showAll && host) host.scrollTop = 0;
    });

    var reset = el('atlas-reset');
    if (reset) reset.addEventListener('click', function () {
      view.x0 = DRD.ATLAS.span.from - 10; view.x1 = DRD.ATLAS.span.to + 10;
      filter = null;
      if (all) { all.checked = false; showAll = false; }
      [].forEach.call(el('atlas-legend').querySelectorAll('.atlas-key'), function (k) { k.classList.remove('on'); });
      draw();
    });

    el('atlas-summary').textContent =
      rows.length + ' composers · ' + rows.reduce(function (a, r) { return a + r.c; }, 0).toLocaleString('en-GB') +
      ' pieces · ' + DRD.ATLAS.span.from + ' to ' + DRD.ATLAS.span.to;
  }

  global.DRDAtlas = { init: init };
  if (global.document) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(window);
