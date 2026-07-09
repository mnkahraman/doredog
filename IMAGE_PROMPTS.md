# DoReDog — Visual Asset Prompts

The site ships with **CSS-generated gradient art** everywhere, so it looks complete with
zero image files. This document contains ready-to-use AI-image prompts to replace those
placeholders with premium, cinematic artwork when you want to level it up.

**House style (paste at the end of every prompt):**
> cinematic, ultra-detailed, dramatic volumetric lighting, deep near-black background (#06060b),
> subtle film grain, rich color grading, octave accent colors magenta #ff54b2 / green #35e08c /
> red #ff5f64 / gold #f6b73f / blue #4fa3ff, elegant, premium, 8k, no text, no watermark.

**Recommended tool settings:** aspect ratios noted per asset. Use a high-quality model
(Midjourney v6+, Flux, DALL·E 3, SDXL). Export as WebP where possible for speed.

---

## 0. ⭐ MASCOT — “Doré” the DoReDog pup (highest priority)

**Character brief (keep consistent across every mascot image):**
> Doré is a friendly, round-faced puppy with soft golden-cream fur and floppy caramel ears,
> wearing sleek modern over-ear headphones. The headphone band is a gold→magenta→violet gradient;
> one ear-cup glows violet (#8b6bff), the other cyan (#4dd0ff). Big warm dark eyes with a bright
> catch-light, a small dark rounded nose, gentle happy smile. A tiny glowing gold music note (♪)
> often floats near one ear. Mascot/logo illustration style: clean vector-ish, smooth gradients,
> soft rim lighting, subtle depth — think a premium modern app mascot. Transparent background.

The site currently uses an inline-SVG placeholder of Doré (in `js/site.js`). Generate the real art
and drop the files in `assets/mascot/`, then I’ll wire them in (hero, About, empty states, 404).

| File | Prompt (append the character brief + house style) | Size / bg |
|------|---------------------------------------------------|-----------|
| `mascot/dore-hero.webp` | Doré sitting upright, three-quarter view, one paw raised mid-“ta-da”, headphones on, a glowing gold note by his ear, gentle floating pose. | 1200×1200, transparent |
| `mascot/dore-play.webp` | Doré at a grand piano seen from a cinematic low angle, paws on the keys, keys glowing in octave colours, eyes closed, blissful — “playing by ear”. | 1600×1200, transparent |
| `mascot/dore-404.webp` | Doré tilting his head, confused/curious, one ear up, a small floating “?” note, headphones slightly askew — for the 404 page. | 1000×1000, transparent |
| `mascot/dore-wave.webp` | Doré waving hello with one paw, warm smile — for the About “Meet Doré” card. | 1000×1000, transparent |
| `mascot/dore-stickers.webp` | Sticker sheet: 6 Doré expressions (happy, wink, headphones-down listening, singing with note, sleepy, excited), evenly spaced grid, each with a thin white sticker outline. | 2000×1400, transparent |
| `mascot/dore-favicon.webp` | Ultra-simplified Doré face (just head + headphones + eyes + nose), bold and readable at 32px, centered. | 512×512, transparent |

**Where each plugs in** (I’ll do the wiring once files exist):
- Hero floating pup → replace `.scene-mascot` inline SVG with `dore-hero.webp`
- About “Meet Doré” card → `dore-wave.webp`
- 404 page → `dore-404.webp`
- Library / no-results empty state → `dore-404.webp` (or a sleepy one)
- Favicon / OG → `dore-favicon.webp`

---

## 1. Hero background (`assets/hero.webp`) — 2400×1400, 16:9
> A grand piano dissolving into flowing ribbons of colored light in a dark cinematic void,
> each ribbon a different octave color, glowing musical dust particles drifting upward,
> shot from a low dramatic angle with shallow depth of field, moody and elegant. + house style.

Place behind the hero: `.hero{ background-image:url(assets/hero.webp); background-size:cover; }`
(keep the existing dark overlays so text stays readable).

## 2. Logo / brand mark (already inline SVG — optional raster) — 512×512, 1:1
> A minimalist glowing equalizer of four vertical bars in magenta, green, gold and blue rising
> from a dark rounded-square tile, a single small gold dot like a note head top-right, flat
> premium app-icon style, soft inner glow. + house style.

## 3. Open Graph / social share image (`assets/og.webp`) — 1200×630
> The word-free DoReDog brand mark centered over a cinematic dark stage with colored light beams
> and floating piano keys, wide banner composition, lots of negative space for a headline. + house style.

## 4. Favicon — already embedded as inline SVG data-URI in every page `<head>`. No file needed.

---

## 5. Song cover art (2000×1250, 16:10) — one per piece

**AUTO-DETECTED:** just save a file named exactly `assets/covers/<song-id>.webp` and it
replaces that song’s gradient automatically (the converter picks it up on `--write`; cards +
song page use it). No code edits needed.

> ⚠️ The first cover batch used the *old* catalog ids — only `fur-elise` and `ode-to-joy`
> matched the current library, so only those two show real art. Regenerate the rest using the
> **current ids** below (filename must match the id exactly).

**Current song ids (38):**
`twinkle-twinkle` · `air-on-the-g-string` · `rondo-alla-turca` · `andante-grazioso` ·
`ave-maria` · `bouree-e-minor` · `canon-in-d` · `caprice-24` · `clair-de-lune` ·
`consolation-no-3` · `eine-kleine-nachtmusik` · `fantaisie-impromptu` · `fur-elise` ·
`gnossienne-no-1` · `goldberg-aria` · `haydn-sonata-d-major` · `hallelujah` ·
`hall-of-the-mountain-king` · `la-traviata-brindisi` · `brahms-lullaby` · `marche-militaire` ·
`minuet-in-g` · `moments-musicaux` · `moonlight-sonata` · `ode-to-joy` · `sonata-11-k331` ·
`sonata-8-k310` · `rachmaninoff-prelude` · `silent-night` · `sonata-16-facile` · `swan-lake` ·
`symphony-5` · `symphony-7` · `blue-danube` · `the-entertainer` · `toccata-and-fugue` ·
`minute-waltz` · `wedding-march`

**Cover prompt template** (per piece, append house style):
> An evocative abstract cover for “<TITLE>” by <COMPOSER>: a dark cinematic scene that captures
> the mood of the piece (e.g. moonlit for Clair de Lune, festive for Blue Danube, stormy for
> Toccata), a suggestion of a grand piano and colored light, elegant, premium album-cover feel,
> 16:10, no text.

Save each to `assets/covers/<id>.webp`, then run `node tools/convert.js --write`.

## 6. Section texture / grain (optional) — 512×512 tileable
> Seamless subtle dark noise texture, very low contrast, tileable, for a filmic overlay. (The
> site already generates this via inline SVG `feTurbulence`; only replace if you want a custom grain.)

---

## 7. Ad-unit placeholders
Ad slots are marked in the HTML with `data-ad="..."` and styled via `.ad-slot`. No imagery
needed — paste your real AdSense unit code inside each `.ad-slot` container (see `README.md`).

---

### Where each asset plugs in
- Hero bg → `css/main.css` `.hero`
- OG image → add `<meta property="og:image" content="assets/og.webp">` to each page `<head>`
- Song covers → `js/data.js` (`cover.image`) + minor tweak in `js/site.js` / `js/pages.js`
- Everything else already works with the built-in gradient system.
