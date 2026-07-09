# DoReDog — Cinematic Letter-Notes Library

A free, ad-supported showcase that turns **piano letter notes** into something you can
actually *hear*. Read the letters, press play, and a live in-browser piano performs the
melody while the keyboard lights up in octave colours.

Pure **HTML / CSS / JavaScript** — no build step, no framework, no dependencies. Host it
anywhere (Netlify, Vercel, GitHub Pages, Cloudflare Pages, or any static host).

---

## Run it locally

Because the JS loads via relative paths, just open with any static server:

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000

# or Node
npx serve .
```

Opening `index.html` directly with `file://` also works for everything except a couple of
browsers that restrict audio autoplay policies — a local server is recommended.

> **Audio note:** browsers require a user gesture before sound. The first click on any
> **Play** button unlocks the Web Audio engine — this is expected.

---

## Project structure

```
4_DOREDOG/
├── index.html          Cinematic landing + live demo player
├── library.html        Browse / search / filter all pieces
├── song.html           Single-piece player  (song.html?id=<id>)
├── guide.html          "How to read" + interactive sandbox player
├── about.html          About the project
├── privacy.html        Privacy Policy (ads/cookies) — mnkahraman@gmail.com
├── terms.html          Terms of Use + copyright/takedown
├── contact.html        Contact form (mailto) + copyright contact
├── css/
│   ├── main.css        Design system (tokens, layout, cinematic bg, components)
│   └── player.css      Notation player + interactive piano keyboard
├── js/
│   ├── data.js         Song catalog — METADATA ONLY (generated; do not hand-edit)
│   ├── player.js       Audio engine + notation parser + player component
│   ├── site.js         Shared header/footer, spotlight, reveals, song cards
│   └── pages.js        Per-page controllers (home / library / song / guide)
├── songs/              One <id>.js per piece — the letter notation, loaded on demand
├── notes_csv/          Source MIDI-event CSVs (public-domain transcriptions)
├── tools/convert.js    CSV → letter-notation generator (writes data.js + songs/ + sitemap)
├── IMAGE_PROMPTS.md    AI prompts for premium hero/cover artwork
├── sitemap.xml         SEO (generated)
└── robots.txt          SEO
```

> **Performance note:** `data.js` holds only lightweight metadata, so the library and
> home pages stay fast. Each song's (potentially large) notation lives in its own
> `songs/<id>.js` and is fetched only when a player is mounted for that piece.

---

## Add new pieces

The catalog is **generated** from MIDI-event CSVs, so `js/data.js` and `songs/*.js`
should not be hand-edited (they get overwritten on the next build).

### From CSV (the normal path)
1. Drop a new `NNN-title-by-composer.csv` (LilyPond/MIDI export) into `notes_csv/`.
2. Add a metadata row for it in the `META` table in `tools/convert.js`
   (`id`, `title`, `composer`, `diff`, `genre`).
3. Regenerate:
   ```bash
   node tools/convert.js --write
   ```
   This rewrites `js/data.js`, all `songs/<id>.js`, and `sitemap.xml`. Byte-identical
   duplicate CSVs are detected and skipped automatically. Track 1 → right hand (RH),
   track 2 → left hand (LH); tempo and time-signature are read from the CSV.

### A one-off hand-written piece
Add a metadata object to `DRD.SONGS` in `data.js` **and** create `songs/<id>.js`:
```js
// songs/my-song.js
window.DRD=window.DRD||{};DRD.NOTATIONS=DRD.NOTATIONS||{};
DRD.NOTATIONS['my-song']=`RH 4|c-d-e-f-g-a-b-|\n1\nLH 2|c-------------|\n2`;
```
(If you do this, keep it outside the CSV pipeline or it will be overwritten on rebuild.)

### Notation format
- `[RH|LH] N|....|` — optional hand tag, then `N` (the octave); the bars wrap the note string.
- **lowercase** `c d e f g a b` = white keys (natural).
- **UPPERCASE** `C D F G A` = sharps / black keys (C♯ D♯ F♯ G♯ A♯).
- `-` = timing / rest (~5–6 dashes ≈ 1 second at 1× speed).
- Lines stacked in the same block play **together**; a bare number line separates blocks.
- **`RH` / `LH`** tag a line as right / left hand — shown as gold/blue badges and grouped
  in the display. Same-octave chords are split across extra stacked lines (voices).

> ⚖️ **Only publish content you have the right to.** Ship original arrangements, licensed
> material, or **public-domain** melodies (expired-copyright classical, traditional tunes).
> The included catalog is user-supplied, public-domain, or original DoReDog compositions.

---

## Turn on ads (revenue)

Ad slots are pre-placed and marked with `data-ad="..."`, styled by `.ad-slot`.

1. Get your **Google AdSense** publisher ID.
2. Add the AdSense loader script to each page `<head>`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossorigin="anonymous"></script>
   ```
3. Replace the contents of each `<div class="ad-slot" data-ad="...">…</div>` with your ad
   unit `<ins class="adsbygoogle">…</ins>` snippet.
4. Update **doredog.com** in `sitemap.xml`, `robots.txt`, and the `<meta property="og:...">`
   tags with your live domain.

The Privacy Policy already discloses advertising/cookies (a prerequisite for AdSense approval).

---

## Deploy

Drag the folder into Netlify/Vercel, or:

```bash
# GitHub Pages
git init && git add . && git commit -m "DoReDog"
git branch -M main && git remote add origin <your-repo>
git push -u origin main
# then enable Pages on the main branch in repo settings
```

Point `doredog.com` at the host and you’re live.

---

## Credits & licence
Design, code, the letter-notes engine, and original arrangements © DoReDog.
Public-domain melodies belong to everyone. Contact: **mnkahraman@gmail.com**.
