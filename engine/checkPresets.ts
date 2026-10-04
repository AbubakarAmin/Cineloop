/**
 * Catalog validator — enforces the "15-15" gold standard.
 * Run: npm run presets:check
 */
import * as fs from 'fs';
import * as path from 'path';

const PRESET_DIR = path.join(__dirname, '..', 'presets');
const TARGETS: Record<string, number> = {
  transitions: 15,
  typography: 15,
  grades: 15,
  layouts: 15,
  motion: 15,
  overlays: 15,
  vibes: 6,
};

interface DocPreset {
  id: string;
  name: string;
  notes?: string;
  bestFor?: string;
  description?: string;
}

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error('  ✗ ' + msg);
};

for (const [cat, target] of Object.entries(TARGETS)) {
  const file = path.join(PRESET_DIR, `${cat}.json`);
  console.log(`\n● ${cat} (target ${target})`);
  if (!fs.existsSync(file)) {
    fail(`missing file presets/${cat}.json`);
    continue;
  }
  const list = JSON.parse(fs.readFileSync(file, 'utf8')) as DocPreset[];
  if (!Array.isArray(list)) {
    fail('file must contain a JSON array');
    continue;
  }
  if (list.length !== target) fail(`count ${list.length} != ${target}`);
  const seen = new Set<string>();
  for (const p of list) {
    if (!p.id) fail('preset without id');
    else if (seen.has(p.id)) fail(`duplicate id "${p.id}"`);
    else seen.add(p.id);
    if (!p.name) fail(`${p.id}: missing name`);
    if (cat !== 'vibes' && !p.notes) fail(`${p.id}: missing notes (documentation duty)`);
  }
  if (failures === 0) console.log(`  ✓ ${list.length}/${target} presets, ids unique, docs present`);
}

console.log(
  failures === 0
    ? '\nCatalog OK — 15-15 gold standard upheld (96 presets incl. vibes).\n'
    : `\nCatalog FAILED with ${failures} problem(s).\n`,
);
process.exit(failures === 0 ? 0 : 1);
