/* ============================================================================
   Ad slots — one place that decides what an ad container becomes.

   Every page carries <div class="ad-slot" data-ad="KIND"> containers with an
   "Advertisement" label above them. Until this file, those rendered a dashed
   box reading "paste your AdSense unit here" — visible placeholder text on 73
   pages, which reads to a human reviewer as an unfinished site.

   Now: a container renders a real <ins class="adsbygoogle"> only when a slot
   id exists for its kind in SLOTS below. With no slot id — today — the
   container AND its label are removed from the page entirely, so nothing
   half-built is ever shown.

   To go live: create the ad units in the AdSense dashboard, paste each unit's
   data-ad-slot number into SLOTS, ship. Nothing else changes.
   (Auto ads, if switched on in the dashboard, work regardless of this file.)
   ========================================================================== */
(function () {
  'use strict';
  var CLIENT = 'ca-pub-9610317354666717';

  // kind -> AdSense data-ad-slot id. Empty string = not configured yet.
  var SLOTS = {
    'leaderboard': '',
    'in-article': ''
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var boxes = document.querySelectorAll('.ad-slot[data-ad]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var kind = box.getAttribute('data-ad');
      var slot = SLOTS[kind];

      // the "Advertisement" caption is the container's previous sibling
      var label = box.previousElementSibling;
      if (label && !label.classList.contains('ad-label')) label = null;

      if (!slot) {
        // Not configured: take the whole block out. An empty labelled box is
        // worse than no box — it advertises that the site is unfinished.
        if (label) label.remove();
        box.remove();
        continue;
      }

      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', CLIENT);
      ins.setAttribute('data-ad-slot', slot);
      if (kind === 'in-article') {
        ins.setAttribute('data-ad-format', 'fluid');
        ins.setAttribute('data-ad-layout', 'in-article');
      } else {
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
      }
      box.textContent = '';
      box.classList.add('ad-live');
      box.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    }
  });
})();
