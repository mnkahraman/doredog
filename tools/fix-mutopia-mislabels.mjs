/* ============================================================================
   The five Mozart Lieder filed as "Klavierstück, K. 5xx" (fixed in
   tools/fix-mozart-lieder.mjs) were not a one-off. The Mutopia import built its
   titles out of the LilyPond *file names*, so wherever Mutopia names a file
   after its directory position rather than its work — no1.ly, k453a.ly,
   zither.ly, Symphony5_2.ly — the catalogue got a placeholder instead of a
   title. A few were then "enriched" with a guess, which is how twelve horn
   duets became "Klavierstück No. 1–12" and an F minor organ piece became
   Mozart's D minor Fantasy.

   All 637 m- entries were re-joined to their Mutopia source metadata (the
   .rdf beside each .ly, which carries mp:title / mp:opus / mp:for / mp:date);
   613 matched. Everything below is a case where our title named the wrong work
   or was not a title at all, and where a second source confirms the identity.

   Notable ones, with what confirmed them:

     m-mozart-no1 … no12   Mutopia MozartWA/KV487/noN/ — the Twelve Duos for
                           two horns, K. 487 (496a). Autograph headed "Wien den
                           27t Jullius 1786"; IMSLP gives 1786, two horns.
                           They were titled "Klavierstück No. N", dated 1785.

     m-mozart-fantasia     Mutopia MozartWA/KV594/ — the Adagio and Allegro in
                           F minor for a mechanical organ, K. 594 (1790), often
                           printed as a "Fantasia" for piano duet. It was
                           titled "Fantasy in D minor (KV 397)", a work the
                           site already carries at id fantasia-k397. The
                           notation settles it: F minor triad, 3/4.

     m-mozart-k453a        Kleiner Trauermarsch in C minor, K. 453a — written
                           into Barbara Ployer's notebook, Vienna 1784.

     m-mozart-k375g        Fugue in G major (fragment), K. Anh. 41/375g;
                           IMSLP dates it "probably begun 1776–77", so the year
                           stays approximate.

   Years are only marked verified (yv:1) where a source gives a single year.
   Where the sources give a range or a query — Beethoven's Op. 30 No. 2
   ("1801–1802"), Op. 66 ("1796?"), Mozart's K. 349/351 (Munich, Nov 1780 to
   Mar 1781) — the year is corrected but `circa` is kept.

   Run:  node tools/fix-mutopia-mislabels.mjs
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const P = ROOT + '/js/data.js';

/* title: the corrected title.
   year:  set only when the current year is wrong or unverified.
   yv:    1 when a source gives a single composition year; omitted otherwise,
          in which case `circa` is left in place.                            */
