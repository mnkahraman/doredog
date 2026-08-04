/* ============================================================================
   DoReDog — playable piece lists inside articles.

   The data-backed guides ("pieces with no black keys", "pieces that fit a
   49-key keyboard") are only worth reading if you can hear the pieces without
   leaving the page. A draft drops in a placeholder:

     <div class="drd-pieces" data-list="no-black-keys" data-show="24"></div>

   and this fills it from the frozen list in js/article-lists.js, using the same
   card the library uses. Long lists open with a "Show all" button rather than
   dumping a thousand cards into the DOM on load.
   ========================================================================== */
(function () {
  'use strict';
  var DRD = window.DRD || {};

  function byId(songs) {
    var map = {};
    for (var i = 0; i < songs.length; i++) map[songs[i].id] = songs[i];
    return map;
  }

  function render(el, songs, show) {
    var grid = el.querySelector('.song-grid');
    var slice = songs.slice(0, show);
    grid.innerHTML = slice.map(function (s, i) { return DRD.songCard(s, (i % 4) + 1); }).join('');
    var more = el.querySelector('.drd-pieces-more');
    if (songs.length > show) {
      more.hidden = false;
      more.textContent = 'Show all ' + songs.length.toLocaleString('en-GB') + ' pieces';
    } else {
      more.hidden = true;
    }
    // Tilt and the favourite heart are delegated on document, so injected cards
    // are already live. The reveal observer is not — it only sees what existed
    // at load — so show these outright rather than leave them invisible.
    Array.prototype.forEach.call(grid.querySelectorAll('[data-reveal]'), function (n) { n.classList.add('in'); });

    // And critically: reveal every [data-reveal] ANCESTOR of this list. Injecting
    // a grid of cards makes the surrounding <article> thousands of pixels tall,
    // and an element taller than the viewport can never reach the observer's
    // visibility threshold — so the whole page stayed at opacity 0 with all its
    // text present but invisible. Content must never depend on an animation
    // firing, so this does not wait for the observer.
    for (var p = el.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (p.hasAttribute && p.hasAttribute('data-reveal')) p.classList.add('in');
    }
  }

  function init() {
    var holders = document.querySelectorAll('.drd-pieces[data-list]');
    if (!holders.length) return;
    var LISTS = DRD.ARTICLE_LISTS || {};
    var map = byId(DRD.SONGS || []);

    Array.prototype.forEach.call(holders, function (el) {
      var ids = LISTS[el.getAttribute('data-list')] || [];
      var songs = [];
      for (var i = 0; i < ids.length; i++) if (map[ids[i]]) songs.push(map[ids[i]]);
      if (!songs.length) { el.hidden = true; return; }          // never leave an empty frame on the page

      var show = +(el.getAttribute('data-show') || 24);
      el.innerHTML = '<div class="song-grid"></div>' +
        '<button type="button" class="btn btn-ghost drd-pieces-more" hidden style="margin:20px auto 0;display:block"></button>';
      render(el, songs, show);

      el.querySelector('.drd-pieces-more').addEventListener('click', function () {
        render(el, songs, songs.length);
        this.hidden = true;
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
