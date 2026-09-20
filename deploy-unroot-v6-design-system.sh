#!/usr/bin/env bash
set -euo pipefail

cd "${1:-.}"
# The v6 homepage is maintained in Astro. Never recreate public/index.html.
npm ci
npm run build
npm run verify:homepage
printf '%s\n' 'Verified dist/. Commit and push main to trigger the connected Cloudflare deployment.'