const FIX = {
  /* --- Mozart, Twelve Duos for two horns, K. 487 (496a) — Vienna, 27 July 1786.
         Filed as "Klavierstück No. 1–12", dated 1785. --------------------- */
  'm-mozart-no1':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 1',  year: 1786, yv: 1 },
  'm-mozart-no2':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 2',  year: 1786, yv: 1 },
  'm-mozart-no3':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 3',  year: 1786, yv: 1 },
  'm-mozart-no4':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 4',  year: 1786, yv: 1 },
  'm-mozart-no5':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 5',  year: 1786, yv: 1 },
  'm-mozart-no6':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 6',  year: 1786, yv: 1 },
  'm-mozart-no7':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 7',  year: 1786, yv: 1 },
  'm-mozart-no8':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 8',  year: 1786, yv: 1 },
  'm-mozart-no9':  { title: 'Twelve Duos for Two Horns, K. 487 — No. 9',  year: 1786, yv: 1 },
  'm-mozart-no10': { title: 'Twelve Duos for Two Horns, K. 487 — No. 10', year: 1786, yv: 1 },
  'm-mozart-no11': { title: 'Twelve Duos for Two Horns, K. 487 — No. 11', year: 1786, yv: 1 },
  'm-mozart-no12': { title: 'Twelve Duos for Two Horns, K. 487 — No. 12', year: 1786, yv: 1 },

  /* --- Mozart, the rest of the placeholder titles ---------------------- */
  'm-mozart-fantasia':    { title: 'Adagio and Allegro in F minor, K. 594', year: 1790, yv: 1 },
  'm-mozart-k375g':       { title: 'Fugue in G major (fragment), K. Anh. 41/375g', year: 1777 },
  'm-mozart-k453a':       { title: 'Kleiner Trauermarsch in C minor, K. 453a', year: 1784, yv: 1 },
  'm-mozart-k6deest':     { title: 'Sonata in C major (fragment), K⁶ deest' },
  'm-mozart-symphony25-2':{ title: 'Symphony No. 25 in G minor, K. 183 — II. Andante', year: 1773, yv: 1 },
  'm-mozart-mozarthornquintet': { title: 'Horn Quintet in E-flat major, K. 407', year: 1782, yv: 1 },
  'm-mozart-zither':      { title: 'Komm, liebe Zither, komm, K. 351', year: 1781 },
  'm-mozart-zufriedenheit':       { title: 'Die Zufriedenheit, K. 349 (voice and mandolin)', year: 1781 },
  'm-mozart-zufriedenheit-piano': { title: 'Die Zufriedenheit, K. 349 (voice and piano)',    year: 1781 },
  'm-mozart-notteegiorno': { title: 'Notte e giorno faticar (Don Giovanni, K. 527)', year: 1787, yv: 1 },
  'm-mozart-dies-irae':    { title: 'Dies irae (Requiem, K. 626)', year: 1791, yv: 1 },
  'm-mozart-magicflute-15-aria-piano': { title: 'In diesen heil’gen Hallen (Die Zauberflöte, K. 620)', year: 1791, yv: 1 },
  /* K. 457 was completed 14 October 1784; the Mutopia .rdf carries a typo,
     1878, which the import copied into two of the three movements. */
  'm-mozart-sonata1': { year: 1784, yv: 1 },
  'm-mozart-sonata2': { year: 1784, yv: 1 },

  /* --- Beethoven: file names imported verbatim ------------------------- */
  'm-beethovenlv-symphony5-2': { title: 'Symphony No. 5 in C minor, Op. 67 — II. Andante con moto', year: 1808, yv: 1 },
  'm-beethovenlv-symphony7-2': { title: 'Symphony No. 7 in A major, Op. 92 — II. Allegretto', year: 1812 },
  'm-beethovenlv-violinsonata-no7-1': { title: 'Violin Sonata No. 7 in C minor, Op. 30 No. 2 — I. Allegro con brio', year: 1802 },
  'm-beethovenlv-violinsonata-no7-4': { title: 'Violin Sonata No. 7 in C minor, Op. 30 No. 2 — IV. Finale: Allegro', year: 1802 },
  'm-beethovenlv-cellosonata-no3-1':  { title: 'Cello Sonata No. 3 in A major, Op. 69 — I. Allegro ma non tanto', year: 1807 },
  'm-beethovenlv-quartetopus18-no4-1': { title: 'String Quartet No. 4 in C minor, Op. 18 No. 4 — I. Allegro ma non tanto', year: 1799 },
  'm-beethovenlv-quartetopus18-no4-2': { title: 'String Quartet No. 4 in C minor, Op. 18 No. 4 — II. Andante scherzoso quasi allegretto', year: 1799 },
  'm-beethovenlv-quartetopus18-no4-3': { title: 'String Quartet No. 4 in C minor, Op. 18 No. 4 — III. Menuetto: Allegretto', year: 1799 },
  'm-beethovenlv-quartetopus18-no4-4': { title: 'String Quartet No. 4 in C minor, Op. 18 No. 4 — IV. Allegro – Prestissimo', year: 1799 },
  'm-beethovenlv-quartet-opus-59no3-2': { title: 'String Quartet No. 9 in C major, Op. 59 No. 3 — II. Andante con moto quasi allegretto', year: 1806, yv: 1 },
  'm-beethovenlv-violin-concerto-2': { title: 'Violin Concerto in D major, Op. 61 — II. Larghetto', year: 1806, yv: 1 },
  'm-beethovenlv-violin-concerto-3': { title: 'Violin Concerto in D major, Op. 61 — III. Rondo: Allegro', year: 1806, yv: 1 },
  'm-beethovenlv-trio-op11-1': { title: 'Clarinet Trio in B-flat major, Op. 11 — I. Allegro con brio', year: 1797, yv: 1 },
  'm-beethovenlv-trio-op11-3': { title: 'Clarinet Trio in B-flat major, Op. 11 — III. Tema con variazioni', year: 1797, yv: 1 },
  'm-beethovenlv-romanze-opus40': { title: 'Romance No. 1 in G major, Op. 40', year: 1802 },
  'm-beethovenlv-romanze-opus50': { title: 'Romance No. 2 in F major, Op. 50', year: 1798 },
  'm-beethovenlv-variations-opus66': { title: '12 Variations on “Ein Mädchen oder Weibchen”, Op. 66', year: 1796 },
  'm-beethovenlv-fuge-opus137': { title: 'Fugue in D major for String Quintet, Op. 137', year: 1817, yv: 1 },
  /* WoO 29's composition year is genuinely open — IMSLP places the manuscript
     in the 1700s and first publication in 1865 — so only the title changes. */
  'm-beethovenlv-marsch-woo29': { title: 'March in B-flat major for Wind Sextet, WoO 29' },

  /* --- Bach: BWV 1006a numbered by position, not by dance -------------- */
  'm-bach-bwv-1006a-1': { title: 'Suite in E major, BWV 1006a — I. Prélude' },
  'm-bach-bwv-1006a-2': { title: 'Suite in E major, BWV 1006a — II. Loure' },
  'm-bach-bwv-1006a-3': { title: 'Suite in E major, BWV 1006a — III. Gavotte en Rondeau' },
  'm-bach-bwv-1006a-4': { title: 'Suite in E major, BWV 1006a — IV. Menuet I' },
  'm-bach-bwv-1006a-5': { title: 'Suite in E major, BWV 1006a — V. Menuet II' },
  'm-bach-bwv-1006a-6': { title: 'Suite in E major, BWV 1006a — VI. Bourrée' },
  'm-bach-bwv-1006a-7': { title: 'Suite in E major, BWV 1006a — VII. Gigue' },
  'm-bach-bwv-1006a-1g': { title: 'Suite in E major, BWV 1006a — I. Prélude (guitar setting)' },
  'm-bach-bwv-1006a-2g': { title: 'Suite in E major, BWV 1006a — II. Loure (guitar setting)' },
  'm-bach-bwv-1006a-3g': { title: 'Suite in E major, BWV 1006a — III. Gavotte en Rondeau (guitar setting)' },
  'm-bach-bwv-1006a-4g': { title: 'Suite in E major, BWV 1006a — IV. Menuet I (guitar setting)' },
  'm-bach-bwv-1006a-5g': { title: 'Suite in E major, BWV 1006a — V. Menuet II (guitar setting)' },
  'm-bach-bwv-1006a-6g': { title: 'Suite in E major, BWV 1006a — VI. Bourrée (guitar setting)' },
  'm-bach-bwv-1006a-7g': { title: 'Suite in E major, BWV 1006a — VII. Gigue (guitar setting)' },
  'm-bach-minuet-xpose':      { title: 'Menuet in G major, BWV Anh. 114' },
  'm-bach-o-haupt-voll-blut': { title: 'O Haupt voll Blut und Wunden (St Matthew Passion, BWV 244)' },
  'm-bach-bwv653b':           { title: 'An Wasserflüssen Babylon, BWV 653b' },

  /* --- the remaining single cases -------------------------------------- */
  'm-debussy-l117-prel-4': { title: 'Préludes, Book I — No. 4: Les sons et les parfums tournent dans l’air du soir', year: 1910, yv: 1 },
  'm-chopin-chp-op-35-4-scholz-fi': { title: 'Piano Sonata No. 2 in B-flat minor, Op. 35 — IV. Finale: Presto', year: 1839, yv: 1 },
  'm-schubert-erlkoenig-alt': { title: 'Erlkönig, D. 328 (Op. 1)', year: 1815, yv: 1 },
  'm-schubert-schubertf-d881b-fischerweise': { title: 'Fischerweise, D. 881 (Op. 96 No. 4) — second version', year: 1826, yv: 1 },
  'm-schumann-16-berceuse': { title: 'Albumblätter, Op. 124 — No. 16: Schlummerlied', year: 1841, yv: 1 },
  'm-glazunov-glazunovreveries': { title: 'Rêverie in D-flat major, Op. 24', year: 1890, yv: 1, yk: 'p' }
};

