/* ============================================================================
   The one place the cache-busting version comes from.

   Page generators used to hardcode it (build-articles.mjs and build-facts.mjs
   both still said 110 while the live site was on 132), so re-running a builder
   silently reverted its pages to months-old CSS and JS. Read it off index.html
   instead: that file is bumped on every release, so a generator can never fall
   behind the site again.
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));  // repo root, so this also works from a git worktree

export function siteVersion() {
  const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
  const m = html.match(/css\/main\.css\?v=(\d+)/);
  if (!m) throw new Error('site-version: no ?v= found in index.html — has the asset markup changed?');
  return +m[1];
}
