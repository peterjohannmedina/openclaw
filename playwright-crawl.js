// playwright-crawl.js
// node playwright-crawl.js https://rangoni.com /tmp/rangoni 2
import fs from "fs";
import { chromium } from "playwright";
const [url, outDir = "/tmp/rangoni", maxDepth = 2] = process.argv.slice(2);
const socialRE = /twitter\.com|facebook\.com|instagram\.com|youtube\.com|linkedin\.com|tiktok\.com/i;
const seen = new Set();
const toVisit = [{ url, depth: 0 }];
const links = new Set();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  while (toVisit.length) {
    const { url: u, depth } = toVisit.shift();
    if (!u || seen.has(u) || depth > Number(maxDepth)) continue;
    seen.add(u);
    try {
      await page.goto(u, { waitUntil: "networkidle", timeout: 30000 });
      const hrefs = await page.$$eval("a[href]", els => els.map(e => e.href));
      for (const h of hrefs) {
        try { links.add(h); } catch (e) {}
        try {
          const originU = new URL(u).origin;
          const originH = new URL(h).origin;
          if (!seen.has(h) && originH === originU && depth + 1 <= Number(maxDepth)) {
            toVisit.push({ url: h, depth: depth + 1 });
          }
        } catch (e) {}
      }
    } catch (e) {
      // ignore page errors
    }
  }
  await browser.close();
  const all = Array.from(links).sort();
  const social = all.filter(u => socialRE.test(u));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/links.json`, JSON.stringify({ all, social }, null, 2));
  console.log(`done: ${outDir}/links.json`);
})();
