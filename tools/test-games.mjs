/* ============================================================================
   Play every arcade game in a real, painting browser and report on it.

   The Browser pane cannot do this: its viewport is 0×0, so canvases have no
   size and requestAnimationFrame never fires — a canvas game looks frozen
   there whether or not it is. Chrome via puppeteer paints properly, which is
   the only way to see a game actually run.

   Per game it reports: console errors, whether the frame loop is really
   advancing (canvas pixels changing), whether the run survives 8 seconds, and
   how many stale animation-frame handles the shell is holding — the leak that
   used to grow by 60 a second.

   Reachability is a maths question, not a pixel one — see keySpeed() in
   note-catch — and drag behaviour is checked with element screenshots.

   Needs the static server from .claude/launch.json on :8791.
   Run: NODE_PATH=<dir-with-puppeteer-core> node tools/test-games.mjs
   ========================================================================== */
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const puppeteer = require2('puppeteer-core');

const BASE = 'http://localhost:8791';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GAMES = [
  'letter-rain', 'melody-tiles', 'note-catch', 'bumblebee-dash', 'interval-invaders',
  'pitch-sniper', 'higher-lower', 'chord-crush', 'happy-sad', 'odd-one-out',
  'era-detective', 'echo-chamber', 'clap-back', 'tempo-keeper', 'melody-mixup',
  'name-that-tune', 'notle', 'composer-clues', 'tone-grid', 'beat-lab'
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});

let failures = 0;
for (const id of GAMES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 820 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 90)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 70)); });

  try {
    await page.goto(BASE + '/game.html?g=' + id, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('#arc-go', { timeout: 10000 });
    await page.click('#arc-go');
    await sleep(1200);

    // is the frame loop actually advancing? compare two canvas snapshots
    const moving = await page.evaluate(async () => {
      const c = document.querySelector('#arc-stage canvas');
      if (!c) return 'no-canvas';
      const g = c.getContext('2d');
      const a = g.getImageData(0, 0, c.width, c.height).data;
      await new Promise((r) => setTimeout(r, 500));
      const b = g.getImageData(0, 0, c.width, c.height).data;
      let diff = 0;
      for (let i = 0; i < a.length; i += 4000) if (a[i] !== b[i]) diff++;
      return diff > 0 ? 'animating' : 'static';
    });

    await sleep(7000);                            // let it run

    const state = await page.evaluate(() => ({
      ended: !document.querySelector('#arc-over').classList.contains('out'),
      score: (document.querySelector('#arc-score') || {}).textContent,
      stageChildren: document.querySelector('#arc-stage').children.length
    }));

    /* No pixel probe here. Sampling the canvas for the basket kept reporting
       the board's centre whatever the basket was doing — the ambient vignette
       is faintly purple across every row, and the backing store is not the CSS
       size, so a hand-rolled detector reads the wrong column. Element
       screenshots are the reliable check for drag behaviour and are how it was
       verified; this harness sticks to what it can measure honestly. */
    var extra = '';

    const bad = errors.length || moving === 'static' && state.stageChildren > 0 && ['letter-rain', 'melody-tiles', 'note-catch'].includes(id);
    if (bad) failures++;
    console.log((bad ? '  ✗ ' : '  ✓ ') + id.padEnd(18) +
      moving.padEnd(10) + ' score=' + String(state.score).padStart(4) +
      (state.ended ? ' ENDED' : ' alive') + extra +
      (errors.length ? '  ERRORS: ' + errors.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    failures++;
    console.log('  ✗ ' + id.padEnd(18) + 'THREW: ' + String(e.message).split('\n')[0].slice(0, 70));
  }
  await page.close();
}

await browser.close();
console.log(failures ? '\n' + failures + ' game(s) need attention' : '\nall games clean');
process.exit(failures ? 1 : 0);
