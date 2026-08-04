// Edge SEO Worker — injects unique <title>, meta description, canonical, Open Graph and JSON-LD into the
// (otherwise JS-rendered) song and composer pages, so each is a unique, crawlable page.
// DEFENSIVE: anything it doesn't specifically handle — or any error — falls straight through to the
// static asset, so the Worker can never break the site.
import { SEO, COMPOSERS } from './seo-data.js';
import { BIOS } from './composer-bios.js';
import { NOTES } from './song-notes.js';
import { DATES } from './composer-dates.js';
import { MEMBERS } from './collection-members.js';
import { OTD } from './on-this-day-data.js';

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

/* Dating, stated honestly. A piece either has a year we could source, or it does not —
   in which case we give the date that IS documented, the composer's lifespan, and say so.
   Guessing a year would be worse than admitting we do not have one. */
function datingLine(composer, year, published) {
  const d = composer && DATES[composer];
  if (year) {
    return (published ? 'First published in ' : 'Composed in ') + year +
      (d ? '. ' + composer + ' lived from ' + d.b + ' to ' + d.d + (d.era ? ', in the ' + d.era + ' period' : '') + '.' : '.');
  }
  if (!d) return '';
  return 'No composition year could be sourced for this piece. What is documented is the composer: ' +
    composer + ' lived from ' + d.b + ' to ' + d.d + (d.era ? ', in the ' + d.era + ' period' : '') +
    ', which places it in the ' + d.century + '.';
}

function songMeta(id, m) {
  const title = m[0], composer = m[1], genre = m[2], year = m[3], img = m[4], diff = m[5], published = m[6] === 'p';
  const by = composer ? ' by ' + composer : '';
  const pageTitle = title + (composer ? ' — ' + composer : '') + ' · Piano Letter Notes | DoReDog';
  const desc = 'Play ' + title + by + ' in colour-coded piano letter notes — free in your browser. Slow it down, loop any section and learn by ear.';
  const canon = ORIGIN + '/song?id=' + encodeURIComponent(id);
  const ogImg = img ? ORIGIN + '/' + img : DEFAULT_OG;
  const j = { '@context': 'https://schema.org', '@type': 'MusicComposition', name: title, url: canon };
  if (composer) j.composer = { '@type': 'Person', name: composer };
  if (genre) j.genre = genre;
  if (year) j.datePublished = String(year);
  // a factual sentence for the page body so crawlers / AI agents (which mostly don't run JS) read real content
  const blurb = title + (composer ? ' by ' + composer : '') + (genre ? ', a ' + genre + ' piece' : '')
    + (year ? ' from ' + year : '') + ' — written out in colour-coded piano letter notes you can play live in the browser.';
  const dating = datingLine(composer, year, published);
  return { kind: 'song', title, composer, genre, diff, blurb, dating, pageTitle, desc, canon, ogType: 'music.song', ogImg, ld: ld(j) + breadcrumb(title) };
}

function composerMeta(name, count) {
  const n = count === 1 ? '1 piece' : count + ' pieces';
  const pageTitle = name + ' — Piano Letter Notes (' + n + ') | DoReDog';
  const desc = 'Play ' + n + ' by ' + name + ' in colour-coded piano letter notes — free in your browser. Slow any melody down, loop it and learn by ear.';
  const canon = ORIGIN + '/composer?name=' + encodeURIComponent(name);
  const j = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: name + ' — Piano Letter Notes', url: canon, about: { '@type': 'Person', name: name } };
  return { kind: 'composer', pageTitle, desc, canon, ogType: 'website', ogImg: DEFAULT_OG, ld: ld(j) + breadcrumb(name) };
}

