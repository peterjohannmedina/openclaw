# MCP OAuth & API Key Setup Checklist

**Date:** 2026-02-20  
**For:** Tomorrow's setup session

---

## OAuth-Enabled MCPs (2)

### 1. Context7 (OAuth Optional)

**OAuth Setup:**
- **Method:** Run `npx ctx7 setup` in terminal
- **What happens:** Opens browser → login/authorize → auto-generates API key → configures MCP
- **Website:** https://context7.com
- **Alternative:** Get API key directly from dashboard (no OAuth needed)

**Status:** ⏳ Not configured  
**Priority:** High (already enabled in config, just needs auth)

---

### 2. Stack Overflow MCP (OAuth Required)

**OAuth Setup:**
- **Method:** Configure via your MCP client (Claude Desktop or Cursor)
- **What happens:** Client will prompt OAuth flow when you first use the MCP
- **Account needed:** Free Stack Overflow account
- **Signup:** https://stackoverflow.com/users/signup
- **Docs:** https://api.stackexchange.com/docs/mcp-server
- **Limits:** 100 calls/day (beta)

**Status:** ⏸️ Configured but disabled (OAuth handled by IDE, not mcporter)  
**Priority:** Low (needs IDE that supports MCP OAuth)

---

## API Key MCPs (3)

These don't use OAuth — just get an API key and paste it into the config.

### 3. Firecrawl

**API Key Setup:**
- **Website:** https://www.firecrawl.dev/app/api-keys
- **Steps:**
  1. Sign up / log in
  2. Go to API Keys page
  3. Generate new API key
  4. Copy key
  5. Paste into `/home/rm/.openclaw/config/mcporter.json` under `firecrawl.env.FIRECRAWL_API_KEY`
  6. Set `"enabled": true`

**Status:** ⏸️ Configured but disabled  
**Priority:** Medium (web scraping/crawling capabilities)

---

### 4. ScrapeGraphAI

**API Key Setup:**
- **Website:** https://dashboard.scrapegraphai.com
- **Steps:**
  1. Sign up / log in
  2. Navigate to API Keys
  3. Generate new API key
  4. Copy key
  5. Paste into `/home/rm/.openclaw/config/mcporter.json` under `scrapegraph.headers.X-API-Key`
  6. Set `"enabled": true`

**Status:** ⏸️ Configured but disabled  
**Priority:** Medium (AI-powered scraping)

---

### 5. Markitdown (Microsoft)

**API Key Setup:**
- **None needed!** This MCP runs locally via Python (uvx)
- **Steps:**
  1. Just set `"enabled": true` in `/home/rm/.openclaw/config/mcporter.json`
  2. Test: `uvx markitdown-mcp`

**Status:** ✅ Ready to enable (no auth needed)  
**Priority:** Low (file conversion to Markdown)

---

## Tomorrow's Action Plan

### Quick Wins (No OAuth)
1. ✅ **Enable Markitdown** — no auth needed, just flip the switch
2. 🔑 **Get Firecrawl API key** → https://www.firecrawl.dev/app/api-keys
3. 🔑 **Get ScrapeGraphAI API key** → https://dashboard.scrapegraphai.com

### OAuth Setup
4. 🔐 **Context7 OAuth** — Run `npx ctx7 setup` (opens browser, auto-configures)
5. 🔐 **Stack Overflow OAuth** — Configure in Claude Desktop or Cursor (not mcporter)

---

## Websites Checklist

| Service | URL | Purpose |
|---------|-----|---------|
| Context7 | https://context7.com | OAuth login or API key |
| Firecrawl | https://www.firecrawl.dev/app/api-keys | Get API key |
| ScrapeGraphAI | https://dashboard.scrapegraphai.com | Get API key |
| Stack Overflow | https://stackoverflow.com/users/signup | Create account (if needed) |
| Stack Overflow MCP Docs | https://api.stackexchange.com/docs/mcp-server | Setup instructions |

---

## Commands to Run Tomorrow

### 1. Enable Markitdown (instant)
```bash
# Edit config
nano /home/rm/.openclaw/config/mcporter.json
# Change markitdown "enabled": false → "enabled": true
# Save and test
mcporter --config /home/rm/.openclaw/config/mcporter.json list markitdown
```

### 2. Context7 OAuth (interactive)
```bash
npx ctx7 setup
# Follow browser prompts to authorize
```

### 3. Test all configured MCPs
```bash
mcporter --config /home/rm/.openclaw/config/mcporter.json list
```

---

## Config File Location

**Edit here:** `/home/rm/.openclaw/config/mcporter.json`

When you get API keys, update:
- `context7.headers.CONTEXT7_API_KEY` → your Context7 key
- `firecrawl.env.FIRECRAWL_API_KEY` → your Firecrawl key
- `scrapegraph.headers.X-API-Key` → your ScrapeGraph key

And set `"enabled": true` for each.

---

## Priority Order (Recommended)

1. **Markitdown** — enable now (no auth)
2. **Context7** — OAuth setup (`npx ctx7 setup`)
3. **Firecrawl** — get API key (powerful scraping)
4. **ScrapeGraphAI** — get API key (AI scraping)
5. **Stack Overflow** — configure in IDE if you use Claude/Cursor

---

**Saved:** `/home/rm/.openclaw/workspace/MCP_OAUTH_SETUP_CHECKLIST.md`
