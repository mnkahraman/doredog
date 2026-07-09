/* CPDL/craigsapp CSV -> DoReDog CSV (parseStandard schema), with explicit hand control.
   For voice+piano vocal-score exports where the default mean-pitch part ranking fails
   (e.g. one wide-range piano part that must be split into two hands).

   Usage:
     node craig2csv.js <in.csv> --out <f.csv> [--melody <partName>] [--split 60]
                                 [--tempo 500000] [--ts 2/4] [--src <url>]
   --melody : this part is the tune -> always right hand.
   --split  : every other note goes RH if pitch>=split, else LH (default 60 = middle C). */
const fs = require('fs');

function run() {
  const args = process.argv.slice(2);
  const o = { split: 60, tempo: 500000, ts: '4/4', melody: '', src: '' };
  let inFile = null, outFile = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out') outFile = args[++i];
    else if (a === '--melody') o.melody = args[++i];
    else if (a === '--split') o.split = +args[++i];
    else if (a === '--tempo') o.tempo = +args[++i];
    else if (a === '--ts') o.ts = args[++i];
    else if (a === '--src') o.src = args[++i];
    else if (!a.startsWith('--')) inFile = a;
  }
  if (!inFile || !outFile) { console.error('usage: node craig2csv.js <in.csv> --out f.csv [--melody name] [--split 60] [--tempo us] [--ts N/D] [--src url]'); process.exit(1); }

  const tpq = 384;
  const text = fs.readFileSync(inFile, 'utf8');
  const lines = text.split(/\r?\n/);
  const hdr = lines.find((l) => /^source_file\s*,/.test(l));
  if (!hdr) { console.error('not a CPDL/craig CSV (no source_file header)'); process.exit(1); }
  const cols = hdr.split(',').map((s) => s.trim());
  const iPart = cols.indexOf('part'), iPit = cols.indexOf('pitch'),
        iStart = cols.indexOf('start_quarter'), iEnd = cols.indexOf('end_quarter');

  const notes = [];
  for (const l of lines) {
    if (!l.trim() || l[0] === '#' || /^source_file\s*,/.test(l)) continue;
    const p = l.split(',');
    if (p.length <= Math.max(iPart, iPit, iStart)) continue;
    const pitch = +p[iPit]; if (!Number.isFinite(pitch) || pitch <= 0) continue;
    const start = Math.round((+p[iStart]) * tpq);
    let end = iEnd >= 0 ? Math.round((+p[iEnd]) * tpq) : start + tpq;
    if (!(end > start)) end = start + tpq / 4;
    const part = p[iPart];
    const hand = (o.melody && part === o.melody) ? 1 : (pitch >= o.split ? 1 : 2);
    notes.push({ track: hand, pitch, start, end });
  }
  notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);

  let out = '# DoReDog CPDL->CSV extraction\n';
  if (o.src) out += '# source,' + o.src + '\n';
  out += '# ticks_per_quarter,' + tpq + '\n';
  out += '# meta,0,0,tempo,' + o.tempo + '\n';
  out += '# meta,0,0,time_signature,' + o.ts + '\n';
  out += 'track,channel,pitch,vel,start,end\n';
  for (const n of notes) out += n.track + ',0,' + n.pitch + ',80,' + n.start + ',' + n.end + '\n';
  fs.writeFileSync(outFile, out);
  const rh = notes.filter((n) => n.track === 1).length, lh = notes.length - rh;
  console.error('WROTE ' + outFile + '  notes=' + notes.length + ' RH=' + rh + ' LH=' + lh);
}
run();