/* The five Lieder tools/fix-mozart-lieder.mjs corrected in js/data.js. Their
   enrich.json entries were left behind, so `node tools/convert` would put
   "Klavierstück, K. 5xx" straight back. Folded in here for the same reason the
   corrections above are written to enrich.json rather than to data.js alone. */
const ALSO_ENRICH = {
  'm-mozart-k517': { title: 'Die Alte, K. 517', year: 1787, yv: 1 },
  'm-mozart-k518': { title: 'Die Verschweigung, K. 518', year: 1787, yv: 1 },
  'm-mozart-k519': { title: 'Das Lied der Trennung, K. 519', year: 1787, yv: 1 },
  'm-mozart-k520': { title: 'Als Luise die Briefe ihres ungetreuen Liebhabers verbrannte, K. 520', year: 1787, yv: 1 },
  'm-mozart-k523': { title: 'Abendempfindung an Laura, K. 523', year: 1787, yv: 1 }
};

let t = fs.readFileSync(P, 'utf8');
let titles = 0, years = 0;
const missed = [];

for (const [id, fix] of Object.entries(FIX)) {
  // Operate on this entry's own block only. The year line comes in two shapes in
  // data.js — a bare `year: N,` and an already-verified `year: N, yv: 1, yk: "p",` —
  // so slice the entry out and rewrite it rather than pattern-match the whole file.
  const start = t.indexOf('id: "' + id + '"');
  if (start < 0) { missed.push(id + ' (not found)'); continue; }
  const end = t.indexOf('\n  },', start);
  if (end < 0) { missed.push(id + ' (unterminated)'); continue; }

  let block = t.slice(start, end);

  if (fix.title) {
    const oldTitle = (block.match(/title:\s*"([^"]*)"/) || [])[1];
    if (!oldTitle) { missed.push(id + ' (no title)'); continue; }
    block = block.replace(/title:\s*"[^"]*"/, 'title: ' + JSON.stringify(fix.title));
    // The blurb was generated from the placeholder title. It is formulaic, so
    // rebuild it rather than substituting — a "Suite BWV 1006a — III" title
    // leaves "Suite BWV 1006a" in the blurb, and substituting the old title
    // into the new one doubles it up when the old is a substring of the new
    // ("Zufriedenheit" inside "Die Zufriedenheit, K. 349").
    const blurb = (block.match(/blurb:\s*"((?:[^"\\]|\\.)*)"/) || [])[1];
    const formula = blurb && blurb.match(/^The full .+ by (.+?), in colour-coded letter notes with separate right- and left-hand lines\.$/);
    if (formula) {
      block = block.replace(/blurb:\s*"(?:[^"\\]|\\.)*"/, 'blurb: ' + JSON.stringify(
        'The full ' + fix.title + ' by ' + formula[1] +
        ', in colour-coded letter notes with separate right- and left-hand lines.'));
    } else if (blurb && blurb.includes(oldTitle)) {
      block = block.replace(/blurb:\s*"(?:[^"\\]|\\.)*"/,
        'blurb: ' + JSON.stringify(blurb.split(oldTitle).join(fix.title)));
    }
    titles++;
  }

  if (fix.year) {
    if (!/year:\s*\d+/.test(block)) { missed.push(id + ' (no year)'); continue; }
    const flags = (fix.yv ? ', yv: 1' : '') + (fix.yk ? ', yk: "' + fix.yk + '"' : '');
    block = block.replace(/year:\s*\d+,(\s*yv:\s*\d+,)?(\s*yk:\s*"[^"]*",)?/, 'year: ' + fix.year + flags + ',');
    // a verified year is not approximate; an uncertain one stays flagged
    if (fix.yv) block = block.replace(/\n\s*circa:\s*true,/, '');
    years++;
  }

  t = t.slice(0, start) + block + t.slice(end);
}