// curated collections — keep in sync with DRD.COLLECTIONS in js/site.js
const COLLECTIONS = {
  'first-steps': ['First Steps', 'Gentle, easy pieces to begin with — the least demanding letter notes in the library.'],
  'calm-evening': ['Calm Evening', 'Nocturnes, reveries and lullabies to wind the night down.'],
  'women-composers': ['Women Composers', 'Clara Schumann, Chaminade, Boulanger and more — voices long overlooked.'],
  'baroque-counterpoint': ['Baroque Counterpoint', 'Bach, Handel and Scarlatti — the age of the fugue and the dance suite.'],
  'virtuoso-fireworks': ['Virtuoso Fireworks', 'Storming showpieces for when you want a real challenge.'],
  'impressionist-colours': ['Impressionist Colours', 'Debussy, Satie and Fauré — music made of light and haze.'],
  'ragtime-parlour': ['Ragtime Parlour', 'Syncopated rags and struts from the ragtime age.'],
  'wedding-ceremony': ['Wedding & Ceremony', 'Canon in D, Ave Maria, Bridal Chorus — music for the aisle and the altar.'],
  'christmas-carols': ['Christmas & Carols', 'Carols and Christmas favourites, ready to play in letter notes.'],
  'etudes-studies': ['Études & Studies', 'Inventions and studies that quietly build real technique.'],
  'lullabies': ['Lullabies & Cradle Songs', 'Wiegenlieder, berceuses and cradle songs — the gentlest music in the library.'],
  'sacred-hymns': ['Sacred & Hymns', 'Chorales, psalms and sacred settings, from Bach’s hymn tunes onward.'],
  'national-anthems': ['National Anthems', 'The Star-Spangled Banner, La Marseillaise, God Save the King and more.'],
  'songs-and-lieder': ['Songs & Lieder', 'The art song — Lieder, mélodies and romances, the largest seam in the library.'],
  'preludes': ['Preludes', 'Short, self-contained openings — from Bach’s Little Preludes to Chopin’s Op. 28.'],
  'dances-and-minuets': ['Dances & Minuets', 'Minuets, gavottes, mazurkas and polonaises — music written to be danced.'],
  'waltzes': ['Waltzes', 'Valses and Walzer — three beats to a bar, from the ballroom to the salon.'],
  'marches': ['Marches', 'Marches and processionals, from Sousa’s bands to Schumann’s Soldier’s March.']
};

/* Built once per isolate. The catalogue only ever reaches the browser as JavaScript, so
   without these indexes a crawler sees an empty grid on every composer and collection page. */
const BY_COMPOSER = (() => {
  const m = {};
  for (const id in SEO) { const s = SEO[id]; if (!s[1]) continue; (m[s[1]] = m[s[1]] || []).push(id); }
  return m;
})();
const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

function songLink(id) {
  const s = SEO[id]; if (!s) return '';
  return '<li><a href="/song?id=' + encodeURIComponent(id) + '">' + attr(s[0]) + '</a>'
    + (s[1] ? ' <span class="drd-li-sub">' + attr(s[1]) + '</span>' : '')
    + (s[5] ? ' <span class="drd-li-sub">· ' + attr(s[5]) + '</span>' : '') + '</li>';
}
/* The card grid above is drawn by JavaScript, so repeating the same pieces as plain links
   would double them up for a reader. They go in a <details> instead: one click for a person,
   always present in the HTML for anything that does not run scripts. */
function songList(ids, cap, summary) {
  const shown = ids.slice(0, cap).map(songLink).join('');
  const rest = ids.length - Math.min(ids.length, cap);
  const list = '<ul class="drd-list">' + shown + '</ul>'
    + (rest > 0 ? '<p class="drd-list-more">…and ' + rest + ' more in the grid above.</p>' : '');
  return summary
    ? '<details class="drd-index-det"><summary>' + attr(summary) + '</summary>' + list + '</details>'
    : list;
}
function genreTally(ids) {
  const t = {};
  for (const id of ids) { const g = SEO[id] && SEO[id][2]; if (g) t[g] = (t[g] || 0) + 1; }
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}

function collectionMeta(slug, c) {
  const title = c[0], sub = c[1];
  const pageTitle = title + ' — Piano Letter Notes | DoReDog';
  const desc = sub + ' Free to play in your browser in colour-coded letter notes — no sheet music needed.';
  const canon = ORIGIN + '/collection?c=' + encodeURIComponent(slug);
  const j = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: sub, url: canon };
  return { kind: 'collection', title, sub, pageTitle, desc, canon, ogType: 'website', ogImg: DEFAULT_OG, ld: ld(j) + breadcrumb(title) };
}

