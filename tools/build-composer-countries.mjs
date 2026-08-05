/* ============================================================================
   Composer nationality, in two layers.

   Wikidata's P27 gives the state a person held citizenship of, which for this
   repertoire means a great many polities that no longer exist: the Kingdom of
   Prussia, the Republic of Venice, Austria–Hungary, the United Kingdom of Great
   Britain and Ireland. Those labels are the fact and are kept verbatim.

   Browsing needs something coarser, so each is also mapped to a GROUP. The map
   below is the whole of that editorial judgement — it is deliberately short and
   deliberately visible. Where a polity spans several modern nations and the
   composer could belong to any of them, it keeps its own name rather than being
   guessed into one: "Holy Roman Empire" stays "Holy Roman Empire".

   Run:  node tools/build-composer-countries.mjs <countries.json>
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));  // repo root, so this also works from a git worktree
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const GROUP = {
  // France
  'France': 'France', 'Kingdom of France': 'France', 'French Third Republic': 'France',
  'French First Republic': 'France', 'First French Empire': 'France', 'Free France': 'France',
  // German lands
  'Germany': 'German lands', 'German Empire': 'German lands', 'Kingdom of Prussia': 'German lands',
  'Kingdom of Saxony': 'German lands', 'Kingdom of Bavaria': 'German lands', 'Weimar Republic': 'German lands',
  'Kingdom of Württemberg': 'German lands', 'Grand Duchy of Baden': 'German lands',
  'German Confederation': 'German lands', 'North German Confederation': 'German lands',
  'Nazi Germany': 'German lands', 'West Germany': 'German lands', 'East Germany': 'German lands',
  'Electorate of Saxony': 'German lands', 'Duchy of Saxe-Weimar': 'German lands',
  // Italian states
  'Italy': 'Italian states', 'Kingdom of Italy': 'Italian states', 'Republic of Venice': 'Italian states',
  'Kingdom of Naples': 'Italian states', 'Kingdom of the Two Sicilies': 'Italian states',
  'Papal States': 'Italian states', 'Grand Duchy of Tuscany': 'Italian states',
  'Duchy of Milan': 'Italian states', 'Kingdom of Sardinia': 'Italian states',
  'Duchy of Modena and Reggio': 'Italian states', 'Duchy of Parma': 'Italian states',
  // British Isles
  'United Kingdom': 'British Isles', 'United Kingdom of Great Britain and Ireland': 'British Isles',
  'Kingdom of Great Britain': 'British Isles', 'Kingdom of England': 'British Isles',
  'Kingdom of Scotland': 'British Isles', 'Ireland': 'British Isles', 'Irish Free State': 'British Isles',
  // Habsburg / Austria
  'Austria': 'Austria', 'Austrian Empire': 'Austria', 'Archduchy of Austria': 'Austria',
  'Austria–Hungary': 'Austria', 'Austria-Hungary': 'Austria', 'First Austrian Republic': 'Austria',
  'Cisleithania': 'Austria',
  // Russia
  'Russia': 'Russia', 'Russian Empire': 'Russia', 'Soviet Union': 'Russia', 'Russian Republic': 'Russia',
  // the rest, mostly one-to-one
  'United States of America': 'United States', 'United States': 'United States',
  'Spain': 'Spain', 'Kingdom of Spain': 'Spain',
  'Poland': 'Poland', 'Second Polish Republic': 'Poland', 'Duchy of Warsaw': 'Poland',
  'Congress Poland': 'Poland', 'Polish–Lithuanian Commonwealth': 'Poland',
  'Hungary': 'Hungary', 'Kingdom of Hungary': 'Hungary',
  'Czech Republic': 'Czech lands', 'Czechoslovakia': 'Czech lands', 'Bohemia': 'Czech lands',
  'Kingdom of Bohemia': 'Czech lands',
  'Sweden': 'Sweden', 'Norway': 'Norway', 'Denmark': 'Denmark', 'Finland': 'Finland',
  'Netherlands': 'Netherlands', 'Dutch Republic': 'Netherlands',
  'Belgium': 'Belgium', 'Switzerland': 'Switzerland', 'Portugal': 'Portugal',
  'Brazil': 'Brazil', 'Mexico': 'Mexico', 'Argentina': 'Argentina', 'Cuba': 'Cuba',
  'Japan': 'Japan', 'Canada': 'Canada', 'Australia': 'Australia',
  'Ottoman Empire': 'Ottoman Empire', 'Turkey': 'Turkey',
  'Greece': 'Greece', 'Romania': 'Romania', 'Croatia': 'Croatia', 'Ukraine': 'Ukraine',
  'Serbia': 'Serbia', 'Estonia': 'Estonia', 'Latvia': 'Latvia', 'Lithuania': 'Lithuania',
  'Holy Roman Empire': 'Holy Roman Empire',          // spans too many modern nations to assign
  // small German polities that later became Germany
  'Hamburg': 'German lands', 'Saxe-Eisenach': 'German lands', 'Electorate of Cologne': 'German lands',
  'Brandenburg-Prussia': 'German lands', 'Grand Duchy of Hesse': 'German lands',
  'Grand Duchy of Mecklenburg-Strelitz': 'German lands', 'Duchy of Württemberg': 'German lands',
  'Kingdom of Hanover': 'German lands', 'German Reich': 'German lands',
  'Brunswick-Lüneburg': 'German lands', 'Duchy of Brunswick': 'German lands',
  // Danish, Dutch, Italian and Habsburg variants
  'Kingdom of Denmark': 'Denmark', 'Duchy of Holstein': 'Denmark',
  'Kingdom of the Netherlands': 'Netherlands', 'United Kingdom of the Netherlands': 'Netherlands',
  'Habsburg Netherlands': 'Netherlands', 'Austrian Netherlands': 'Belgium', 'County of Flanders': 'Belgium',
  'Republic of Genoa': 'Italian states', 'Duchy of Ferrara': 'Italian states', 'Duchy of Florence': 'Italian states',
  'Prince-Archbishopric of Salzburg': 'Austria', 'Further Austria': 'Austria', 'Habsburg monarchy': 'Austria',
  'Prince-Bishopric of Basel': 'Switzerland',
  'Kingdom of Ireland': 'British Isles',
  'Venezuela': 'Venezuela', 'Chile': 'Chile'
};

const out = {};
const ungrouped = {};
for (const [name, list] of Object.entries(src)) {
  const groups = [];
  for (const c of list) {
    const g = GROUP[c];
    if (g) { if (groups.indexOf(g) < 0) groups.push(g); }
    else ungrouped[c] = (ungrouped[c] || 0) + 1;
  }
  out[name] = { of: list, g: groups };
}

fs.writeFileSync(ROOT + '/tools/composer-countries.json', JSON.stringify(out, null, 1));

const tally = {};
Object.values(out).forEach((v) => { if (v.g[0]) tally[v.g[0]] = (tally[v.g[0]] || 0) + 1; });
const grouped = Object.values(out).filter((v) => v.g.length).length;
console.log('composers: ' + Object.keys(out).length + ' | grouped: ' + grouped);
console.log('groups: ' + Object.entries(tally).sort((a, b) => b[1] - a[1]).map((x) => x[0] + ' ' + x[1]).join(' · '));
const un = Object.entries(ungrouped).sort((a, b) => b[1] - a[1]);
if (un.length) console.log('\nnot in the map (left ungrouped, shown verbatim): ' + un.map((x) => x[0] + ' ×' + x[1]).join(', '));
