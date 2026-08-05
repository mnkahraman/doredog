/* ============================================================================
   Cookie consent + Google Consent Mode v2.

   This file must load SYNCHRONOUSLY and BEFORE the AdSense tag, because
   Consent Mode only works if the defaults are set before the ad script asks.
   Defaults are "denied" for every advertising signal, so nothing personalised
   can run until a visitor says yes.

   It defers completely to a certified CMP. Google's own GDPR message (free,
   configured under Privacy & messaging in the AdSense dashboard) registers
   window.__tcfapi; when that exists, this banner never shows and never touches
   consent state. That is the arrangement to aim for in the EEA and the UK —
   this banner is the honest fallback everywhere else, not a substitute for
   certification.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'drd-consent';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}

  // Defaults go out before anything else on the page, every load.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  if (stored === 'all') grantAll();

  function grantAll() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }

  function remember(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  function build() {
    // a certified CMP owns this decision if one is present
    if (window.__tcfapi || stored) return;

    var bar = document.createElement('div');
    bar.className = 'drd-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie choices');
    bar.innerHTML =
      '<div class="drd-consent-inner">' +
        '<p>DoReDog is free because of advertising. With your consent, our ad partner Google may use cookies to personalise the ads you see. Decline and you still get the whole site — just less relevant ads. ' +
        '<a href="privacy.html">How we handle data</a>.</p>' +
        '<div class="drd-consent-btns">' +
          '<button type="button" class="btn btn-ghost" id="drd-consent-no">Essential only</button>' +
          '<button type="button" class="btn btn-primary" id="drd-consent-yes">Accept all</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bar);
    // setTimeout, not requestAnimationFrame: rAF is throttled to a stop in a
    // background or unpainted tab, and a consent bar that never slides up is a
    // consent bar that never gets answered.
    setTimeout(function () { bar.classList.add('in'); }, 50);

    function close(value) {
      if (value === 'all') grantAll();
      remember(value);
      bar.classList.remove('in');
      setTimeout(function () { bar.remove(); }, 300);
    }
    document.getElementById('drd-consent-yes').addEventListener('click', function () { close('all'); });
    document.getElementById('drd-consent-no').addEventListener('click', function () { close('essential'); });
  }

  if (document.readyState !== 'loading') build();
  else document.addEventListener('DOMContentLoaded', build);
})();
