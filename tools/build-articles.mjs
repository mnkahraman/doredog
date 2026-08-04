// Build styled article HTML pages + a "/articles" hub from the reviewed markdown drafts.
// Output: <slug>.html at repo root (Cloudflare serves clean /<slug>), plus articles.html hub.
import fs from 'fs';
import { siteVersion } from './site-version.mjs';
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
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
  ['32-easiest-mozart.md', 'the-easiest-mozart-pieces', 'The Easiest Mozart Pieces, Measured', 'All 65 Mozart pieces ranked easiest first — plus the attribution problem with his very earliest keyboard music, which not everyone tells you about.'],
  ['33-easiest-satie.md', 'the-easiest-satie-pieces', 'The Easiest Satie Pieces, Measured', 'All 27 Satie pieces ranked easiest first. Gymnopédie No. 1 is the hardest of the three, not the easiest — and five other pieces beat all of them.'],
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
      out.push('<div class="drd-list" data-list="' + list[1] + '" data-show="' + (list[2] || 24) + '"></div>');
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

function page(slug, title, desc, bodyHtml) {
  const canon = 'https://doredog.com/' + slug;
  const ld = JSON.stringify({
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
<script src="js/site.js?v=${V}"></script>${bodyHtml.includes('class="drd-list"') ? `
<script src="js/article-lists.js?v=${V}"></script>
<script src="js/lists.js?v=${V}"></script>` : ''}
</body>
</html>
`;
}

// build the 10 article pages
const hubCards = [];
for (const [file, slug, title, desc] of ARTS) {
  const md = fs.readFileSync(DRAFTS + '/' + file, 'utf8');
  const html = page(slug, title, desc, mdToHtml(md));
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

console.log('built', ARTS.length, 'article pages + articles.html hub');
console.log('slugs:', ARTS.map(a => a[1]).join(', '));