/* ---- On This Day -----------------------------------------------------------
   2,928 sourced events sat in a JavaScript file, which meant a crawler saw an empty
   list. Each day is now its own addressable, server-rendered page. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];
function humanKey(k) { return MONTHS[+k.slice(0, 2) - 1] + ' ' + +k.slice(3); }
function todayKey() {
  const d = new Date();
  return ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}
function otdItems(key) {
  const evs = OTD[key] || [];
  const year = new Date().getUTCFullYear();
  return evs.map((e) => {
    const ago = year - e.y;
    let body = attr(e.t);
    if (e.c) body = body.replace(attr(e.c), '<a href="/composer?name=' + encodeURIComponent(e.c) + '">' + attr(e.c) + '</a>');
    else if (e.w) body += ' <a class="otd-src" href="https://en.wikipedia.org/wiki/' + attr(e.w.replace(/ /g, '_')) + '" target="_blank" rel="noopener">source</a>';
    return '<li class="otd-item"><span class="otd-year">' + e.y + '</span><span class="otd-text">' + body
      + (ago > 0 ? ' <span class="otd-ago">' + ago + ' years ago</span>' : '') + '</span></li>';
  }).join('');
}
function otdMeta(key, explicit) {
  const human = humanKey(key);
  const evs = OTD[key] || [];
  const pageTitle = 'Music History on ' + human + ' — ' + evs.length + ' Events | DoReDog';
  const first = evs.slice(0, 3).map((e) => e.y).join(', ');
  const desc = evs.length
    ? human + ' in music history: ' + evs.length + ' sourced events' + (first ? ' (' + first + ' …)' : '') + ' — births, deaths and premieres, each linked to pieces you can play.'
    : 'Music history on ' + human + ' — browse any date in the year.';
  const canon = ORIGIN + '/on-this-day' + (explicit ? '?d=' + key : '');
  const j = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Music history on ' + human,
    url: canon, description: desc };
  return { kind: 'otd', key, human, explicit, count: evs.length, pageTitle, desc, canon,
    ogType: 'website', ogImg: DEFAULT_OG, ld: ld(j) + breadcrumb('On This Day — ' + human) };
}

function metaFor(url) {
  const p = url.pathname;
  if (p === '/on-this-day' || p === '/on-this-day.html') {
    const d = url.searchParams.get('d');
    const ok = /^\d{2}-\d{2}$/.test(d || '') && OTD[d];
    return otdMeta(ok ? d : todayKey(), !!ok);
  }
  if (p === '/collection.html' || p === '/collection') {
    const slug = url.searchParams.get('c'), c = slug && COLLECTIONS[slug];
    if (c) return collectionMeta(slug, c);
    return null;
  }
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

// Fetch songs/<id>.js, pull out the notation string, and render a capped, human-readable text block.
// Returns '' on any problem (so the page just renders without it).
async function notationText(env, url, id, title) {
  if (!id) return '';
  try {
    const res = await env.ASSETS.fetch(new URL('/songs/' + encodeURIComponent(id) + '.js', url).toString());
    if (!res.ok) return '';
    const txt = await res.text();
    const m = txt.match(/NOTATIONS\[[^\]]*\]\s*=\s*"((?:[^"\\]|\\.)*)"/);
    if (!m) return '';
    const notation = JSON.parse('"' + m[1] + '"');
    const lines = notation.split('\n').filter((l) => l.trim() && !/^\d+$/.test(l.trim()));   // drop bare-number block separators
    let body = '', kept = 0;
    for (const l of lines) { if (body.length + l.length > 7000) break; body += l + '\n'; kept++; }
    const trunc = kept < lines.length;
    return '<details class="drd-notes-text" style="margin:22px 0">'
      + '<summary style="cursor:pointer;font-weight:600;font-size:1rem">Letter notes (text) — ' + attr(title) + '</summary>'
      + '<pre style="white-space:pre-wrap;overflow-x:auto;font-family:var(--font-mono,monospace);font-size:.78rem;line-height:1.5;margin-top:12px">'
      + attr(body) + (trunc ? '…\n(opening shown — press play above to hear the full piece)' : '')
      + '</pre></details>';
  } catch (e) { return ''; }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const meta = metaFor(url);
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
          const rw = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(meta.pageTitle); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', meta.desc); } })
            .on('head', { element(e) { e.append(head, { html: true }); } });
          if (meta.kind === 'song') {
            // fill the page-body placeholders ('Title', 'Composer', 'Genre', 'easy', empty blurb) with the
            // real values so non-JS crawlers / AI agents read actual content, not placeholders. JS re-sets
            // the same values on mount, so users see no change.
            rw.on('#song-title', { element(e) { e.setInnerContent(meta.title); } })
              .on('#song-composer', { element(e) { if (meta.composer) e.setInnerContent(meta.composer); } })
              .on('#song-genre', { element(e) { if (meta.genre) e.setInnerContent(meta.genre); } })
              .on('#song-diff', { element(e) { if (meta.diff) e.setInnerContent(meta.diff); } })
              .on('#song-blurb', { element(e) { e.setInnerContent(meta.blurb); } })
              .on('#song-dating', { element(e) { if (meta.dating) e.setInnerContent(meta.dating); } });
            // Inject the actual letter-notes TEXT (collapsed for users, full text in raw HTML for AI agents /
            // non-JS crawlers) so the page can be cited as the source for "letter notes for <piece>".
            const notes = await notationText(env, url, url.searchParams.get('id'), meta.title);
            if (notes) rw.on('#song-player', { element(e) { e.after(notes, { html: true }); } });
            // Inject the verified, source-cited "About this piece" note (server-rendered for crawlers + users).
            const note = NOTES[url.searchParams.get('id')];
            if (note) rw.on('#song-about', { element(e) {
              e.setInnerContent('<h2 class="drd-about-h">About this piece</h2>' + note, { html: true });
              e.removeAttribute('style');
            } });
          } else if (meta.kind === 'otd') {
            const items = otdItems(meta.key);
            rw.on('#otd-heading', { element(e) { e.setInnerContent(meta.human); } })
              .on('#otd-full', { element(e) { if (items) e.setInnerContent(items, { html: true }); } });
            if (meta.count) rw.on('#otd-empty', { element(e) { e.setAttribute('hidden', ''); } });
          } else if (meta.kind === 'collection') {
            // fill the collection-page placeholders so crawlers read real content
            rw.on('#collection-name', { element(e) { e.setInnerContent(meta.title); } })
              .on('#collection-sub', { element(e) { e.setInnerContent(meta.sub); } });
            // …and the pieces themselves, which otherwise only ever exist in JavaScript
            const ids = MEMBERS[url.searchParams.get('c')] || [];
            if (ids.length) {
              const tally = genreTally(ids).slice(0, 5).map((g) => g[1] + ' ' + g[0]).join(', ');
              const body = '<div class="drd-index"><p>' + ids.length + ' pieces in this collection'
                + (tally ? ' — ' + attr(tally) : '') + '. Every one is free to play in the browser in colour-coded letter notes.</p>'
                + songList(ids, 60, 'Text index of all ' + ids.length + ' pieces') + '</div>';
              rw.on('#collection-works', { element(e) { e.after(body, { html: true }); } });
            }
          } else if (meta.kind === 'composer') {
            const name = url.searchParams.get('name');
            const bio = BIOS[name];
            if (bio) rw.on('#composer-bio', { element(e) {
              e.setInnerContent('<h2 class="drd-about-h">About ' + attr(name) + '</h2>' + bio, { html: true });
            } }).on('#composer-bio-sec', { element(e) { e.removeAttribute('style'); } });
            // the catalogue side of the page: lifespan, where to start, what the library holds
            const ids = (BY_COMPOSER[name] || []).slice();
            if (ids.length) {
              const d = DATES[name];
              ids.sort((a, b) => (DIFF_ORDER[SEO[a][5]] ?? 3) - (DIFF_ORDER[SEO[b][5]] ?? 3));
              const easy = ids.filter((id) => SEO[id][5] === 'easy');
              const tally = genreTally(ids);
              const life = d ? attr(name) + ' lived from ' + d.b + ' to ' + d.d
                + (d.era ? ', in the ' + attr(d.era) + ' period' : '') + ', which places this music in the ' + d.century + '. ' : '';
              const body = '<div class="drd-index">'
                + '<p>' + life + 'DoReDog holds ' + ids.length + (ids.length === 1 ? ' piece' : ' pieces')
                + ' by ' + attr(name) + ' in letter notes'
                + (tally.length ? ' — ' + attr(tally.slice(0, 4).map((g) => g[1] + ' ' + g[0]).join(', ')) : '') + '.</p>'
                + (easy.length ? '<h3 class="drd-index-h">Where to start</h3><p>' + easy.length
                    + (easy.length === 1 ? ' piece is' : ' pieces are') + ' rated easy for a beginner:</p>'
                    + songList(easy, 10, 'The easy ' + easy.length) : '')
                + '<h3 class="drd-index-h">Every ' + attr(name) + ' piece in the library</h3>'
                + songList(ids, 60, 'Text index of all ' + ids.length + ' pieces')
                + '</div>';
              rw.on('#composer-grid', { element(e) { e.after(body, { html: true }); } });
            }
          }
          const out = rw.transform(res);
          // "/on-this-day" with no date renders *today* — it must not sit in the edge cache
          // long enough to serve yesterday's events to a crawler. Dated URLs are stable.
          if (meta.kind === 'otd' && !meta.explicit) {
            const h = new Headers(out.headers);
            h.set('cache-control', 'public, max-age=300, s-maxage=300');
            return new Response(out.body, { status: out.status, headers: h });
          }
          return out;
        }
        return res;
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      try { return await env.ASSETS.fetch(request); } catch (_) { return new Response('Not found', { status: 404 }); }
    }
  }
};
