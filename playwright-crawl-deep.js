#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const [seed, outDir = '/tmp/site-crawl', maxDepthArg = '3'] = process.argv.slice(2);
if (!seed) {
  console.error('Usage: node playwright-crawl-deep.js <seed-url> [outDir] [maxDepth]');
  process.exit(2);
}
const maxDepth = parseInt(maxDepthArg, 10) || 3;
const socialRE = /twitter\.com|facebook\.com|instagram\.com|youtube\.com|linkedin\.com|tiktok\.com|mastodon\.|medium\.com|github\.com/i;
const sameOrigin = (u) => {
  try { return new URL(u).origin === new URL(seed).origin; } catch (e) { return false; }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const seen = new Set();
  const toVisit = [{ url: seed, depth: 0 }];
  const links = new Set();

  while (toVisit.length) {
    const { url, depth } = toVisit.shift();
    if (seen.has(url) || depth > maxDepth) continue;
    seen.add(url);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const hrefs = await page.$$eval('a[href]', els => els.map(e => e.href).filter(Boolean));
      for (const h of hrefs) {
        try { links.add(h); } catch(e){}
        if (!seen.has(h) && depth + 1 <= maxDepth) {
          // follow same-origin pages to explore site
          try {
            const u = new URL(h);
            if (u.origin === new URL(seed).origin) toVisit.push({ url: h, depth: depth + 1 });
          } catch(e){}
        }
      }
    } catch (e) {
      // record error page as skipped
    }
  }

  await browser.close();
  const all = Array.from(links).sort();
  const social = all.filter(u => socialRE.test(u));

  const out = { seed, all, social };
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'links.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('done:', outPath);
})();
