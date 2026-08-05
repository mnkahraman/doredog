// Build styled article HTML pages + a "/articles" hub from the reviewed markdown drafts.
// Output: <slug>.html at repo root (Cloudflare serves clean /<slug>), plus articles.html hub.
import fs from 'fs';
import { siteVersion } from './site-version.mjs';
// Derive the repo root from this file's own location. It used to be an absolute path,
// so running a tool from a git worktree silently read and rewrote the MAIN checkout.
const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const DRAFTS = ROOT + '/marketing/content-drafts';
const V = siteVersion();

// file -> {slug, title, desc}
const ARTS = [
  ['01-what-are-letter-notes.md', 'what-are-piano-letter-notes', 'What Are Piano Letter Notes? A Complete Guide to Reading Them', 'Learn to read piano letter notes in minutes — the white keys, sharps, octaves, timing and chords. No sheet music, no theory.'],
  ['02-play-without-reading-sheet-music.md', 'play-piano-without-reading-sheet-music', 'How to Play Piano Without Reading Sheet Music', 'You don’t need to read sheet music to play piano. Four ways to play without a staff, and a concrete path from zero to your first piece.'],
  ['03-easiest-classical-pieces-for-beginners.md', 'easiest-classical-pieces-for-beginners', 'The Easiest Classical Pieces to Learn as a Beginner', 'Famous, genuinely beginner-friendly classical pieces you can play today in colour-coded letter notes — from Ode to Joy to Gymnopédie No. 1.'],
  ['04-how-to-learn-by-ear.md', 'how-to-learn-piano-by-ear', 'How to Learn a Piano Piece by Ear, Step by Step', 'Playing by ear is a skill, not a gift. A practical, no-theory method to work out any melody you already know on the piano.'],
  ['05-hands-separate-practice.md', 'hands-separate-practice', 'Hands-Separate Practice: Why It Works and How to Do It', 'Why practising each hand on its own is the fastest way to learn a piano piece — and exactly how to do it, step by step.'],
  ['06-how-to-learn-fur-elise.md', 'how-to-learn-fur-elise', 'How to Learn Für Elise in Letter Notes', 'What Für Elise really is, why its famous opening is beginner-friendly, and how to learn it step by step in colour-coded letter notes.'],
  ['07-letter-notes-vs-sheet-music.md', 'letter-notes-vs-sheet-music', 'Letter Notes vs. Sheet Music: Which Should a Beginner Learn?', 'An honest comparison of piano letter notes and standard sheet music — the strengths of each, and which to learn first.'],
  ['08-practice-when-you-cant-read-music.md', 'how-to-practice-piano-without-reading-music', 'How to Practice Piano When You Can’t Read Music', 'A simple, repeatable 20-minute piano practice session you can run today — no staff, no theory, just focused, effective work.'],
  ['09-beginners-guide-clair-de-lune.md', 'how-to-play-clair-de-lune', 'A Beginner’s Guide to Playing Clair de Lune', 'What Clair de Lune is, an honest word about its difficulty, and how a patient beginner can start playing it in letter notes.'],
  ['10-slow-down-and-loop.md', 'slow-down-and-loop-to-learn-faster', 'How to Slow Down and Loop a Piece to Learn It Faster', 'The two habits that separate steady progress from plateau: slow practice and looping. Why they work and how to use them.'],
  ['11-how-to-learn-canon-in-d.md', 'how-to-learn-canon-in-d', 'How to Learn Canon in D (Pachelbel) in Letter Notes', 'What Pachelbel’s Canon in D really is and how to play it — built on one repeating pattern, it’s one of the most learnable famous pieces.'],
  ['12-how-to-play-gymnopedie-no-1.md', 'how-to-play-gymnopedie-no-1', 'How to Play Gymnopédie No. 1 (Satie) in Letter Notes', 'Satie’s Gymnopédie No. 1 is one of the best first beautiful pieces — slow, calm and beginner-friendly. What it is and how to learn it.'],
  ['13-how-to-play-the-entertainer.md', 'how-to-play-the-entertainer', 'How to Play The Entertainer (Joplin) in Letter Notes', 'What Joplin’s The Entertainer is, an honest word on ragtime difficulty, and how to learn it hands-separate in colour-coded letter notes.'],
  ['14-how-to-learn-moonlight-sonata.md', 'how-to-learn-moonlight-sonata', 'How to Learn the Moonlight Sonata (1st Movement)', 'The famous first movement of Beethoven’s Moonlight Sonata is built on a gentle repeating pattern — how a patient beginner can play it.'],
  ['15-can-adults-learn-piano.md', 'can-adults-learn-piano', 'Can Adults Learn Piano? Yes — Here’s How to Start', 'You are not too old to learn piano. Why adults can absolutely learn, and the fastest, lowest-frustration way to start.'],
  ['16-how-long-to-learn-piano.md', 'how-long-to-learn-piano', 'How Long Does It Take to Learn Piano?', 'A realistic timeline for learning piano — from your first tune (days) to intermediate playing (a few years) — and what determines your speed.'],
  ['17-satie-for-beginners.md', 'satie-for-beginners', 'Erik Satie for Beginners: Where to Start', 'Satie’s Gymnopédies are the best beautiful-but-playable pieces for a beginner. Which to learn first, in what order, and how to play them well.'],
  ['18-easiest-chopin-pieces.md', 'easiest-chopin-pieces', 'The Easiest Chopin Pieces to Learn (and How to Start)', 'Most Chopin is hard — but four of his Preludes are genuinely playable early. An honest guide to starting Chopin as a beginner.'],
  ['19-piano-music-for-weddings.md', 'piano-music-for-weddings', 'Piano Music for Weddings (in Letter Notes You Can Play)', 'Canon in D, Bridal Chorus, Ave Maria and more — the wedding piano repertoire, how hard each really is, and which to choose for your level.'],
  ['20-what-is-ragtime.md', 'what-is-ragtime', 'What Is Ragtime? A Beginner’s Guide (with Pieces to Play)', 'What ragtime is, why its syncopation feels the way it does, who Scott Joplin was, and which rags a learner should actually start with.'],
  ['21-what-is-a-nocturne.md', 'what-is-a-nocturne', 'What Is a Nocturne? (And the Best Ones to Learn)', 'The nocturne explained — where the form came from, what makes its sound, and which nocturnes to learn first, from Chopin’s Op. 9 No. 2.'],
  ['22-easiest-beethoven-pieces.md', 'easiest-beethoven-pieces', 'The Easiest Beethoven Pieces for Beginners', 'Beethoven you can genuinely play — starting with Ode to Joy, through his easiest sonata movements, up to Für Elise and the Moonlight Sonata.'],
  ['23-schumann-for-beginners.md', 'schumann-for-beginners', 'Schumann for Beginners: Music Written for Young Players', 'Schumann wrote a whole album for children learning piano. The easiest Schumann pieces, in a sensible order, from The Happy Farmer to Träumerei.'],
  ['24-bach-for-beginners.md', 'bach-for-beginners', 'Bach for Beginners: The Easiest Bach Pieces to Learn', 'Bach wrote short keyboard pieces for students — and they’re still the best beginner material there is. The easiest Bach, in a sensible order.'],
  // Measured guides — the piece lists come from parsing all 2,433 transcriptions
  // (tools/gen-article-lists.mjs), not from hand-picking.
  ['25-no-black-keys.md', 'piano-pieces-with-no-black-keys', 'Piano Pieces With No Black Keys (All 21 of Them)', 'We parsed every piece in the library: 21 never touch a black key, from a 13th-century Cantiga to Satie. Playable in letter notes, easiest first.'],
  ['26-one-sitting.md', 'piano-pieces-you-can-learn-in-one-sitting', 'Piano Pieces You Can Learn in One Sitting', '121 pieces that are both genuinely easy and under a minute long — measured, not guessed. Finish a whole piece today instead of half of a famous one.'],
  ['27-small-keyboard.md', 'piano-pieces-for-a-small-keyboard', 'Piano Pieces for a Small Keyboard (25, 37 and 49 Keys)', 'Exactly which pieces fit your keyboard, measured by pitch span: 34 pieces on 25 keys, 302 on 37, and 1,068 — 44% of the library — on 49.'],
  ['28-slowest-pieces.md', 'the-slowest-piano-pieces', 'The Slowest Piano Pieces in the Library', 'Slow is not the same as easy. The 35 pieces that run under two notes a second — Satie’s Gymnopédies, hymn tunes, method-book openings — and why.'],
  ['29-hardest-pieces.md', 'the-hardest-pieces-in-the-library', 'The Hardest Pieces in the Library — and Why the List Is Full of Songs', 'The 40 hardest transcriptions we measured, unfiltered — plus an honest account of what the difficulty score measures and where it misleads.'],
  ['30-easiest-schumann.md', 'the-easiest-schumann-pieces', 'The Easiest Schumann Pieces, Measured', 'All 50 Schumann pieces ranked by measured difficulty, easiest first. His Album for the Young is the most systematic beginner collection in the library.'],
  ['31-easiest-brahms.md', 'the-easiest-brahms-pieces', 'The Easiest Brahms Pieces, Measured', 'All 95 Brahms pieces ranked easiest first. The Lullaby is both the most famous and the most playable — and an honest word about his hand stretches.'],
  ['32-easiest-mozart.md', 'the-easiest-mozart-pieces', 'The Easiest Mozart Pieces, Measured', 'All 65 Mozart pieces ranked easiest first — and the easiest are not piano music at all, but the Twelve Duos for two horns he wrote while playing skittles.'],
  ['33-easiest-satie.md', 'the-easiest-satie-pieces', 'The Easiest Satie Pieces, Measured', 'All 27 Satie pieces ranked easiest first. Gymnopédie No. 1 is the hardest of the three, not the easiest — and five other pieces beat all of them.'],
  ['34-easiest-baroque.md', 'the-easiest-baroque-pieces', 'The Easiest Baroque Pieces, Measured', 'All 552 Baroque pieces ranked easiest first — and why the most famous “Bach” beginner pieces were written by Petzold, Couperin and Stölzel.'],
  ['35-easiest-romantic.md', 'the-easiest-romantic-pieces', 'The Easiest Romantic Pieces, Measured', 'Two thirds of the library is Romantic, and 150 of those pieces score under 40. The measured list, easiest first, and why fame and difficulty are unrelated.'],
  ['36-easiest-handel.md', 'the-easiest-handel-pieces', 'The Easiest Handel Pieces, Measured', 'All 58 Handel pieces ranked easiest first. The Aylesford miniatures — collected by the man who wrote the words of Messiah — are the way in.'],
  ['37-easiest-burgmuller.md', 'the-easiest-burgmuller-pieces', 'The Easiest Burgmüller Pieces, Measured', 'The only composer in the library with no hard end: all 19 pieces score between 22 and 59. Studies that do not sound like studies.'],
  ['38-easiest-ragtime.md', 'the-easiest-ragtime-pieces', 'The Easiest Ragtime Pieces — and Why Ragtime Is Not Beginner Music', 'We measured all 20 rags: not one scores under 40. Why the syncopation is the problem, where to start, and what to play until you are ready.'],
  ['39-easiest-schubert.md', 'the-easiest-schubert-pieces', 'The Easiest Schubert Pieces, Measured', 'All 103 Schubert pieces easiest first. His floor is 20 — higher than any other major composer here — and his gentlest music is his songs.'],
  ['40-easiest-classical.md', 'the-easiest-classical-era-pieces', 'The Easiest Classical-Era Pieces, Measured', 'All 254 pieces from 1730–1820 ranked easiest first. The highest proportion of approachable music in the library — and its single hardest movement.'],
  // Comparisons — every figure quoted comes from tools/gen-comparison-data.mjs,
  // the same parser the measured guides use, so the numbers cannot drift apart.
  ['41-fur-elise-vs-moonlight.md', 'fur-elise-vs-moonlight-sonata', 'Für Elise vs the Moonlight Sonata: Which Should You Learn First?', 'Measured head to head: the Moonlight scores lower (40 vs 43), runs at half the speed and fits a 49-key keyboard. Für Elise needs 76.'],
  ['42-gymnopedie-vs-clair-de-lune.md', 'gymnopedie-vs-clair-de-lune', 'Gymnopédie No. 1 vs Clair de Lune: The Two Calm Pieces, Compared', 'Four points apart on our score, years apart in practice: 282 notes against 1,468, and 19% black keys against 74%. Why the score misleads here.'],
  ['43-bach-or-mozart.md', 'bach-or-mozart-for-beginners', 'Bach or Mozart: Which Is Better for a Beginner?', 'Bach gives you more easy pieces (54 under 30); Mozart gives you a higher share (32%). Why the answer is still Bach, and where Mozart wins.'],
  ['44-chopin-or-liszt.md', 'chopin-or-liszt-which-is-easier', 'Chopin or Liszt: Which Is Easier to Start With?', 'Between them, 60 pieces — and exactly two score under 30. An honest look at two composers who never wrote for beginners, and the two ways in.'],
  ['45-baroque-or-romantic.md', 'baroque-or-romantic-which-era-is-easier', 'Baroque or Romantic: Which Era Should a Beginner Start With?', 'Measured across 2,433 pieces: 22% of Baroque music scores under 30, against 4% of Romantic. Why smaller instruments and student books made the difference.'],
  ['46-61-vs-76-vs-88-keys.md', '61-vs-76-vs-88-keys', '61, 76 or 88 Keys: How Many Do You Actually Need?', '80% of the library fits on 61 keys, 98% on 76, 100% on 88. Going 61 to 76 buys 425 pieces; going 76 to 88 buys 55. Where the curve flattens.'],
  ['47-faq.md', 'faq', 'Piano Letter Notes: Frequently Asked Questions', 'Twenty-six questions about letter notes, keyboards, difficulty and learning piano without reading music — answered with measurements, not estimates.', { faq: true }],
  ['48-one-piece-composers.md', 'one-piece-composers', 'The 242 Composers We Have Exactly One Piece By', 'More than half the names in the library appear once — Paganini, Dvořák, Rimsky-Korsakov, Tallis, Byrd and Dowland among them. All 242, easiest first.'],
];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => '<a href="' + u + '">' + t + '</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

