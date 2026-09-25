/**
 * Страховка от потери SEO.
 * Сверяет, что в dist/ лежат все URL, которые сейчас живут на unroot.design.
 * Запускать после каждого билда. На CI роняет сборку, если чего-то не хватает.
 */
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const live = JSON.parse(await readFile(join(root, 'scripts/live-urls.json'), 'utf8'));

const toFile = (u) => (u === '/' ? 'index.html' : `${u.replace(/^\//, '')}.html`);

// URL, которые осознанно переехали через 301 в public/_redirects, тоже считаются живыми
const redirects = new Set((await readFile(join(root, 'public/_redirects'), 'utf8'))
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .filter((l) => / 301$/.test(l)).map((l) => l.split(/\s+/)[0]));

const missing = [];
const empty = [];

for (const url of live) {
  if (redirects.has(url)) continue;
  const path = join(root, 'dist', toFile(url));
  try {
    const s = await stat(path);
    if (s.size < 2000) empty.push(url);
  } catch {
    missing.push(url);
  }
}

// Проверяем, что у каждой страницы есть непустые title и description
const thin = [];
for (const url of live) {
  if (redirects.has(url)) continue;
  const path = join(root, 'dist', toFile(url));
  try {
    const html = await readFile(path, 'utf8');
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1]?.trim() ?? '';
    const canon = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
    const problems = [];
    if (title.length < 10) problems.push('нет title');
    if (desc.length < 40) problems.push('нет description');
    if (/ЗАГЛУШКА|TODO|Lorem/i.test(title + desc)) problems.push('осталась заглушка');
    if (!canon.endsWith(url === '/' ? 'unroot.design' : url)) problems.push(`canonical: ${canon}`);
    if (problems.length) thin.push(`${url}  ->  ${problems.join(', ')}`);
  } catch { /* уже в missing */ }
}

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

if (missing.length) {
  console.error(red(`\nОТСУТСТВУЮТ ${missing.length} URL (это потеря позиций):`));
  missing.forEach((u) => console.error(`   ${u}`));
}
if (empty.length) {
  console.error(red(`\nПОДОЗРИТЕЛЬНО ПУСТЫЕ ${empty.length}:`));
  empty.forEach((u) => console.error(`   ${u}`));
}
if (thin.length) {
  console.error(red(`\nПРОБЛЕМЫ С МЕТА-ДАННЫМИ ${thin.length}:`));
  thin.forEach((u) => console.error(`   ${u}`));
}

if (!missing.length && !empty.length && !thin.length) {
  console.log(green(`\nВсе ${live.length} URL на месте, мета-данные заполнены.\n`));
  process.exit(0);
}
console.error(`\nВсего проверено: ${live.length}\n`);
process.exit(1);
