import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'public', 'assets', 'cms');
const EXT_RE = /\.(?:avif|webp|png|jpe?g|gif|svg|ico|bmp|tiff?|mp4|webm|mov|m4v|pdf|txt)(?:\?[^\s"'<>]*)?$/i;
const URL_RE = /https:\/\/cdn\.prod\.website-files\.com\/[A-Za-z0-9_%+.,()\-/#?=&]+/g;
const TEXT_EXTS = new Set(['.astro', '.json', '.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.html', '.css']);

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else if (TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

function localName(rawUrl) {
  const u = new URL(rawUrl.replace(/&amp;/g, '&'));
  const decoded = decodeURIComponent(u.pathname.split('/').pop() || 'asset');
  const ext = path.extname(decoded) || '';
  const base = path.basename(decoded, ext)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'asset';
  const hash = crypto.createHash('sha1').update(rawUrl).digest('hex').slice(0, 10);
  return `${base}-${hash}${ext.toLowerCase()}`;
}

async function download(rawUrl, dest) {
  const url = rawUrl.replace(/&amp;/g, '&');
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 Unroot migration/1.0' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, data);
}

await fs.mkdir(OUT, { recursive: true });
const files = await walk(SRC);
const urlToLocal = new Map();

for (const file of files) {
  const text = await fs.readFile(file, 'utf8');
  for (const match of text.matchAll(URL_RE)) {
    let url = match[0].replace(/[),.;]+$/, '');
    if (!EXT_RE.test(url)) continue;
    if (!urlToLocal.has(url)) {
      const filename = localName(url);
      urlToLocal.set(url, `/assets/cms/${filename}`);
    }
  }
}

if (urlToLocal.size === 0) {
  console.log('No Webflow CDN assets found in src/. Everything is already local.');
  process.exit(0);
}

console.log(`Localizing ${urlToLocal.size} Webflow CDN assets...`);
let done = 0;
for (const [url, local] of urlToLocal) {
  const dest = path.join(ROOT, 'public', local);
  try {
    await fs.access(dest);
  } catch {
    await download(url, dest);
  }
  done += 1;
  console.log(`[${done}/${urlToLocal.size}] ${path.basename(dest)}`);
}

for (const file of files) {
  let text = await fs.readFile(file, 'utf8');
  let changed = false;
  for (const [url, local] of urlToLocal) {
    if (text.includes(url)) {
      text = text.split(url).join(local);
      changed = true;
    }
  }
  if (changed) await fs.writeFile(file, text);
}

console.log(`Done. ${urlToLocal.size} assets are now local under public/assets/cms/.`);
console.log('Commit src/ and public/assets/cms/ so future builds no longer depend on Webflow CDN.');
