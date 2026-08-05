/* ============================================================================
   Real screenshots of the 20 arcade games, for the /games hub cards.

   Each game is loaded from the local static server, Play is clicked, and a
   short per-game "pose" script drives it to a photogenic moment — letters
   mid-fall, a filled Notle row, invaders descending — before the .arc-card
   element is captured. Output: assets/games/<id>.png (~600×420 @1.5x).

   Needs Chrome (uses the system install via puppeteer-core) and the static
   server from .claude/launch.json on :8791.

   Run:  NODE_PATH=<dir-with-puppeteer-core> node tools/shoot-game-covers.mjs
   ========================================================================== */
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const puppeteer = require2('puppeteer-core');

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const BASE = 'http://localhost:8791';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* What each game should be doing when the shutter clicks. */
const POSES = {
  'letter-rain':       async (p) => { await sleep(5200); },
  'melody-tiles':      async (p) => { await sleep(2600); },
  'note-catch':        async (p) => { await sleep(3400); },
  'bumblebee-dash':    async (p) => {
    for (let i = 0; i < 14; i++) { await p.keyboard.press(i % 2 ? 'x' : 'z'); await sleep(70); }
  },
  'interval-invaders': async (p) => { await sleep(2600); },
  'pitch-sniper':      async (p) => { await sleep(1400); },
  'higher-lower':      async (p) => {
    for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowUp'); await sleep(400); }
  },
  'chord-crush':       async (p) => {
    await sleep(900); await p.click('.arc-pads .arc-pad'); await sleep(900);
    await p.click('.arc-pads .arc-pad'); await sleep(400);
  },
  'happy-sad':         async (p) => { await sleep(1600); },
  'odd-one-out':       async (p) => { await sleep(2000); },
  'era-detective':     async (p) => { await sleep(2600); },
  'echo-chamber':      async (p) => { await sleep(1150); },          // mid-playback, a pad lit
  'clap-back':         async (p) => { await sleep(2200); },
  'tempo-keeper':      async (p) => { await sleep(2200); },
  'melody-mixup':      async (p) => { await sleep(2400); },
  'name-that-tune':    async (p) => { await sleep(2800); },
  'notle':             async (p) => {
    await sleep(3000);
    const keys = await p.$$('.arc-keys-wrap .key');
    for (let i = 0; i < 5 && i < keys.length; i++) { await keys[i * 2 % keys.length].click(); await sleep(160); }
    await sleep(700);                                                 // marks land
  },
  'composer-clues':    async (p) => { await sleep(1600); },
  'tone-grid':         async (p) => {
    await p.evaluate(() => {                                          // click Surprise me
      [...document.querySelectorAll('button')].find((b) => b.textContent === 'Surprise me').click();
    });
    await sleep(1400);                                                // playhead sweeps lit cells
  },
  'beat-lab':          async (p) => { await sleep(1500); },           // starter groove, lit column
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--force-dark-mode'],
});

const fs = require2('fs');
fs.mkdirSync(ROOT + '/assets/games', { recursive: true });

const ids = Object.keys(POSES);
for (const id of ids) {
  const page = await browser.newPage();
  await page.setViewport({ width: 860, height: 780, deviceScaleFactor: 1.5 });
  try {
    await page.goto(BASE + '/game.html?g=' + id, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#arc-go', { timeout: 10000 });
    await sleep(400);
    await page.click('#arc-go');
    await POSES[id](page);
    const card = await page.$('.arc-card');
    await card.screenshot({ path: ROOT + '/assets/games/' + id + '.png' });
    const kb = Math.round(fs.statSync(ROOT + '/assets/games/' + id + '.png').size / 1024);
    console.log('  ✓ ' + id + ' (' + kb + ' KB)');
  } catch (e) {
    console.log('  ✗ ' + id + ': ' + e.message.split('\n')[0]);
  }
  await page.close();
}
await browser.close();
console.log('done');
