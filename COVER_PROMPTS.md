# DoReDog — Song Cover Prompts

The site composites every cover in three layers (cheap + high quality, zero per-piece images for the deep
archive):

1. **Composer gradient** — signature colour per composer (already built).
2. **Mood atlas** — ONE generated image (`_mood-atlas.webp`, a 4×3 sheet of 12 abstract atmospheres),
   sliced per piece by mood and tinted to the composer colour. See **PART 1**.
3. **Melody fingerprint** — octave-coloured bars drawn from the piece's own notes (already built).

Then, for the most famous pieces, a **full hand-painted cover** (`assets/covers/<id>.webp`) **overrides all
three**. See **PART 2** (50 pieces).

So you generate: **1 atlas image** (covers all 752 pieces) **+ 50 hero covers** (the icons). Everything
else looks rich automatically.

## How it works (no code edits)
- Name each hero file **exactly** `assets/covers/<song-id>.webp`; name the atlas `assets/covers/_mood-atlas.webp`.
- Run `node tools/convert.js --write`, then bump the cache `?v=N` (HTML + `pages.js`).
- Missing files degrade gracefully (no atlas → gradient+fingerprint; no hero → mood cover).

## Specs
- **Hero covers: 16:10, 2000×1250 px.** Dark, cinematic, **no text, no watermark** (title sits below the
  cover in the UI). Keep key content off the extreme bottom (a dark scrim covers the lower ~45% on cards).
- **Mood tiles: 16:10 each**, abstract atmosphere only (no objects/pianos/text), so they read as a
  universal backdrop behind any fingerprint.

