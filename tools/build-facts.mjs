/* ============================================================================
   "Surprising things about music" — the curiosity-gap page.

   Every fact here is lifted from material ALREADY verified in this project
   (worker/composer-bios.js and marketing/content-drafts/song-notes.md), so each
   one carries the source it was checked against. Nothing is written from memory.

   Mechanic: hook (a question) -> reveal -> the striking answer -> the detail.
   The answer lives in the DOM inside <details>, so crawlers read it while
   visitors still get the reveal.

   Run:  node tools/build-facts.mjs
   ========================================================================== */
import fs from 'fs';
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
const V = 103;
const W = (a) => 'https://en.wikipedia.org/wiki/' + a;

const FACTS = [
  { id: 'fur-elise-published', cat: 'Pieces',
    q: 'How long after Beethoven died was Für Elise published?',
    hook: 'The most recognisable piano piece in the world sat unseen in a drawer for decades.',
    a: 'About 40 years — it wasn’t printed until 1867.',
    body: 'Beethoven dated the manuscript 27 April 1810, but never published it. The scholar Ludwig Nohl discovered and printed it in 1867, four decades after Beethoven’s death in 1827. The original manuscript has since been lost.',
    src: W('F%C3%BCr_Elise'), srcName: 'Wikipedia — Für Elise', link: 'song?id=fur-elise', linkText: 'Play Für Elise' },

  { id: 'moonlight-nickname', cat: 'Pieces',
    q: 'Who named the “Moonlight” Sonata?',
    hook: 'Everyone knows the name. Almost nobody knows Beethoven had nothing to do with it.',
    a: 'Not Beethoven — the nickname appeared after his death.',
    body: 'He published it as Piano Sonata No. 14, “Quasi una fantasia”, Op. 27 No. 2, in 1802. The “Moonlight” label spread from an 1824 comparison by the poet Ludwig Rellstab, and only became common in the late 1830s — years after Beethoven died in 1827.',
    src: W('Piano_Sonata_No._14_(Beethoven)'), srcName: 'Wikipedia — Piano Sonata No. 14', link: 'song?id=moonlight-sonata', linkText: 'Play the Moonlight Sonata' },

  { id: 'canon-obscure', cat: 'Pieces',
    q: 'How long was Pachelbel’s Canon forgotten?',
    hook: 'The most-played wedding piece on earth spent most of its life in total obscurity.',
    a: 'Centuries — it only became famous after a 1968 recording.',
    body: 'The Canon and Gigue in D major went out of fashion and stayed unknown for generations. A 1968 recording by the Jean-François Paillard chamber orchestra revived it, and by the early 1980s it was everywhere. Its looping chord progression has since shaped countless pop songs.',
    src: W('Pachelbel%27s_Canon'), srcName: 'Wikipedia — Pachelbel’s Canon', link: 'song?id=canon-in-d', linkText: 'Play Canon in D' },

  { id: 'ave-maria-not-prayer', cat: 'Pieces',
    q: 'Did Schubert write “Ave Maria” as a prayer?',
    hook: 'It’s sung in churches worldwide. That is not what he wrote.',
    a: 'No — it was a setting of a Walter Scott poem.',
    body: 'In 1825 Schubert set “Ellen’s third song” from a German translation of Scott’s narrative poem The Lady of the Lake, in which the character Ellen sings to the Virgin Mary. Because her song opens with the words “Ave Maria”, people later fitted the Latin prayer to his melody — and the pairing stuck so firmly that most listeners assume he wrote it that way.',
    src: W('Ellens_dritter_Gesang'), srcName: 'Wikipedia — Ellens dritter Gesang', link: 'song?id=ave-maria', linkText: 'Play Ave Maria' },

  { id: 'minuet-not-bach', cat: 'Attributions',
    q: 'Who actually wrote the famous Minuet in G?',
    hook: 'One of the most-taught beginner pieces in history was credited to the wrong man for two centuries.',
    a: 'Christian Petzold — not Bach.',
    body: 'The Minuet in G major (BWV Anh. 114) appears in the 1725 Notebook for Anna Magdalena Bach, which is why it was long attributed to Johann Sebastian Bach. Research established the Dresden organist Christian Petzold as its composer, and from the 1990 edition of the Bach catalogue the minuets are credited to him. The melody also became the 1965 pop hit “A Lover’s Concerto”.',
    src: W('Minuet_in_G_major_(Petzold)'), srcName: 'Wikipedia — Minuet in G major', link: 'song?id=minuet-in-g', linkText: 'Play the Minuet in G' },

  { id: 'toccata-doubt', cat: 'Attributions',
    q: 'Is the famous “horror movie” organ piece really by Bach?',
    hook: 'The most recognisable organ work ever written has a question mark over it.',
    a: 'Some scholars doubt it — though the leading Bach expert says yes.',
    body: 'The authorship of the Toccata and Fugue in D minor, BWV 565, has been questioned by a minority of scholars since 1981, when Peter Williams suggested it may have started life as a violin piece. Christoph Wolff, the foremost living Bach scholar, maintains it is genuinely Bach’s, and the Bach catalogue has never listed it as doubtful. Disney’s Fantasia (1940) made it famous; film later made it shorthand for villainy.',
    src: W('Toccata_and_Fugue_in_D_minor,_BWV_565'), srcName: 'Wikipedia — Toccata and Fugue in D minor', link: 'song?id=toccata-and-fugue', linkText: 'Play the Toccata and Fugue' },

  { id: 'baa-baa-not-twinkle', cat: 'Melodies',
    q: 'Is “Baa, Baa, Black Sheep” the same tune as “Twinkle, Twinkle”?',
    hook: 'Nearly everyone assumes yes. We assumed it too — until we checked the score.',
    a: 'Not in the traditional version — it’s a more ornate melody.',
    body: 'The tune usually paired with “Twinkle, Twinkle, Little Star” is the French melody “Ah! vous dirai-je, maman”, and many modern songbooks reuse it for “Baa, Baa, Black Sheep”. The traditional notated version is different and more decorated. We found this the hard way while building our library: writing the melody from memory would have shipped the wrong tune, so we now transcribe from published scores instead.',
    src: W('Baa,_Baa,_Black_Sheep'), srcName: 'Wikipedia — Baa, Baa, Black Sheep', link: 'song?id=baa-baa-black-sheep', linkText: 'Play Baa, Baa, Black Sheep' },

  { id: 'gnossiennes-no-barlines', cat: 'Composers',
    q: 'What did Satie leave out of the Gnossiennes?',
    hook: 'He removed something every other composer treats as essential.',
    a: 'Time signatures and bar lines — the music is written in “free time”.',
    body: 'The three published Gnossiennes have no time signatures and no bar lines. Satie also filled the score with unusual written directions such as “with astonishment”. He even invented the word gnossienne as a title. For a player, the missing grid is liberating: there is no rigid pulse to fight.',
    src: W('Gnossiennes'), srcName: 'Wikipedia — Gnossiennes', link: 'song?id=gnossienne-no-1', linkText: 'Play Gnossienne No. 1' },

  { id: 'fantaisie-against-wishes', cat: 'Composers',
    q: 'Which Chopin favourite was published against his explicit wishes?',
    hook: 'He left instructions. They were ignored.',
    a: 'The Fantaisie-Impromptu — printed in 1855, after his death.',
    body: 'Chopin composed the Fantaisie-Impromptu in C-sharp minor in 1834 but never published it, having left instructions that his unpublished manuscripts not be released. It appeared in 1855, six years after he died, and went on to become one of his most popular works. Its middle melody later resurfaced in the song “I’m Always Chasing Rainbows”.',
    src: W('Fantaisie-Impromptu'), srcName: 'Wikipedia — Fantaisie-Impromptu', link: 'song?id=fantaisie-impromptu', linkText: 'Play the Fantaisie-Impromptu' },

  { id: 'nocturne-inventor', cat: 'Forms',
    q: 'Chopin is the king of the nocturne — but did he invent it?',
    hook: 'The form that defines him was somebody else’s idea.',
    a: 'No — the Irish composer John Field did.',
    body: 'John Field is generally viewed as the father of the Romantic nocturne. He wrote 18 of them and established the characteristic texture: a singing melody over a rippling, almost guitar-like accompaniment. Chopin then wrote 21 nocturnes of his own and became the form’s most famous exponent — so completely that most listeners now hear “nocturne” and think only of him.',
    src: W('Nocturne'), srcName: 'Wikipedia — Nocturne', link: 'what-is-a-nocturne.html', linkText: 'What is a nocturne?' },

  { id: 'bizet-died-before-success', cat: 'Composers',
    q: 'Did Bizet ever know Carmen was a masterpiece?',
    hook: 'The most performed opera in the world was, at first, a disappointment.',
    a: 'No — he died three months after the premiere.',
    body: 'Carmen premiered in March 1875 to a cool reception. Bizet died that June, aged 36, before the opera became one of the most frequently performed works in the entire repertoire. He never saw its success.',
    src: W('Georges_Bizet'), srcName: 'Wikipedia — Georges Bizet', link: 'song?id=carmen-habanera', linkText: 'Play the Habanera' },

  { id: 'swan-lake-flop', cat: 'Pieces',
    q: 'How was Swan Lake received at its premiere?',
    hook: 'Today it’s the definitive ballet. In 1877 the critics were not impressed.',
    a: 'As a failure — “too noisy”, “too symphonic”.',
    body: 'Tchaikovsky composed Swan Lake in 1875–76 and it premiered at Moscow’s Bolshoi Theatre in 1877. Critics found it too noisy, too “Wagnerian” and too symphonic, and thought the choreography unmemorable. The version companies dance today descends largely from an 1895 St. Petersburg revival — staged after Tchaikovsky had died.',
    src: W('Swan_Lake'), srcName: 'Wikipedia — Swan Lake', link: 'song?id=swan-lake', linkText: 'Play Swan Lake' },

  { id: 'brahms-fan', cat: 'Composers',
    q: 'What did Brahms write on a lady’s fan?',
    hook: 'One of the great composers paid a rival the ultimate compliment — in writing.',
    a: 'The opening bars of The Blue Danube, plus “Unfortunately not by Johannes Brahms”.',
    body: 'Johann Strauss II composed The Blue Danube in 1866; it premiered in Vienna in February 1867. Brahms, asked for an autograph, wrote out its opening bars and added the line beneath. The waltz was written first with choral lyrics — the purely orchestral version, made for the 1867 Paris World’s Fair, is the one that conquered the world.',
    src: W('The_Blue_Danube'), srcName: 'Wikipedia — The Blue Danube', link: 'song?id=blue-danube', linkText: 'Play The Blue Danube' },

  { id: 'boulanger-prix-de-rome', cat: 'Firsts',
    q: 'Who was the first woman to win the Prix de Rome for composition?',
    hook: 'She won the most prestigious prize in French music — and died at 24.',
    a: 'Lili Boulanger, in 1913.',
    body: 'Boulanger (1893–1918) won the Grand Prix de Rome with her cantata Faust et Hélène, the first woman ever to do so. Associated with the Symbolist and Impressionist movements, she wrote D’un matin de printemps and the song cycle Clairières dans le ciel before dying at 24.',
    src: W('Lili_Boulanger'), srcName: 'Wikipedia — Lili Boulanger', link: 'composer?name=Lili%20Boulanger', linkText: 'Lili Boulanger’s pieces' },

  { id: 'beach-first-symphony', cat: 'Firsts',
    q: 'Who wrote the first symphony published by an American woman?',
    hook: 'A largely self-taught composer broke a barrier no one else had.',
    a: 'Amy Beach — her “Gaelic” Symphony, premiered 1896.',
    body: 'Amy Beach (1867–1944) was the first successful American female composer of large-scale art music, and her Gaelic Symphony was the first symphony composed and published by an American woman. She also wrote a Piano Concerto in C-sharp minor and a Mass in E-flat major.',
    src: W('Amy_Beach'), srcName: 'Wikipedia — Amy Beach', link: 'composer?name=Amy%20Marcy%20Beach', linkText: 'Amy Beach’s pieces' },

  { id: 'chaminade-legion', cat: 'Firsts',
    q: 'Who was the first female composer awarded the Légion d’Honneur?',
    hook: 'France’s highest order of merit had never gone to a woman composer before.',
    a: 'Cécile Chaminade, in 1913.',
    body: 'Chaminade (1857–1944) was a French Romantic composer whose Concertino for flute and orchestra remains her most popular work today. In 1913 she became the first female composer to receive the Légion d’Honneur.',
    src: W('C%C3%A9cile_Chaminade'), srcName: 'Wikipedia — Cécile Chaminade', link: 'composer?name=C%C3%A9cile%20Chaminade', linkText: 'Chaminade’s pieces' },

  { id: 'scarlatti-555', cat: 'Composers',
    q: 'How many keyboard sonatas did Domenico Scarlatti write?',
    hook: 'One composer, one form, an almost absurd number of them.',
    a: '555.',
    body: 'Scarlatti (1685–1757) — born the same year as Bach and Handel — is known mainly for his 555 keyboard sonatas. Inventive and brilliantly idiomatic to the instrument, they are the body of work for which he is remembered.',
    src: W('Domenico_Scarlatti'), srcName: 'Wikipedia — Domenico Scarlatti', link: 'composer?name=Domenico%20Scarlatti', linkText: 'Scarlatti’s pieces' },

  { id: 'telemann-prolific', cat: 'Composers',
    q: 'Who is one of the most prolific composers in history?',
    hook: 'More than three thousand works — and he was Bach’s contemporary and friend.',
    a: 'Georg Philipp Telemann.',
    body: 'Telemann (1681–1767) produced more than 3,000 works, making him one of the most prolific composers who ever lived. From 1721 he was musical director of Hamburg’s five main churches. His best-known works include Tafelmusik and the Brockes Passion.',
    src: W('Georg_Philipp_Telemann'), srcName: 'Wikipedia — Georg Philipp Telemann', link: 'composer?name=Georg%20Philipp%20Telemann', linkText: 'Telemann’s pieces' },

  { id: 'entertainer-revival', cat: 'Pieces',
    q: 'How did a 1902 piano rag reach the pop charts in 1974?',
    hook: 'Seventy years after it was written, it was a Top 3 hit.',
    a: 'A film — The Sting put it at No. 3 on the Billboard Hot 100.',
    body: 'Scott Joplin copyrighted “The Entertainer” in December 1902. Largely forgotten for decades, it returned with the 1973 film The Sting: Marvin Hamlisch’s adaptation reached No. 3 on the Billboard Hot 100 in May 1974 and won an Academy Award. The RIAA later ranked it tenth on its “Songs of the Century” list.',
    src: W('The_Entertainer_(rag)'), srcName: 'Wikipedia — The Entertainer', link: 'song?id=the-entertainer', linkText: 'Play The Entertainer' },

  { id: 'silent-night-teacher', cat: 'Pieces',
    q: 'Who composed the music to “Silent Night”?',
    hook: 'The world’s most famous carol was written by a village schoolteacher.',
    a: 'Franz Xaver Gruber, on Christmas Eve 1818.',
    body: 'Gruber (1787–1863) was an Austrian primary school teacher, church organist and composer. He wrote the music to “Stille Nacht” on Christmas Eve 1818, in collaboration with the lyricist Joseph Mohr.',
    src: W('Franz_Xaver_Gruber'), srcName: 'Wikipedia — Franz Xaver Gruber', link: 'song?id=silent-night', linkText: 'Play Silent Night' },

  { id: 'gounod-over-bach', cat: 'Pieces',
    q: 'What did Gounod build his “Ave Maria” on top of?',
    hook: 'He didn’t write the harmony. He borrowed it from a piece written 130 years earlier.',
    a: 'Bach’s Prelude in C — the opening of The Well-Tempered Clavier.',
    body: 'Bach’s Prelude in C major, BWV 846, dated 1722 in his autograph, is built almost entirely from gently rolling broken chords. Charles Gounod composed a melody designed to sit over that prelude; it was later set to the Ave Maria text. Two of the most famous pieces in music, a century apart, share the same chords.',
    src: W('Prelude_and_Fugue_in_C_major,_BWV_846'), srcName: 'Wikipedia — Prelude in C major, BWV 846', link: 'song?id=prelude-in-c', linkText: 'Play the Prelude in C' },

  { id: 'turkish-march-manuscript', cat: 'Pieces',
    q: 'What turned up in a Budapest library in 2014?',
    hook: 'A famous Mozart manuscript, missing for two centuries.',
    a: 'Lost pages of Mozart’s own manuscript of the “Turkish March” sonata.',
    body: 'The Rondo alla Turca is the finale of Mozart’s Piano Sonata No. 11, K. 331, composed around 1783. In 2014 several long-lost pages of Mozart’s autograph manuscript were rediscovered in Budapest’s National Széchényi Library. Mozart himself headed the movement “Alla turca”: it imitates the Turkish Janissary bands then fashionable in Vienna.',
    src: W('Piano_Sonata_No._11_(Mozart)'), srcName: 'Wikipedia — Piano Sonata No. 11', link: 'song?id=rondo-alla-turca', linkText: 'Play the Turkish March' },

  { id: 'burleigh-dvorak', cat: 'Composers',
    q: 'Who introduced Dvořák to African-American music?',
    hook: 'The connection behind one of the most famous symphonies ever written.',
    a: 'Harry Thacker Burleigh.',
    body: 'Burleigh (1866–1949) was an American composer and singer who arranged spirituals in a classical form and made them available to concert artists. He introduced Antonín Dvořák to Black American music — an influence on Dvořák’s celebrated “From the New World” symphony.',
    src: W('Harry_Burleigh'), srcName: 'Wikipedia — Harry Burleigh', link: 'composer?name=Harry%20Thacker%20Burleigh', linkText: 'Burleigh’s pieces' },

  { id: 'hensel-unpublished', cat: 'Composers',
    q: 'How many works did Fanny Hensel write — and how many were published?',
    hook: 'A composer of over 450 works who was largely kept out of print.',
    a: 'Over 450 written; almost none published in her lifetime.',
    body: 'Fanny Hensel (née Mendelssohn, 1805–1847), Felix Mendelssohn’s elder sister, composed more than 450 works, including over 125 pieces for solo piano and over 250 Lieder. She remained largely unpublished during her life because of the social conventions restricting women’s public musical careers.',
    src: W('Fanny_Mendelssohn'), srcName: 'Wikipedia — Fanny Mendelssohn', link: 'composer?name=Fanny%20(Mendelssohn)%20Hensel', linkText: 'Fanny Hensel’s pieces' },
];

// ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

const cats = [...new Set(FACTS.map((f) => f.cat))];

const cards = FACTS.map((f) => `
      <article class="fact" id="${f.id}" data-cat="${attr(f.cat)}" data-reveal>
        <span class="fact-cat">${esc(f.cat)}</span>
        <h2 class="fact-q">${esc(f.q)}</h2>
        <p class="fact-hook">${esc(f.hook)}</p>
        <details class="fact-reveal">
          <summary><span>Show me</span> <b aria-hidden="true">👀</b></summary>
          <p class="fact-a">${esc(f.a)}</p>
          <p class="fact-body">${esc(f.body)}</p>
          <p class="fact-foot">
            <a href="${attr(f.link)}">${esc(f.linkText)} →</a>
            <a class="fact-src" href="${attr(f.src)}" target="_blank" rel="noopener">Source: ${esc(f.srcName)}</a>
          </p>
        </details>
      </article>`).join('\n');

const ld = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: FACTS.map((f) => ({ '@type': 'Question', name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a + ' ' + f.body } }))
}).replace(/</g, '\\u003c');

const DESC = 'Surprising, sourced facts about classical music: the piece Beethoven never named, the wedding classic forgotten for centuries, the beginner minuet that is not by Bach — and more.';

const html = `<!DOCTYPE html>
<html lang="en" data-year="2026">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${FACTS.length} Surprising Facts About Classical Music | DoReDog</title>
<meta name="description" content="${attr(DESC)}">
<link rel="canonical" href="https://doredog.com/facts">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DoReDog">
<meta property="og:title" content="${FACTS.length} Surprising Facts About Classical Music">
<meta property="og:description" content="${attr(DESC)}">
<meta property="og:url" content="https://doredog.com/facts">
<meta property="og:image" content="https://doredog.com/assets/covers/_mood-atlas.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#06060b">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='11' fill='%230c0c16'/%3E%3Cline x1='11' y1='27' x2='11' y2='16' stroke='%23ff54b2' stroke-width='3'/%3E%3Cline x1='17' y1='27' x2='17' y2='12' stroke='%2335e08c' stroke-width='3'/%3E%3Cline x1='23' y1='27' x2='23' y2='18' stroke='%23f6b73f' stroke-width='3'/%3E%3Cline x1='29' y1='27' x2='29' y2='14' stroke='%234fa3ff' stroke-width='3'/%3E%3C/svg%3E">
<link rel="stylesheet" href="css/main.css?v=${V}">
<link rel="stylesheet" href="css/player.css?v=${V}">
<script type="application/ld+json">${ld}</script>
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9610317354666717" crossorigin="anonymous"></script>
</head>
<body data-page="facts">
<header id="site-header"></header>

<main>
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow" data-reveal style="justify-content:center;display:flex">Curious?</span>
      <h1 class="display" data-reveal data-delay="1" style="margin:1rem 0">${FACTS.length} surprising things<br>about <span class="text-grad">classical music</span></h1>
      <p class="lead" data-reveal data-delay="2">A question, a guess, then the answer. Every one is sourced — and every piece mentioned is playable here in letter notes.</p>
    </div>
  </section>

  <section class="section-sm">
    <div class="container" style="max-width:780px">
      <div class="fact-filters" data-reveal>
        <button class="chip active" data-fact-cat="all">All</button>
        ${cats.map((c) => `<button class="chip" data-fact-cat="${attr(c)}">${esc(c)}</button>`).join('\n        ')}
      </div>
${cards}
      <p class="text-mute" style="font-size:.85rem;margin-top:34px;line-height:1.6">
        Each answer links to the reference it was checked against. Facts are drawn from our
        source-cited composer biographies and piece notes — see also
        <a href="on-this-day.html" style="color:var(--gold)">On This Day in Music</a> and
        <a href="articles.html" style="color:var(--gold)">our guides</a>.
      </p>
    </div>
  </section>

  <div class="container">
    <div class="ad-label">Advertisement</div>
    <div class="ad-slot ad-leaderboard" data-ad="leaderboard">Ad space — 970×250 · paste your AdSense unit here</div>
  </div>
</main>

<footer id="site-footer"></footer>

<script src="js/data.js?v=${V}"></script>
<script src="js/site.js?v=${V}"></script>
<script>
(function(){var b=document.querySelectorAll('[data-fact-cat]');b.forEach(function(x){x.addEventListener('click',function(){
 b.forEach(function(y){y.classList.remove('active')});x.classList.add('active');var c=x.getAttribute('data-fact-cat');
 document.querySelectorAll('.fact').forEach(function(f){f.hidden=(c!=='all'&&f.getAttribute('data-cat')!==c)});});});})();
</script>
</body>
</html>
`;

fs.writeFileSync(ROOT + '/facts.html', html);
console.log('wrote facts.html — ' + FACTS.length + ' facts across ' + cats.length + ' categories: ' + cats.join(', '));
