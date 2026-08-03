/* ============================================================================
   Instrument encyclopedia — injected into instruments.html.

   Every statement is taken from the linked Wikipedia article; nothing is written
   from memory. Re-run after editing ENTRIES to refresh the section in place.

   Run:  node tools/build-instrument-encyclopedia.mjs
   ========================================================================== */
import fs from 'fs';
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
const W = (a) => 'https://en.wikipedia.org/wiki/' + a;

const ENTRIES = [
  { voice: 'kalimba', name: 'Kalimba / Mbira', origin: 'Zimbabwe · Shona people',
    what: 'A wooden board — often fitted with a resonator — with staggered metal tines that the player plucks with the thumbs and fingers. It is a lamellophone: a plucked idiophone.',
    history: 'Metal-tined lamellophones appeared in the Zambezi River valley around 1,300 years ago. The mbira is traditional to the Shona people of Zimbabwe; the westernised “kalimba” was developed from it in the mid-1950s by the ethnomusicologist Hugh Tracey.',
    fact: 'In 2020 the art of crafting and playing the mbira was added to UNESCO’s Representative List of the Intangible Cultural Heritage of Humanity.',
    src: W('Mbira'), srcName: 'Mbira' },

  { voice: 'marimba', name: 'Marimba', origin: 'Central America · Africa',
    what: 'Wooden bars struck with mallets and laid out chromatically like piano keys. Below each bar sits a resonator pipe that amplifies particular harmonics of its sound.',
    history: 'The name comes from Bantu languages and means roughly “many xylophones”; the first documented use in English dates to 1704. The modern double-keyboard marimba was created in 1892 in Chiapas, Mexico, by Corazón de Jesús Borras Moreno, who extended it to the full chromatic scale.',
    fact: 'Guatemala proclaimed the marimba its national instrument in 1821, on independence.',
    src: W('Marimba'), srcName: 'Marimba' },

  { voice: 'glockenspiel', name: 'Glockenspiel', origin: 'Germany',
    what: 'Pitched aluminium or steel bars in a keyboard layout, struck with hard mallets of metal or plastic. It typically covers two and a half to three octaves.',
    history: 'The German name joins Glocken (bells) and Spiel (play). Early instruments really did use small tuned bronze bells struck with a drumstick; metal plates replaced them later.',
    fact: 'It is a transposing instrument — it sounds two octaves above the written pitch, which is why it cuts through a whole orchestra.',
    src: W('Glockenspiel'), srcName: 'Glockenspiel' },

  { voice: 'vibraphone', name: 'Vibraphone', origin: 'United States',
    what: 'Tuned metal bars struck with mallets, played with two or four in the hands. A motor spins small discs inside the resonators to create its tremolo, and a foot pedal controls damping — raised, the notes are muted; lowered, they ring for seconds.',
    history: 'Herman Winterhoff of the Leedy Manufacturing Company began experimenting with motor-driven discs around 1916; the design was perfected in 1921 and marketed from 1924. J. C. Deagan’s 1927 changes — aluminium bars and a foot damper — became the template for every modern vibraphone.',
    fact: 'Lionel Hampton popularised it in jazz, taking it from a vaudeville novelty to a solo voice in the 1930s.',
    src: W('Vibraphone'), srcName: 'Vibraphone' },

  { voice: 'celesta', name: 'Celesta', origin: 'Paris, France',
    what: 'It looks like a small upright piano, but its hammers strike metal plates suspended over wooden resonators — so it is a keyboard-operated struck idiophone rather than a string instrument.',
    history: 'Invented in 1886 by the Parisian harmonium builder Auguste Mustel, developing his father Charles Victor Mustel’s 1860 typophone.',
    fact: 'Its most famous outing is Tchaikovsky’s “Dance of the Sugar Plum Fairy” (1892) — written after the balletmaster asked for music like “drops of water shooting out of fountains”. It is softer and more subtle than a glockenspiel, and sounds an octave above the written pitch.',
    src: W('Celesta'), srcName: 'Celesta', link: 'song?id=sugar-plum-fairy', linkText: 'Play the Sugar Plum Fairy' },

  { voice: 'tubularbells', name: 'Tubular bells', origin: 'Orchestral percussion',
    what: 'Pitched metal tubes, generally brass and often chrome-plated, struck on their top edges with a rawhide or plastic hammer. The written range is usually C4 to F5.',
    history: 'They were made to reproduce the sound of church bells, carillons and bell towers inside an ensemble, where real bells would be impossible.',
    fact: 'Drawing a violin bow along the bottom of a tube produces very loud, high-pitched overtones. Mike Oldfield’s 1973 album Tubular Bells supplied the theme for the film The Exorcist.',
    src: W('Tubular_bells'), srcName: 'Tubular bells' },

  { voice: 'harp', name: 'Harp', origin: 'Ancient Mesopotamia',
    what: 'Strings run at an angle to the soundboard and are plucked with the fingers. On a modern concert harp, seven foot pedals each alter every string of one pitch-class, which is what makes the instrument fully chromatic.',
    history: 'Harps go back at least to 3000 BCE. The earliest known harps and lyres were excavated from the royal tombs and burial pits of Ur, in Sumer, around 2500 BCE.',
    fact: 'Ireland has used a harp as its state symbol since 1922 — modelled on the Trinity College Harp, it appears on Irish passports and government seals.',
    src: W('Harp'), srcName: 'Harp' },

  { voice: 'guitar', name: 'Classical (nylon-string) guitar', origin: 'Spain',
    what: 'Six strings of nylon, or nylon wound with metal, plucked with the fingers of the right hand rather than a pick — the thumb striking downward while the fingers pluck up. Lower string tension means it needs no truss rod, unlike a steel-string guitar.',
    history: 'The modern instrument was established by the late designs of the 19th-century Spanish luthier Antonio Torres Jurado, evolving from the vihuela and the Renaissance and Baroque guitars.',
    fact: 'Nylon strings are brighter and louder than the gut strings they replaced — though some players still choose gut for Baroque music.',
    src: W('Classical_guitar'), srcName: 'Classical guitar' },

  { voice: 'steeldrum', name: 'Steelpan', origin: 'Trinidad and Tobago',
    what: 'A chromatically pitched percussion instrument hammered out of 200-litre industrial drums and played with a pair of rubber-tipped sticks — sometimes four, two in each hand.',
    history: 'It grew in Trinidad and Tobago through the 1930s and 40s out of tamboo bamboo and West African drumming traditions; the 55-gallon oil drum became the standard around 1947. Earlier versions were beaten from frying pans and dustbin lids.',
    fact: 'Declared the national instrument of Trinidad and Tobago in 1992. In 2023 the UN General Assembly made 11 August World Steelpan Day.',
    src: W('Steelpan'), srcName: 'Steelpan' },

  { voice: 'toypiano', name: 'Toy piano', origin: 'United States',
    what: 'A small piano-like instrument that sounds round metal rods rather than strings, which is why it rings bright and short. The range is usually one to three octaves.',
    history: 'Albert Schoenhut introduced metal sounding bars in the mid-19th century and founded the Schoenhut Piano Company in 1872 to make them.',
    fact: 'It is taken seriously as a concert instrument: John Cage wrote his Suite for Toy Piano in 1948, and in 2001 the U.S. Library of Congress gave toy piano scores their own classification.',
    src: W('Toy_piano'), srcName: 'Toy piano' },

  { voice: 'flute', name: 'Concert flute', origin: 'Modern form: Germany',
    what: 'A transverse woodwind sounded by blowing air across an embouchure hole; pitch changes as keys open and close circular tone holes. The standard C flute runs from C4 to about C7.',
    history: 'Theobald Boehm devised the modern key system and patented it in 1847 — his design still governs the dimensions and mechanism of today’s flutes.',
    fact: 'The instrument changed metal within a generation: in 1905 one Boston maker built a single silver flute for every hundred wooden ones; by the 1930s the ratio had flipped.',
    src: W('Western_concert_flute'), srcName: 'Western concert flute' },

  { voice: 'harpsichord', name: 'Harpsichord', origin: 'Europe, late 14th century',
    what: 'A keyboard instrument that plucks its strings instead of striking them. Because a plucked string sounds the same however hard the key goes down, a note is equally loud no matter your touch — the opposite of a piano.',
    history: 'Most likely invented in the late 14th century, roughly three centuries before the piano, and central to Renaissance and Baroque music until the piano largely supplanted it in the late 18th century.',
    fact: 'Players change colour and volume by registration, not touch: a second manual lets you keep, say, an 8′ and a 4′ set of strings ready and switch between them.',
    src: W('Harpsichord'), srcName: 'Harpsichord' },

  { voice: 'musicbox', name: 'Music box', origin: 'Switzerland / Europe',
    what: 'Pins set into a revolving cylinder or disc pluck the tuned teeth of a steel comb; some boxes add tiny drums and bells.',
    history: 'The modern music box grew out of 18th-century musical snuff boxes, originally called carillons à musique. In 1885 the Symphonion company became the first to make disc-playing boxes, replacing fixed cylinders with interchangeable discs.',
    fact: 'Karlheinz Stockhausen wrote Tierkreis (1974–75), twelve pieces for twelve music boxes, one for each sign of the zodiac.',
    src: W('Music_box'), srcName: 'Music box' },

  { voice: 'organ', name: 'Pipe organ', origin: 'Ancient Greece',
    what: 'Pressurised air — “wind” — is driven through pipes chosen from a keyboard. Stops let the organist decide which ranks of pipes speak, and each stop usually controls one rank.',
    history: 'Its ancestor is the hydraulis of 3rd-century-BC Greece. Until about 1450 an organ had no stop controls at all; the innovation that let ranks be played individually transformed the instrument.',
    fact: 'The largest instruments carry over 33,000 pipes — the Salt Lake Tabernacle organ alone has 11,623.',
    src: W('Pipe_organ'), srcName: 'Pipe organ' }
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

const blocks = ENTRIES.map((e) => `
        <article class="inst-enc" id="about-${e.voice}">
          <div class="inst-enc-head">
            <h3>${esc(e.name)}</h3>
            <span class="inst-enc-origin">${esc(e.origin)}</span>
            <button class="btn btn-ghost inst-enc-try" data-voice="${e.voice}">Play it ↑</button>
          </div>
          <p><strong>What it is.</strong> ${esc(e.what)}</p>
          <p><strong>Where it comes from.</strong> ${esc(e.history)}</p>
          <p><strong>Worth knowing.</strong> ${esc(e.fact)}</p>
          <p class="inst-enc-foot">${e.link ? `<a href="${attr(e.link)}">${esc(e.linkText)} →</a>` : ''}
            <a class="inst-enc-src" href="${attr(e.src)}" target="_blank" rel="noopener">Source: Wikipedia — ${esc(e.srcName)}</a></p>
        </article>`).join('\n');

const SECTION = `
      <section class="inst-encyclopedia" id="encyclopedia" data-reveal>
        <span class="eyebrow">Reference</span>
        <h2 class="title" style="font-size:1.9rem;margin:.5rem 0 .4rem">The instruments, explained</h2>
        <p class="text-dim" style="max-width:62ch;margin:0 0 8px">Where each one came from, how it actually makes a sound, and the detail worth knowing. Every entry cites the reference it was checked against.</p>
${blocks}
      </section>
`;

const path = ROOT + '/instruments.html';
let html = fs.readFileSync(path, 'utf8');
html = html.replace(/\n *<section class="inst-encyclopedia"[\s\S]*?<\/section>\n/, '\n');   // replace if already present
if (!html.includes('class="inst-about"')) throw new Error('anchor not found in instruments.html');
html = html.replace(/( *)<div class="inst-about"/, SECTION + '\n$1<div class="inst-about"');
fs.writeFileSync(path, html);

/* The same entries, as data — the live info panel above the keyboard reads from this,
   so the article and the panel can never drift apart. */
const data = {};
for (const e of ENTRIES) {
  data[e.voice] = { name: e.name, origin: e.origin, what: e.what, history: e.history,
                    fact: e.fact, src: e.src, srcName: e.srcName };
  if (e.link) { data[e.voice].link = e.link; data[e.voice].linkText = e.linkText; }
}
const js = `/* Generated by tools/build-instrument-encyclopedia.mjs — do not edit by hand.
   Sourced instrument reference, shared by the info panel on /instruments. */
window.DRD = window.DRD || {};
DRD.INSTRUMENTS = ${JSON.stringify(data, null, 2)};
`;
fs.writeFileSync(ROOT + '/js/instrument-info.js', js);
console.log('injected encyclopedia — ' + ENTRIES.length + ' instruments (+ js/instrument-info.js)');
