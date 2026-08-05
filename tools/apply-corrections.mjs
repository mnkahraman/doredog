// One-off: apply verified data corrections to js/data.js.
//  - set the verified composition year + mark yv:1 (year is display/publish-verified) on ~30 pieces
//  - fix minuet-in-g composer  J. S. Bach -> Christian Petzold
// Non-verified pieces keep their (approximate) year for internal sort/era/timeline, but it is
// NOT shown/published (front-end gates on yv; seo-data omits year unless yv).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));  // repo root, so this also works from a git worktree
const P = ROOT + '/js/data.js';
let t = fs.readFileSync(P, 'utf8');

// verified single composition year (sourced from Wikipedia this session)
const VY = {
  'fur-elise':1810,'moonlight-sonata':1801,'rondo-alla-turca':1783,'gymnopedie-no-1':1888,
  'the-entertainer':1902,'nocturne-op-9-no-2':1832,'ave-maria':1825,'blue-danube':1866,
  'hall-of-the-mountain-king':1875,'maple-leaf-rag':1899,'fantaisie-impromptu':1834,
  'carmen-habanera':1875,'eine-kleine-nachtmusik':1787,'swan-lake':1876,'wedding-march':1842,
  'sugar-plum-fairy':1892,'humoresque-7':1894,'liebestraum-3':1850,'raindrop-prelude':1838,
  'flight-of-the-bumblebee':1900,'goldberg-aria':1741,'prelude-in-c':1722,'morning-mood':1875,
  'revolutionary-etude':1831,'pavane-faure':1887,'nocturne-op-27-no-2':1836,'waltz-of-the-flowers':1892,
  'ode-to-joy':1824,'minuet-in-g':1720,'gnossienne-no-1':1890
};
const esc = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
let ok = 0, miss = [];
for (const [id, yr] of Object.entries(VY)) {
  // within this piece's object, replace `year: NNNN,` with `year: <verified>, yv: 1,` (only if not already)
  const re = new RegExp('(id:\\s*"' + esc(id) + '"[\\s\\S]*?)year:\\s*\\d+,(\\s*\\n\\s*)(?:circa:\\s*true,\\s*\\n\\s*)?');
  if (!re.test(t)) { miss.push(id); continue; }
  t = t.replace(re, (m, pre, gap) => pre + 'year: ' + yr + ', yv: 1,' + gap);
  ok++;
}
// minuet-in-g composer fix (scoped to its block; composer appears before year)
const cre = new RegExp('(id:\\s*"minuet-in-g"[\\s\\S]*?)composer:\\s*"[^"]*"');
const hadComposer = cre.test(t);
if (hadComposer) t = t.replace(cre, '$1composer: "Christian Petzold"');

fs.writeFileSync(P, t);
console.log('year+yv updated:', ok, '/', Object.keys(VY).length);
if (miss.length) console.log('MISSED (check ids):', miss.join(', '));
console.log('minuet composer fixed:', hadComposer);
