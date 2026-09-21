import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const homepage = readFileSync(resolve(dist, 'index.html'), 'utf8');
const base = process.argv[2];
const assets = new Set();
const media = new Set();
const links = new Set(['/']);
assert.ok(!existsSync(resolve(root, 'public/index.html')), 'public/index.html competes with the Astro route');
assert.ok(homepage.replace(/<[^>]*>/g, '').includes('Your new homepage in 7 days.'), 'The homepage was not built');
const ids = new Set([...homepage.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const local = value => value.startsWith('/') && !value.startsWith('//');
const assetPath = value => decodeURIComponent(value.split(/[?#]/)[0]);
const checkFile = (directory, url) => {
  const path = resolve(directory, `.${assetPath(url)}`);
  assert.ok(path.startsWith(`${directory}/`), `Invalid path: ${url}`);
  assert.ok(existsSync(path) && statSync(path).isFile() && statSync(path).size > 0, `Missing or empty file: ${path}`);
  return path;
};
for (const [tag] of homepage.matchAll(/<(?:img|video|source|script|link)\b[^>]*>/g)) {
  for (const [, attr, url] of tag.matchAll(/\b(src|poster|href)="([^"]+)"/g)) {
    if (!local(url)) continue;
    assets.add(url);
    if (/^<(img|video|source)\b/.test(tag) && attr !== 'href') media.add(url);
  }
}
for (const [, url] of homepage.matchAll(/\bdata-(?:before|after-image)="([^"]+)"/g)) {
  assets.add(url); media.add(url);
}
// Astro can inline small shared stylesheets, including font-face declarations.
for (const [, style] of homepage.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
  for (const [, url] of style.matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
    if (local(url)) { assets.add(url); media.add(url); }
  }
}
for (const url of assets) {
  const path = checkFile(dist, url);
  if (path.endsWith('.css')) {
    const css = readFileSync(path, 'utf8');
    for (const [, url] of css.matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
      if (local(url)) { assets.add(url); media.add(url); }
    }
  }
}
for (const url of media) checkFile(resolve(root, 'public'), url);
for (const [, href] of homepage.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
  if (href.startsWith('#')) assert.ok(ids.has(href.slice(1)), `Missing anchor: ${href}`);
  if (local(href)) {
    const path = assetPath(href);
    assert.ok(existsSync(resolve(dist, `.${path}`, 'index.html')) || existsSync(resolve(dist, `.${path}`)), `Missing route: ${path}`);
    links.add(path);
  }
}
if (base) {
  const checks = [...assets, ...links];
  for (const path of checks) {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (assets.has(path)) assert.ok(!type.includes('text/html'), `${path} returned HTML instead of an asset`);
    await response.arrayBuffer();
  }
}
console.log(`PASS: Homepage at /; ${assets.size} assets (${media.size} public media/font files); ${links.size} local routes; all homepage anchors.${base ? ' All HTTP requests returned 200 with no asset fallback pages.' : ''}`);