**House style — append to EVERY prompt below:**
> cinematic, ultra-detailed, dramatic volumetric lighting, deep near-black background (#06060b), subtle
> film grain, rich color grading, octave accent colours magenta #ff54b2 / green #35e08c / red #ff5f64 /
> gold #f6b73f / blue #4fa3ff, elegant, premium album-cover feel, 16:10, 8k, no text, no watermark.

Use a strong model (Midjourney v6+, Flux, DALL·E 3, SDXL). Each prompt below is the *scene/atmosphere* —
paste it, then append the house-style line.

---

# PART 1 — Mood atlas (`assets/covers/_mood-atlas.webp`)

**One 4×3 sheet, 12 abstract atmosphere tiles, row-major order below** (tile 1 = top-left → tile 12 =
bottom-right). Each tile is a soft, dark, cinematic *mood* — **no piano, no objects, no scene, no text** —
just colour, light and haze, because a different melody fingerprint is drawn on top of each.

**Two ways to make it (quality-first → assemble; fast → one-shot):**
- **Best:** generate the 12 tiles individually (each 16:10, ≥1280×800), then lay them out in a **4-wide ×
  3-tall grid in the exact order below** and export as one `_mood-atlas.webp` (≈5120×2400 or downscaled).
- **Fast:** one-shot prompt — "a 4×3 grid of 12 distinct dark abstract mood textures, evenly spaced, thin
  seams" — then the 12 scene lines below as the cells. Small bleed between cells is fine (they're backdrops).

| # | Mood (code `m0…m11`) | Tile prompt (append house style) |
|---|---|---|
| 1 | `m0` nocturne-violet | Soft moonlit violet haze, deep indigo night with a faint silver glow and drifting luminous particles, dreamy and tender. |
| 2 | `m1` baroque-gold | Warm golden cathedral light and soft amber haze, dust motes suspended in a slow shaft of gold, reverent baroque warmth. |
| 3 | `m2` storm-red | A dark dramatic storm of deep crimson and ember light, smoky and turbulent, ominous brooding power. |
| 4 | `m3` impressionist-cyan | Watery cyan and teal mist, soft rippling reflections and pale diffuse light, dreamy impressionist calm. |
| 5 | `m4` spanish-amber | A warm Andalusian night, deep amber and terracotta glow with a hint of dusk red, sultry and warm. |
| 6 | `m5` sacred-light | A serene shaft of divine golden-white light through soft incense haze, ethereal, reverent, weightless. |
| 7 | `m6` ballet-blue | Icy elegant blue with silver sparkle and cold moonlight, graceful, crystalline, delicate. |
| 8 | `m7` rose-romance | A warm rose-gold romantic bloom, soft glowing pink and gold haze with floating light motes, tender rapture. |
| 9 | `m8` salon-sparkle | Elegant candlelit gold and champagne sparkle, refined shimmering light, festive classical poise. |
| 10 | `m9` nordic-forest | Deep misty forest green and cold slate, moody northern twilight with faint emerald light through fog. |
| 11 | `m10` amber-ragtime | Warm nostalgic amber saloon light, soft sepia glow and gentle gold sparkle, jaunty vintage warmth. |
| 12 | `m11` twilight-lied | Deep blue-violet twilight, soft starlit haze and a gentle distant glow, wistful romantic night. |

The site tints each tile toward the composer's colour automatically, so tiles can stay fairly neutral
within their mood — don't over-saturate them.

---

# PART 2 — Hero covers (50 famous pieces, full 2000×1250)

## ⭐ Priority 1 — the crowd-pleasers (do these first)

| File (`assets/covers/…`) | Scene prompt |
|---|---|
| `rondo-alla-turca.webp` | A spirited Ottoman-Turkish march at night — glinting cymbals and janissary banners dissolving into a bold sweeping cadence of gold and magenta light over a dark stage, a grand piano silhouette, regal and energetic. |
| `canon-in-d.webp` | Endless interlocking arches of soft light like a canon's rounds, a serene candlelit cathedral of colored beams receding into the dark, timeless, gentle, gold and green ribbons, a calm grand-piano silhouette. |
| `gymnopedie-no-1.webp` | A sparse dreamlike dawn — a lone grand piano floating in pale drifting mist, slow luminous dust, deep melancholy and stillness, huge negative space, cool cyan-and-blue wash. |
| `nocturne-op-9-no-2.webp` | A tender moonlit nocturne — a candlelit 19th-century salon dissolving into violet night, soft bokeh and a single moonbeam on a grand piano, intimate and romantic, violet-gold glow. |
| `air-on-the-g-string.webp` | Serene baroque grandeur — warm golden light streaming through tall cathedral windows onto a grand piano, a single sustained ribbon of light like a slowly bowed string, reverent and calm, gold/green. |
| `liebestraum-3.webp` | A dream of love — warm rose-gold light blooming around a grand piano, floating luminous petals and soft haze, rapturous and tender, magenta and gold. |
| `flight-of-the-bumblebee.webp` | A blur of frantic motion — streaking light trails swarming like a bumblebee around a dark piano, chaotic kinetic swirls of yellow-gold and green sparks, dizzying speed. |
| `hall-of-the-mountain-king.webp` | A shadowy troll cavern deep underground — ominous glowing crystals and an accelerating menace of red and green light closing in, dark, tense and thrilling. |
| `morning-mood.webp` | A tranquil Nordic sunrise over misty fjords and pines, first golden rays breaking through, dewy and fresh, a distant piano silhouette on the horizon, gold/green/soft-blue. |
| `toccata-and-fugue.webp` | A towering gothic pipe organ in a candlelit cathedral, dramatic storm light and lightning-like ribbons of red and violet, ominous, baroque and grand. |
| `blue-danube.webp` | A grand Viennese ballroom opening onto a shimmering blue river at dawn, elegant swirling waltz ribbons of light, sparkling and joyous, blue and gold. |
| `wedding-march.webp` | A triumphant bright procession down a cathedral aisle bursting with golden light and a confetti of colored sparks, joyous and grand, gold and magenta. |
| `ave-maria.webp` | A sacred serene chapel with a single shaft of divine light through incense haze, soft floating dust, prayerful calm, a piano silhouette, warm gold and soft-blue halo. |
| `maple-leaf-rag.webp` | A jaunty turn-of-the-century saloon in warm amber lamplight, syncopated bouncing rings of gold and red light, upbeat, nostalgic ragtime energy. |
| `swan-lake.webp` | A moonlit lake at night — a graceful swan silhouette gliding across rippling blue reflections, ethereal ballet elegance, soft mist, blue and violet. |

## 💗 Priority 2 — romantic & virtuoso

| File (`assets/covers/…`) | Scene prompt |
|---|---|
| `fantaisie-impromptu.webp` | Turbulent silvery cascades of light rushing over a dark grand piano, restless and virtuosic with a calmer glowing core, violet and blue, dramatic motion blur. |
| `ballade-no-1.webp` | An epic dramatic narrative unfolding in sweeping arcs of light over a dark stage — from tender to stormy — cinematic and grand, violet, gold and red. |
| `revolutionary-etude.webp` | A defiant storm of cascading light crashing down over a dark grand piano, turbulent and heroic, red and gold sparks, raw power. |
| `raindrop-prelude.webp` | A rain-streaked monastery window at night, a steady rhythm of glowing droplets, melancholy calm turning to distant storm, blue and violet with silver rain. |
| `minute-waltz.webp` | A playful little dog chasing its tail rendered as a joyful spinning swirl of light, quick and whimsical, bright gold and green, elegant fun. |
| `marche-funebre.webp` | A solemn funeral procession in cold moonlight, slow heavy tolling bells as dim red and violet glows through fog, mournful, grave and heavy. |
| `traumerei.webp` | A warm nostalgic childhood reverie at dusk, soft glowing memories drifting upward, tender and wistful, amber and rose haze. |
| `schubert-serenade.webp` | A moonlit balcony serenade under a field of stars, soft warm lantern glow and floating notes, tender and yearning, gold and violet night. |
| `rachmaninoff-prelude.webp` | A passionate martial surge of light over a dark grand piano, tolling great Russian bells of gold, grand, stormy and sweeping, red and gold. |
| `hungarian-dance-5.webp` | A fiery Hungarian czárdás — whirling passionate red and gold ribbons accelerating into a blur, spirited, dramatic gypsy-dance energy. |
| `consolation-no-3.webp` | A quiet consoling nocturne — soft rippling waves of warm light over a dark grand piano, gentle and healing, tender violet and gold, deeply calm. |
| `moonlight-3.webp` | A furious moonlit tempest over a black sea, waves of red and silver light crashing upward around a grand piano, relentless and dramatic. |
| `arabesque-1.webp` | Flowing impressionist arabesques of pastel light curling like water and vines, dreamy and fluid, soft cyan, green and gold, watery shimmer. |
| `humoresque-7.webp` | A light-hearted sunny stroll, gently skipping playful dots of gold and green light, charming, warm and breezy. |

## 🎭 Priority 3 — opera, voice & ballet

| File (`assets/covers/…`) | Scene prompt |
|---|---|
| `nessun-dorma.webp` | A lone figure on a moonlit palace terrace facing the dawn, a building triumphant glow on the horizon, operatic grandeur and yearning, deep blue rising to gold. |
| `o-mio-babbino-caro.webp` | A tender Florentine terrace at golden hour overlooking the Arno, soft romantic haze, longing and sweet, warm gold and rose. |
| `carmen-habanera.webp` | A sultry Spanish night — a flamenco silhouette and a swirling red fan of light, smoky and seductive, deep red and magenta, dramatic heat. |
| `la-traviata-brindisi.webp` | A festive opulent ballroom raising glittering champagne toasts, chandeliers dissolving into colored light, celebratory, gold and magenta. |
| `hallelujah.webp` | A radiant heavenly burst of golden light breaking through clouds, choirs of light beams, uplifting, majestic and triumphant, gold and green. |
| `bridal-chorus.webp` | A solemn radiant cathedral aisle bathed in warm light, floating rose petals drifting down, reverent and hopeful, warm gold and rose glow. |
| `sugar-plum-fairy.webp` | A delicate crystalline fairy tale — twinkling icy sparkles and glass-bell points of cyan and gold light, magical and dainty, dark velvet backdrop. |
| `waltz-of-the-flowers.webp` | A swirling ballroom of luminous flowers spinning in a waltz, cascading petals of gold and green light, festive, lush and elegant motion. |
| `the-swan.webp` | A single elegant swan gliding across still moonlit water, long serene reflections, graceful and calm, cool blue and silver with a touch of gold. |
| `schubert-erlkonig.webp` | A frantic midnight ride through a dark storm-lashed forest, a ghostly pale figure looming, galloping streaks of red and violet light, terror and urgency. |

## 🎼 Priority 4 — baroque, symphonic & character

| File (`assets/covers/…`) | Scene prompt |
|---|---|
| `symphony-5.webp` | Four thunderous strokes of fate rendered as bold crashing bars of red and gold light in a dark storm, ominous, monumental and powerful. |
| `pathetique-2.webp` | A serene noble hymn of warm light rising slowly through darkness, dignified and tender, soft gold and rose, calm grandeur. |
| `eine-kleine-nachtmusik.webp` | An elegant candlelit classical soirée at night, refined swirling ribbons of light, graceful, bright and poised, gold and green Viennese charm. |
| `goldberg-aria.webp` | A tranquil ornate baroque aria — delicate golden filigree of light unfurling in a candlelit chamber, serene, intricate and warm, gold and green. |
| `prelude-in-c.webp` | Serene rising arpeggios rendered as gently ascending strands of pure crystalline light at dawn, calm, clear and luminous, soft gold and green. |
| `jesu-joy.webp` | Gentle flowing ribbons of warm light like a joyful chorale winding through a sunlit chapel, devotional and tender, gold and green. |
| `harmonious-blacksmith.webp` | A warm blacksmith's forge — rhythmic ringing hammer strikes throwing bright sparks of gold light, cheerful, bright, baroque warmth. |
| `promenade.webp` | A grand dim art gallery at night, footsteps strolling between glowing framed panels of colored light, stately, curious, gold-and-green Russian grandeur. |
| `asturias.webp` | A moonlit Andalusian courtyard — driving flamenco energy as pulsing red and gold strums of light, passionate, Spanish, warm night. |
| `brahms-lullaby.webp` | A soft dreamy nursery at night, floating stars and a gentle rocking glow, tender and soothing, pastel blue and violet, sleepy warmth. |
| `to-a-wild-rose.webp` | A single delicate wild rose in soft morning light, simple and tender, dewy pastel glow, gentle green and rose, intimate. |

---

### Notes
- Two rows above are marked *(skip / optional)* — `clair-de-lune`, `moonlight-sonata`, `fur-elise`,
  `ode-to-joy`, `the-entertainer`, `silent-night`, `twinkle-twinkle` **already have art** — don't redo them.
- Keep moods **distinct per composer colour** where possible so the wall reads well: Bach → gold/green,
  Chopin → violet, Beethoven → red, Grieg/Debussy → cyan, opera → red/magenta.
- After adding a batch: `node tools/convert.js --write`, then bump the cache `?v=`. That's it —
  no other edits; the generated fingerprint stays as the fallback for the other ~700 pieces.
