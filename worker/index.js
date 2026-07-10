// Edge SEO Worker — injects per-song <title>, meta description, canonical, Open Graph and JSON-LD
// into the (otherwise JS-rendered) song page, so every piece is a unique, crawlable page.
// DEFENSIVE: anything it doesn't specifically handle — or any error — falls straight through to the
// static asset, so the Worker can never break the site.
import { SEO } from './seo-data.js';

const ORIGIN = 'https://doredog.com';
const DEFAULT_OG = ORIGIN + '/assets/covers/_mood-atlas.webp';

function attr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function songMeta(id, m) {
  const title = m[0], composer = m[1], genre = m[2], year = m[3], img = m[4];
  const by = composer ? ' by ' + composer : '';
  const pageTitle = title + (composer ? ' — ' + composer : '') + ' · Piano Letter Notes | DoReDog';
  const desc = 'Play ' + title + by + ' in colour-coded piano letter notes — free in your browser. '
    + 'Slow it down, loop any section and learn by ear.';
  const canon = ORIGIN + '/song?id=' + encodeURIComponent(id);   // clean URL (Cloudflare 307-redirects /song.html → /song)
  const ogImg = img ? ORIGIN + '/' + img : DEFAULT_OG;
  const ld = { '@context': 'https://schema.org', '@type': 'MusicComposition', name: title, url: canon };
  if (composer) ld.composer = { '@type': 'Person', name: composer };
  if (genre) ld.genre = genre;
  if (year) ld.datePublished = String(year);
  const ldJson = JSON.stringify(ld).replace(/</g, '\\u003c');
  const head =
    '<link rel="canonical" href="' + attr(canon) + '">' +
    '<meta property="og:type" content="music.song">' +
    '<meta property="og:site_name" content="DoReDog">' +
    '<meta property="og:title" content="' + attr(pageTitle) + '">' +
    '<meta property="og:description" content="' + attr(desc) + '">' +
    '<meta property="og:url" content="' + attr(canon) + '">' +
    '<meta property="og:image" content="' + attr(ogImg) + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<script type="application/ld+json">' + ldJson + '</script>';
  return { pageTitle, desc, head };
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const p = url.pathname;
      if (p === '/song.html' || p === '/song') {
        const id = url.searchParams.get('id');
        const m = id && SEO[id];
        if (m) {
          const res = await env.ASSETS.fetch(request);
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('text/html')) {
            const meta = songMeta(id, m);
            let titleDone = false;
            return new HTMLRewriter()
              .on('title', { element(e) { e.setInnerContent(meta.pageTitle); titleDone = true; } })
              .on('meta[name="description"]', { element(e) { e.setAttribute('content', meta.desc); } })
              .on('head', { element(e) { e.append(meta.head, { html: true }); } })
              .transform(res);
          }
          return res;
        }
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      try { return await env.ASSETS.fetch(request); } catch (_) { return new Response('Not found', { status: 404 }); }
    }
  }
};
