// Edge SEO Worker — injects unique <title>, meta description, canonical, Open Graph and JSON-LD into the
// (otherwise JS-rendered) song and composer pages, so each is a unique, crawlable page.
// DEFENSIVE: anything it doesn't specifically handle — or any error — falls straight through to the
// static asset, so the Worker can never break the site.
import { SEO, COMPOSERS } from './seo-data.js';

const ORIGIN = 'https://doredog.com';
const DEFAULT_OG = ORIGIN + '/assets/covers/_mood-atlas.webp';

function attr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function ld(obj) { return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>'; }
function breadcrumb(lastName) {
  return ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: 'Library', item: ORIGIN + '/library' },
    { '@type': 'ListItem', position: 3, name: lastName }
  ] });
}

function songMeta(id, m) {
  const title = m[0], composer = m[1], genre = m[2], year = m[3], img = m[4];
  const by = composer ? ' by ' + composer : '';
  const pageTitle = title + (composer ? ' — ' + composer : '') + ' · Piano Letter Notes | DoReDog';
  const desc = 'Play ' + title + by + ' in colour-coded piano letter notes — free in your browser. Slow it down, loop any section and learn by ear.';
  const canon = ORIGIN + '/song?id=' + encodeURIComponent(id);
  const ogImg = img ? ORIGIN + '/' + img : DEFAULT_OG;
  const j = { '@context': 'https://schema.org', '@type': 'MusicComposition', name: title, url: canon };
  if (composer) j.composer = { '@type': 'Person', name: composer };
  if (genre) j.genre = genre;
  if (year) j.datePublished = String(year);
  return { pageTitle, desc, canon, ogType: 'music.song', ogImg, ld: ld(j) + breadcrumb(title) };
}

function composerMeta(name, count) {
  const n = count === 1 ? '1 piece' : count + ' pieces';
  const pageTitle = name + ' — Piano Letter Notes (' + n + ') | DoReDog';
  const desc = 'Play ' + n + ' by ' + name + ' in colour-coded piano letter notes — free in your browser. Slow any melody down, loop it and learn by ear.';
  const canon = ORIGIN + '/composer?name=' + encodeURIComponent(name);
  const j = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: name + ' — Piano Letter Notes', url: canon, about: { '@type': 'Person', name: name } };
  return { pageTitle, desc, canon, ogType: 'website', ogImg: DEFAULT_OG, ld: ld(j) + breadcrumb(name) };
}

function metaFor(url) {
  const p = url.pathname;
  if (p === '/song.html' || p === '/song') {
    const id = url.searchParams.get('id'), m = id && SEO[id];
    if (m) return songMeta(id, m);
  } else if (p === '/composer.html' || p === '/composer') {
    const name = url.searchParams.get('name');
    const count = name && COMPOSERS[name];
    if (count) return composerMeta(name, count);
  }
  return null;
}

export default {
  async fetch(request, env) {
    try {
      const meta = metaFor(new URL(request.url));
      if (meta) {
        const res = await env.ASSETS.fetch(request);
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('text/html')) {
          const head =
            '<link rel="canonical" href="' + attr(meta.canon) + '">' +
            '<meta property="og:type" content="' + meta.ogType + '">' +
            '<meta property="og:site_name" content="DoReDog">' +
            '<meta property="og:title" content="' + attr(meta.pageTitle) + '">' +
            '<meta property="og:description" content="' + attr(meta.desc) + '">' +
            '<meta property="og:url" content="' + attr(meta.canon) + '">' +
            '<meta property="og:image" content="' + attr(meta.ogImg) + '">' +
            '<meta name="twitter:card" content="summary_large_image">' +
            meta.ld;
          return new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(meta.pageTitle); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', meta.desc); } })
            .on('head', { element(e) { e.append(head, { html: true }); } })
            .transform(res);
        }
        return res;
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      try { return await env.ASSETS.fetch(request); } catch (_) { return new Response('Not found', { status: 404 }); }
    }
  }
};