if (missed.length) { console.error('FAILED:', missed.join(', ')); process.exit(1); }
fs.writeFileSync(P, t);
console.log('rewrote ' + titles + ' titles and ' + years + ' years across ' +
            Object.keys(FIX).length + ' entries in js/data.js');

/* data.js is generated. tools/enrich.json is what convert.js reads to override
   the file-name titles, so the correction has to land there as well or the next
   `node tools/convert` puts every placeholder back. convert.js maps
   {title, year, yearEst} → {title, year, circa}; it does not emit yv, which
   tools/apply-verified-years.mjs adds afterwards, so yv is not written here. */
const E = ROOT + '/tools/enrich.json';
const enrich = JSON.parse(fs.readFileSync(E, 'utf8'));
let touched = 0, added = 0;

for (const [id, fix] of Object.entries({ ...FIX, ...ALSO_ENRICH })) {
  if (!enrich[id]) { enrich[id] = {}; added++; }
  const e = enrich[id];
  if (fix.title) e.title = fix.title;
  if (fix.year) {
    e.year = fix.year;
    if (fix.yv) delete e.yearEst; else e.yearEst = true;
  }
  touched++;
}

// keep the file's existing shape: 2-space indent, keys in their original order
fs.writeFileSync(E, JSON.stringify(enrich, null, 2) + '\n');
console.log('updated ' + touched + ' enrich.json entries (' + added + ' newly added)');
