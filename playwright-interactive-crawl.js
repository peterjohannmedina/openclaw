#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const seeds = ['https://rangoni.com', 'https://lawrance.com'];
const socialRE = /twitter\.com|facebook\.com|instagram\.com|youtube\.com|linkedin\.com|tiktok\.com|mastodon\.|threads\.net|github\.com|discord\.gg|discordapp\.com/i;

function hostOf(u){ try{ return new URL(u).hostname.replace(/:\d+$/,''); }catch(e){return u.replace(/[^a-z0-9.-]/gi,'_'); }}

async function captureFor(seed){
  const out = { seed, crawledAt: new Date().toISOString(), anchors: [], metas: [], linkRels: [], jsonLd: [], scripts: [], social: [] };
  const outDir = path.join('/tmp', hostOf(seed));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, userAgent: 'Mozilla/5.0 (compatible; OpenClawBot/1.0)' });
  const page = await context.newPage();
  try{
    await page.goto(seed, { waitUntil: 'networkidle', timeout: 60000 });
  }catch(e){ /* continue to attempt interaction */ }

  // helper to safely evaluate
  const evalSafe = async fn => { try{ return await page.evaluate(fn); }catch(e){ return null; } };

  // attempt interactive behaviours: scroll, click common menus, open feeds
  try{
    // scroll slowly
    for(let i=0;i<6;i++){
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(800);
    }
    // click elements that may reveal links
    const clickSelectors = ['button[aria-label*="menu" i]', 'button[aria-label*="menu" i]', 'button[role="button"][aria-haspopup]', 'a[rel~="me"]', 'a[aria-label*="social" i]', 'button:has(svg)'];
    for(const sel of clickSelectors){
      const els = await page.$$(sel).catch(()=>[]);
      for(const el of els){
        try{ await el.click({ timeout: 2000 }); await page.waitForTimeout(500); }catch(e){}
      }
    }
  }catch(e){}

  // collect anchors
  const anchors = await evalSafe(() => Array.from(document.querySelectorAll('a[href]')).map(a=>({href:a.href, text: a.innerText || a.getAttribute('aria-label') || '', rel: a.getAttribute('rel')})));
  if(anchors) out.anchors = anchors;

  // meta tags
  const metas = await evalSafe(() => Array.from(document.getElementsByTagName('meta')).map(m=>({name:m.getAttribute('name')||m.getAttribute('property')||'', content:m.getAttribute('content')})));
  if(metas) out.metas = metas;

  // link rel (e.g., rel="me", alternate feeds)
  const linkRels = await evalSafe(() => Array.from(document.querySelectorAll('link[rel]')).map(l=>({rel:l.getAttribute('rel'), href:l.href, type:l.getAttribute('type')})));
  if(linkRels) out.linkRels = linkRels;

  // JSON-LD scripts
  const jsonLd = await evalSafe(() => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s=>s.innerText));
  if(jsonLd) out.jsonLd = jsonLd;

  // scripts src
  const scripts = await evalSafe(() => Array.from(document.querySelectorAll('script[src]')).map(s=>s.src));
  if(scripts) out.scripts = scripts;

  // aggregate social links by regex
  const allHrefs = out.anchors.map(a=>a.href).concat(out.linkRels.map(l=>l.href)).concat(out.scripts || []).filter(Boolean);
  out.social = Array.from(new Set(allHrefs.filter(u=>socialRE.test(u)))).sort();

  // also check meta tags for social handles
  const socialFromMeta = (out.metas||[]).filter(m=>/twitter:site|twitter:creator|og:site_name|og:url|al:ios:app_name/i.test(m.name) && m.content).map(m=>m.content);
  socialFromMeta.forEach(s=>{ if(!out.social.includes(s)) out.social.push(s); });

  // write results
  const outPath = path.join(outDir, 'links.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  await browser.close();
  return outPath;
}

(async ()=>{
  const results = [];
  for(const s of seeds){
    try{
      const p = await captureFor(s);
      console.log('done:', p);
      results.push(p);
    }catch(e){
      console.error('error for', s, e.message);
    }
  }
  process.exit(0);
})();
