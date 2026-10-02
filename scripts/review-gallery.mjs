#!/usr/bin/env node
// Builds a phone-friendly screenshot gallery for PR previews.
//
//   node scripts/review-gallery.mjs <screenshots-dir> <out-dir> "<title>"
//
// CI copies the result into dist/__review/ before deploying the preview, so the PR comment can
// link to https://<preview>/__review/ instead of a zip artifact.

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );
}

export function galleryHtml(title, images) {
  const items = images.length
    ? images
        .map(
          (name) =>
            `<figure><a href="${escapeHtml(name)}"><img src="${escapeHtml(name)}" alt="${escapeHtml(name)}" loading="lazy"></a><figcaption>${escapeHtml(name.replace(/\.png$/, ''))}</figcaption></figure>`,
        )
        .join('\n')
    : '<p>No screenshots were captured. Use <code>snap(page, name)</code> in e2e tests.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;margin:1rem;background:#f8fafc;color:#111827}
figure{margin:0 0 1.5rem}img{max-width:100%;border:1px solid #cbd5e1;border-radius:8px}
figcaption{font-size:.9rem;color:#475569;margin-top:.25rem}h1{font-size:1.2rem}</style></head>
<body><h1>${escapeHtml(title)}</h1><p><a href="/">Open the app</a></p>
${items}
</body></html>
`;
}

function main([srcDir, outDir, title = 'Review screenshots']) {
  if (!srcDir || !outDir) {
    console.error('Usage: review-gallery.mjs <screenshots-dir> <out-dir> [title]');
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  const images = existsSync(srcDir)
    ? readdirSync(srcDir)
        .filter((f) => f.endsWith('.png'))
        .sort()
    : [];
  for (const image of images) copyFileSync(join(srcDir, image), join(outDir, image));
  writeFileSync(join(outDir, 'index.html'), galleryHtml(title, images));
  console.log(`Gallery with ${images.length} screenshot(s) written to ${outDir}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
