// Convert the reviewed markdown drafts into compact HTML data files the edge Worker injects.
//   marketing/content-drafts/composer-bios.md -> worker/composer-bios.js  (BIOS[name] = html)
//   marketing/content-drafts/song-notes.md    -> worker/song-notes.js     (NOTES[id]   = html)
import fs from 'fs';
const ROOT = '/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG';
const DRAFTS = ROOT + '/marketing/content-drafts';

function inline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => '<a href="' + url + '" target="_blank" rel="noopener">' + txt + '</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function bodyToHtml(body) {
  const blocks = body.trim().split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const out = [];
  for (const b of blocks) {
    const m = b.match(/^\*Source:\s*(.+)\*$/);
    if (m) out.push('<p class="drd-src">Source: ' + inline(m[1].replace(/^\[Wikipedia\]/, '[Wikipedia]')) + '</p>');
    else out.push('<p>' + inline(b.replace(/\n/g, ' ')) + '</p>');
  }
  return out.join('');
}

// split a draft into ## sections -> {heading, body}
function sections(md) {
  const parts = md.split(/\n## /).slice(1); // drop the file header
  return parts.map(p => {
    const nl = p.indexOf('\n');
    return { heading: p.slice(0, nl).trim(), body: p.slice(nl + 1) };
  });
}

// --- composer bios ---
const bioMd = fs.readFileSync(DRAFTS + '/composer-bios.md', 'utf8');
const BIOS = {};
for (const s of sections(bioMd)) {
  const name = s.heading.split('—')[0].trim();           // "J. S. Bach  — 374 pieces" -> "J. S. Bach"
  BIOS[name] = bodyToHtml(s.body);
}

// --- song notes ---
const noteMd = fs.readFileSync(DRAFTS + '/song-notes.md', 'utf8');
const NOTES = {};
for (const s of sections(noteMd)) {
  const id = s.heading.trim();                            // "## fur-elise"
  NOTES[id] = bodyToHtml(s.body);
}

fs.writeFileSync(ROOT + '/worker/composer-bios.js',
  '// AUTO-GENERATED from marketing/content-drafts/composer-bios.md — do not hand-edit.\n' +
  'export const BIOS = ' + JSON.stringify(BIOS) + ';\n');
fs.writeFileSync(ROOT + '/worker/song-notes.js',
  '// AUTO-GENERATED from marketing/content-drafts/song-notes.md — do not hand-edit.\n' +
  'export const NOTES = ' + JSON.stringify(NOTES) + ';\n');

console.log('BIOS:', Object.keys(BIOS).length, 'composers | NOTES:', Object.keys(NOTES).length, 'songs');
console.log('sample bio (J. S. Bach):', (BIOS['J. S. Bach'] || 'MISSING').slice(0, 180));
console.log('sample note (fur-elise):', (NOTES['fur-elise'] || 'MISSING').slice(0, 180));
