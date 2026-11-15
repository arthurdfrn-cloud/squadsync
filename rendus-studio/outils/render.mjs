// Exporte les 7 vues de studio3d.html en PNG via Playwright (Chromium headless).
// Usage : node rendus-studio/outils/render.mjs [numéros de vue, ex. 1 3 7]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1700, height: 1200 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/studio3d.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });

const wanted = process.argv.slice(2).map(Number);
const views = await page.evaluate(() => window.VIEWS.map(v => v.file));
for (let i = 0; i < views.length; i++) {
  if (wanted.length && !wanted.includes(i + 1)) continue;
  const t = Date.now();
  const data = await page.evaluate(i => { window.exportView(i); return window.exportView(i); }, i); // 2 passes : ombres stabilisées
  fs.writeFileSync(path.join(root, views[i] + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  console.log(`${views[i]}.png  (${((Date.now() - t) / 1000).toFixed(1)} s)`);
}
await browser.close(); server.close();
