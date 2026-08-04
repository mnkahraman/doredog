/* ============================================================================
   The composer index — all 433 of them, A to Z, with the dates and nationality
   we could source and a count of what the library holds. Filter by letter or by
   country group; sort by name, by how much of them we have, or chronologically.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD || {};
  var rows = [], state = { letter: '', country: '', sort: 'name', q: '' };

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function flat(s) {
    s = String(s || '').toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
  }
  // sort key: surname where there plainly is one, so Bach lands under B and not J
  function sortKey(name) {
    var n = flat(name).replace(/^(the|a) /, '');
    var parts = n.split(' ').filter(Boolean);
    if (parts.length < 2) return n;
    var last = parts[parts.length - 1];
    var particles = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'du', 'le', 'la', 'ten', 'ter'];
    if (parts.length > 2 && particles.indexOf(parts[parts.length - 2]) > -1) last = parts[parts.length - 2] + ' ' + last;
    return last + ' ' + n;
  }

  function build() {
    var dates = DRD.COMPOSER_DATES || {};
    var counts = {}, easiest = {};
    (DRD.SONGS || []).forEach(function (s) {
      if (!s.composer) return;
      counts[s.composer] = (counts[s.composer] || 0) + 1;
      var ds = s.ds == null ? 50 : s.ds;
      if (!easiest[s.composer] || ds < easiest[s.composer].ds) easiest[s.composer] = { id: s.id, title: s.title, ds: ds };
    });
    rows = Object.keys(counts).map(function (name) {
      var d = dates[name] || null;
      return {
        name: name, n: counts[name], d: d,
        key: sortKey(name),
        letter: (sortKey(name)[0] || '#').toUpperCase(),
        country: d && d.cg ? d.cg[0] : '',
        easiest: easiest[name]
      };
    });
  }

  function render() {
    var list = rows.filter(function (r) {
      if (state.letter && r.letter !== state.letter) return false;
      if (state.country && r.country !== state.country) return false;
      if (state.q && flat(r.name).indexOf(state.q) < 0) return false;
      return true;
    });
    if (state.sort === 'pieces') list.sort(function (a, b) { return b.n - a.n || a.key.localeCompare(b.key); });
    else if (state.sort === 'born') list.sort(function (a, b) { return ((a.d && a.d.b) || 9999) - ((b.d && b.d.b) || 9999) || a.key.localeCompare(b.key); });
    else list.sort(function (a, b) { return a.key.localeCompare(b.key); });

    el('cx-count').textContent = list.length + ' of ' + rows.length + ' composers · ' +
      list.reduce(function (a, r) { return a + r.n; }, 0).toLocaleString('en-GB') + ' pieces';

    el('cx-list').innerHTML = list.map(function (r) {
      var d = r.d;
      return '<a class="cx-row" href="composer?name=' + encodeURIComponent(r.name) + '">' +
        '<span class="cx-name">' + esc(r.name) + '</span>' +
        '<span class="cx-life">' + (d ? d.b + '–' + d.d : '<i>dates not sourced</i>') + '</span>' +
        '<span class="cx-country">' + esc(r.country || '') + '</span>' +
        '<span class="cx-n">' + r.n + '</span>' +
      '</a>';
    }).join('') || '<p class="text-mute" style="padding:18px 2px">No composer matches that.</p>';
  }

  function init() {
    if (!el('cx-list') || !DRD.SONGS) return;
    build();

    // letters
    var letters = {};
    rows.forEach(function (r) { letters[r.letter] = (letters[r.letter] || 0) + 1; });
    el('cx-letters').innerHTML = '<button class="cx-key on" data-letter="">All</button>' +
      Object.keys(letters).sort().map(function (l) {
        return '<button class="cx-key" data-letter="' + l + '">' + l + '<span>' + letters[l] + '</span></button>';
      }).join('');

    // countries
    var cs = {};
    rows.forEach(function (r) { if (r.country) cs[r.country] = (cs[r.country] || 0) + 1; });
    var sel = el('cx-country');
    sel.innerHTML = '<option value="">Everywhere</option>' +
      Object.keys(cs).sort(function (a, b) { return cs[b] - cs[a] || a.localeCompare(b); })
        .map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + ' (' + cs[c] + ')</option>'; }).join('');

    el('cx-letters').addEventListener('click', function (e) {
      var b = e.target.closest('.cx-key'); if (!b) return;
      state.letter = b.getAttribute('data-letter');
      [].forEach.call(this.querySelectorAll('.cx-key'), function (k) { k.classList.toggle('on', k === b); });
      render();
    });
    sel.addEventListener('change', function () { state.country = this.value; render(); });
    el('cx-sort').addEventListener('change', function () { state.sort = this.value; render(); });
    el('cx-search').addEventListener('input', function () { state.q = flat(this.value.trim()); render(); });

    render();
  }

  global.DRDComposers = { init: init };
  if (global.document) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(window);