function mdToHtml(md) {
  // drop the H1, the *Draft ...* annotation, and --- rules
  const lines = md.split('\n').filter(l => !/^#\s/.test(l) && !/^\*Draft/.test(l.trim()) && l.trim() !== '---');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    let l = lines[i];
    if (l.trim() === '') { i++; continue; }
    // fenced code
    if (l.trim().startsWith('```')) {
      i++; const buf = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++; }
      i++; out.push('<pre class="drd-pre"><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    // table
    if (l.trim().startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i++; }
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]); const body = rows.slice(2); // rows[1] is the --- separator
      let t = '<div class="drd-tablewrap"><table class="drd-table"><thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>';
      for (const r of body) t += '<tr>' + cells(r).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>';
      out.push(t + '</tbody></table></div>');
      continue;
    }
    // playable piece list — {{list:key}} or {{list:key,48}} for a bigger first page.
    // js/lists.js fills it from the frozen scan in js/article-lists.js.
    const list = l.trim().match(/^\{\{list:([a-z0-9-]+)(?:,(\d+))?\}\}$/);
    if (list) {
      out.push('<div class="drd-pieces" data-list="' + list[1] + '" data-show="' + (list[2] || 24) + '"></div>');
      i++; continue;
    }
    // heading
    let h = l.match(/^(#{2,4})\s+(.*)/);
    if (h) { const lvl = h[1].length; out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>'); i++; continue; }
    // ordered list
    if (/^\d+\.\s/.test(l.trim())) {
      const items = []; while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++; }
      out.push('<ol>' + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>'); continue;
    }
    // unordered list
    if (/^[-*]\s/.test(l.trim())) {
      const items = []; while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s/, '')); i++; }
      out.push('<ul>' + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ul>'); continue;
    }
    // blockquote
    if (l.trim().startsWith('>')) {
      const buf = []; while (i < lines.length && lines[i].trim().startsWith('>')) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>'); continue;
    }
    // paragraph
    const buf = []; while (i < lines.length && lines[i].trim() !== '' && !/^(#{2,4}\s|[-*]\s|\d+\.\s|\||>|```|\{\{list:)/.test(lines[i].trim())) { buf.push(lines[i].trim()); i++; }
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out.join('\n      ');
}

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='11' fill='%230c0c16'/%3E%3Cline x1='11' y1='27' x2='11' y2='16' stroke='%23ff54b2' stroke-width='3'/%3E%3Cline x1='17' y1='27' x2='17' y2='12' stroke='%2335e08c' stroke-width='3'/%3E%3Cline x1='23' y1='27' x2='23' y2='18' stroke='%23f6b73f' stroke-width='3'/%3E%3Cline x1='29' y1='27' x2='29' y2='14' stroke='%234fa3ff' stroke-width='3'/%3E%3C/svg%3E";
const ADSENSE = '<!-- Google AdSense -->\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9610317354666717" crossorigin="anonymous"></script>';

/* Google renders a FAQ page as an expandable result only if the questions and
   answers are declared in FAQPage JSON-LD. Pull them straight out of the draft —
   every "## " heading that ends in a question mark, with the prose under it —
   so the schema cannot drift away from what the page actually says. */
function faqPairs(md) {
  const out = [];
  const secs = md.split(/^## /m).slice(1);
  for (const sec of secs) {
    const nl = sec.indexOf('\n');
    const q = sec.slice(0, nl).trim();
    if (!q.endsWith('?')) continue;
    const body = sec.slice(nl + 1).trim()
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')          // links -> their text
      .replace(/[*`#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (body) out.push({ '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: body } });
  }
  return out;
}

function page(slug, title, desc, bodyHtml, opts, rawMd) {
  const canon = 'https://doredog.com/' + slug;
  const pairs = opts && opts.faq && rawMd ? faqPairs(rawMd) : [];
  const ld = JSON.stringify(pairs.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage', name: title, description: desc,
    url: canon, inLanguage: 'en', mainEntity: pairs,
    publisher: { '@type': 'Organization', name: 'DoReDog', url: 'https://doredog.com/' },
  } : {
    '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc,
    url: canon, mainEntityOfPage: canon,
    author: { '@type': 'Organization', name: 'DoReDog' },
    publisher: { '@type': 'Organization', name: 'DoReDog', url: 'https://doredog.com/' },
    inLanguage: 'en'
  }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en" data-year="2026">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(title)} | DoReDog</title>
<meta name="description" content="${attr(desc)}">
<meta name="theme-color" content="#06060b">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="DoReDog">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="https://doredog.com/assets/covers/_mood-atlas.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ICON}">
<link rel="stylesheet" href="css/main.css?v=${V}">
<link rel="stylesheet" href="css/player.css?v=${V}">
<script type="application/ld+json">${ld}</script>
${ADSENSE}
</head>
<body data-page="article">
<header id="site-header"></header>
<main>
  <section style="padding-top:98px">
    <div class="container" style="max-width:820px">
      <a href="articles.html" class="text-mute" style="font-size:.85rem;display:inline-flex;align-items:center;gap:.5rem;margin-bottom:18px" data-reveal>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        All guides
      </a>
      <article class="drd-article" data-reveal>
      <h1 class="display" style="font-size:clamp(1.9rem,3.8vw,2.8rem);margin:.2rem 0 1.1rem">${esc(title)}</h1>
      ${bodyHtml}
      </article>
      <div class="ad-label" style="margin-top:40px">Advertisement</div>
      <div class="ad-slot ad-leaderboard" data-ad="in-article">Ad space — responsive in-article · paste your AdSense unit here</div>
    </div>
  </section>
</main>
<footer id="site-footer"></footer>
<script src="js/data.js?v=${V}"></script>
<script src="js/site.js?v=${V}"></script>${bodyHtml.includes('class="drd-pieces"') ? `
<script src="js/article-lists.js?v=${V}"></script>
<script src="js/lists.js?v=${V}"></script>` : ''}
</body>
</html>
`;
}

/* The article URLs used to live in sitemap.xml as hand-added lines, which meant
   `node tools/convert.js --write` silently deleted all of them — it rebuilds the
   sitemap from the catalogue and knows nothing about articles. Own the block
   here instead, between markers, so building the articles always restores it. */
function patchSitemap(slugs) {
  const f = ROOT + '/sitemap.xml';
  if (!fs.existsSync(f)) return;
  const block = '  <!-- articles:start (owned by tools/build-articles.mjs) -->\n' +
    slugs.map((s) => '  <url><loc>https://doredog.com/' + s +
      '</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>').join('\n') +
    '\n  <!-- articles:end -->\n';
  let sm = fs.readFileSync(f, 'utf8');
  // drop any previous block, plus the loose hand-added lines it replaces
  sm = sm.replace(/[ \t]*<!-- articles:start[\s\S]*?<!-- articles:end -->\n/, '');
  for (const s of slugs) sm = sm.replace(new RegExp('[ \\t]*<url><loc>https://doredog\\.com/' +
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</loc>[^\\n]*\\n', 'g'), '');
  sm = sm.replace('</urlset>', block + '</urlset>');
  fs.writeFileSync(f, sm);
  console.log('sitemap: ' + slugs.length + ' article URLs written between markers');
}

/* ---- related guides -------------------------------------------------------
   Measured before writing this: 31 of the 48 article pages linked to no other
   article at all, and 15 had nothing linking to them. The set had grown into a
   pile of dead ends, and hand-editing "read next" lines into 31 drafts would rot
   the moment a page was added.

   Relatedness is computed from what the drafts actually share: the pieces they
   link to, the generated lists they embed, and the composers they name in bold.
   Two guides that send you to the same music are related; two that do not are
   not. Ties break on file order so the output is deterministic. */
function signals(md) {
  const songs = new Set([...md.matchAll(/\/song\?id=([a-z0-9-]+)/g)].map((m) => m[1]));
  const lists = new Set([...md.matchAll(/\{\{list:([a-z0-9-]+)/g)].map((m) => m[1]));
  const names = new Set([...md.matchAll(/\*\*([A-ZÀ-Þ][^*]{3,40})\*\*/g)]
    .map((m) => m[1].replace(/[.,;:]$/, '').trim())
    .filter((n) => /^[A-ZÀ-Þ][a-zà-ÿ.'-]+(?: [A-ZÀ-Þ][a-zà-ÿ.'-]+)+$/.test(n)));
  return { songs, lists, names };
}

function relatedFor(all, i) {
  const a = all[i];
  const share = (x, y) => { let n = 0; x.forEach((v) => { if (y.has(v)) n++; }); return n; };
  const scored = all.map((b, j) => {
    if (j === i) return { j, score: -1 };
    // a shared list is the strongest signal, a shared composer the weakest
    const score = share(a.sig.songs, b.sig.songs) * 3 +
      share(a.sig.lists, b.sig.lists) * 6 +
      share(a.sig.names, b.sig.names) * 2 +
      (a.family === b.family ? 1 : 0);
    return { j, score };
  }).filter((x) => x.score > 0).sort((x, y) => y.score - x.score || x.j - y.j);

  const picked = scored.slice(0, 4).map((x) => all[x.j]);
  // Never emit an empty block: fall back to the nearest pages in the same family,
  // then to neighbours in file order, so every page has somewhere to go.
  if (picked.length < 3) {
    for (const b of all) {
      if (picked.length >= 3) break;
      if (b === a || picked.includes(b)) continue;
      if (b.family === a.family) picked.push(b);
    }
  }
  for (let k = 1; picked.length < 3 && k < all.length; k++) {
    const b = all[(i + k) % all.length];
    if (b !== a && !picked.includes(b)) picked.push(b);
  }
  return picked;
}

/* Scoring alone leaves the graph lopsided: hub pages get chosen over and over
   and 16 niche pages were still linked from nowhere. Build every block first,
   then give each unlinked page a slot in its best-scoring partner's block by
   displacing that partner's weakest pick. Every page ends up reachable. */
function relatedGraph(all) {
  const blocks = all.map((_, i) => relatedFor(all, i));
  const inbound = new Map(all.map((a) => [a.slug, 0]));
  blocks.forEach((b) => b.forEach((t) => inbound.set(t.slug, inbound.get(t.slug) + 1)));

  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (inbound.get(a.slug) > 0) continue;
    // the page that scores this one highest, excluding itself and anyone already holding it
    let best = -1, bestScore = -1;
    for (let j = 0; j < all.length; j++) {
      if (j === i || blocks[j].includes(a)) continue;
      const sc = relatedScore(all[j], a);
      if (sc > bestScore) { bestScore = sc; best = j; }
    }
    if (best < 0) continue;
    // displace the weakest entry that is not itself the only inbound link somewhere
    const victimIdx = blocks[best].findIndex((t) => inbound.get(t.slug) > 1);
    if (victimIdx >= 0) {
      inbound.set(blocks[best][victimIdx].slug, inbound.get(blocks[best][victimIdx].slug) - 1);
      blocks[best][victimIdx] = a;
    } else {
      blocks[best].push(a);
    }
    inbound.set(a.slug, 1);
  }
  return blocks;
}

function relatedScore(a, b) {
  const share = (x, y) => { let n = 0; x.forEach((v) => { if (y.has(v)) n++; }); return n; };
  return share(a.sig.songs, b.sig.songs) * 3 + share(a.sig.lists, b.sig.lists) * 6 +
    share(a.sig.names, b.sig.names) * 2 + (a.family === b.family ? 1 : 0);
}

function relatedHtml(picked) {
  if (!picked.length) return '';
  return '<section class="section-sm"><div class="container page-copy">' +
    '<h2 class="drd-related-h">Related guides</h2><ul class="drd-related">' +
    // the blurb belongs inside the anchor: outside it, it rendered below the
    // bordered card instead of in it, and was not part of the click target
    picked.map((b) => '<li><a href="/' + b.slug + '"><strong>' + esc(b.title) + '</strong>' +
      '<span>' + esc(b.desc) + '</span></a></li>').join('') +
    '</ul></div></section>';
}

// build the 10 article pages
const hubCards = [];
// family: 01-24 are written guides, 25-40 measured lists, 41+ comparisons and reference
const famOf = (f) => (parseInt(f, 10) <= 24 ? 'guide' : parseInt(f, 10) <= 40 ? 'measured' : 'compare');
const INDEX = ARTS.map(([file, slug, title, desc]) => {
  const md = fs.readFileSync(DRAFTS + '/' + file, 'utf8');
  return { file, slug, title, desc, family: famOf(file), sig: signals(md) };
});

const RELATED = relatedGraph(INDEX);

for (let ai = 0; ai < ARTS.length; ai++) {
  const [file, slug, title, desc, opts] = ARTS[ai];
  const md = fs.readFileSync(DRAFTS + '/' + file, 'utf8');
  const html = page(slug, title, desc, mdToHtml(md) + '\n      ' +
    relatedHtml(RELATED[ai]), opts, md);
  fs.writeFileSync(ROOT + '/' + slug + '.html', html);
  hubCards.push(`<a class="card" href="${slug}.html" data-reveal style="display:block;padding:24px 26px;text-decoration:none">
        <h3 style="font-family:var(--font-body);font-weight:600;font-size:1.12rem;margin:0 0 .4rem">${esc(title)}</h3>
        <p class="text-dim" style="margin:0;font-size:.94rem;line-height:1.55">${esc(desc)}</p>
      </a>`);
}

// build the hub
const hubDesc = 'Free guides to learning piano with letter notes — how to read them, how to play without sheet music, the easiest pieces to start with, and how to practise.';
const hub = `<!DOCTYPE html>
<html lang="en" data-year="2026">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Learn Piano — Guides &amp; Articles | DoReDog</title>
<meta name="description" content="${attr(hubDesc)}">
<meta name="theme-color" content="#06060b">
<link rel="canonical" href="https://doredog.com/articles">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DoReDog">
<meta property="og:title" content="Learn Piano — Guides &amp; Articles | DoReDog">
<meta property="og:description" content="${attr(hubDesc)}">
<meta property="og:url" content="https://doredog.com/articles">
<meta property="og:image" content="https://doredog.com/assets/covers/_mood-atlas.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ICON}">
<link rel="stylesheet" href="css/main.css?v=${V}">
<link rel="stylesheet" href="css/player.css?v=${V}">
${ADSENSE}
</head>
<body data-page="articles">
<header id="site-header"></header>
<main>
  <section style="padding-top:98px">
    <div class="container" style="max-width:900px">
      <span class="eyebrow" data-reveal>Learn</span>
      <h1 class="display" data-reveal data-delay="1" style="font-size:clamp(2rem,4vw,3rem);margin:.3rem 0 .6rem">Piano guides &amp; articles</h1>
      <p class="lead text-dim" data-reveal data-delay="1" style="max-width:640px;margin-bottom:32px">Everything you need to start playing piano with letter notes — no sheet music, no theory. Free, and written for real beginners.</p>
      <a class="card" href="midi-to-letter-notes.html" data-reveal style="display:block;padding:24px 26px;text-decoration:none;border-color:rgba(246,183,63,.35);margin-bottom:18px">
        <span class="eyebrow">Free tool</span>
        <h3 style="font-family:var(--font-body);font-weight:600;font-size:1.12rem;margin:.4rem 0 .4rem">MIDI → letter notes converter</h3>
        <p class="text-dim" style="margin:0;font-size:.94rem;line-height:1.55">Drop in any MIDI file and get playable letter notes back, instantly. Runs in your browser — nothing is uploaded.</p>
      </a>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px">
      ${hubCards.join('\n      ')}
      </div>
    </div>
  </section>
</main>
<footer id="site-footer"></footer>
<script src="js/data.js?v=${V}"></script>
<script src="js/site.js?v=${V}"></script>
</body>
</html>
`;
fs.writeFileSync(ROOT + '/articles.html', hub);

// The arcade's URLs ride in the same tool-owned sitemap block. Read the game ids
// from the registry source itself so a new game cannot be forgotten here.
const GAME_IDS = [];
for (const f of ['js/arcade-games-a.js', 'js/arcade-games-b.js']) {
  const src = fs.readFileSync(ROOT + '/' + f, 'utf8');
  for (const m of src.matchAll(/id: '([a-z0-9-]+)', title/g)) GAME_IDS.push(m[1]);
}
patchSitemap(ARTS.map((a) => a[1]).concat(['games', 'flow'], GAME_IDS.map((g) => 'game?g=' + g)));

console.log('built', ARTS.length, 'article pages + articles.html hub');
console.log('slugs:', ARTS.map(a => a[1]).join(', '));
