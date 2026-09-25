/**
 * Проверяет, что каждая картинка, на которую ссылается контент,
 * реально лежит в public/. Ловит битые пути до того, как они уедут в прод.
 */
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (/\.(md|astro)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [...await walk(join(root, 'src/content')), ...await walk(join(root, 'src/pages'))];
const refs = new Map();

for (const f of files) {
  const text = await readFile(f, 'utf8');
  for (const m of text.matchAll(/["'(](\/(?:cms|images|videos|documents|fonts)\/[^"')\s]+)/g)) {
    if (!refs.has(m[1])) refs.set(m[1], []);
    refs.get(m[1]).push(f.replace(root + '/', ''));
  }
}

const missing = [];
for (const [ref, where] of refs) {
  try { await access(join(root, 'public', ref)); }
  catch { missing.push([ref, where[0]]); }
}

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

if (!missing.length) {
  console.log(green(`\nВсе ${refs.size} ассетов на месте.\n`));
  process.exit(0);
}

const byDir = missing.reduce((a, [r]) => {
  const d = r.split('/')[1]; a[d] = (a[d] || 0) + 1; return a;
}, {});
console.error(red(`\nНЕ ХВАТАЕТ ${missing.length} ассетов из ${refs.size}:`));
console.error('  по папкам:', byDir);
if (byDir.cms) {
  console.error(red('\n  Папка /cms/ пустая? Запусти download-cms-assets.sh на маке'));
  console.error('  и положи содержимое папки cms/ в public/cms/');
}
for (const [r, w] of missing.slice(0, 12)) console.error(`   ${r}   <- ${w}`);
if (missing.length > 12) console.error(`   ... и ещё ${missing.length - 12}`);
console.error('');
process.exit(1);
