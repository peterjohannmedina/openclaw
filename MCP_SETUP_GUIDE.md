# MCP Servers Setup Guide for OpenClaw

This guide documents the 5 MCP servers added to your OpenClaw mcporter configuration.

## Configuration Location

**File:** `/home/rm/.openclaw/config/mcporter.json`

---

## 1. Context7 ✅ (Installed)

**Status:** Configured, needs API key  
**Transport:** HTTP Remote  
**Endpoint:** https://mcp.context7.com/mcp

### What it does
- Retrieves up-to-date documentation for libraries and frameworks
- Resolves library names to Context7 IDs
- Queries documentation with natural language

### Setup
```bash
# Get API key via OAuth
npx ctx7 setup

# Or manually get API key at https://context7.com
# Then update /home/rm/.openclaw/config/mcporter.json
```

### Test
```bash
mcporter --config /home/rm/.openclaw/config/mcporter.json list context7
mcporter --config /home/rm/.openclaw/config/mcporter.json call context7.resolve-library-id query:"Next.js middleware" libraryName:"next.js"
```

---

## 2. Firecrawl ⏸️ (Configured, disabled)

**Status:** Configured, needs API key and npx  
**Transport:** stdio (Node.js via npx)  
**Package:** firecrawl-mcp

### What it does
- Web scraping, crawling, and discovery
- Search and content extraction
- Deep research and batch scraping
- Cloud browser sessions with agent-browser automation

### Setup
```bash
# Get API key at https://www.firecrawl.dev/app/api-keys

# Update API key in /home/rm/.openclaw/config/mcporter.json
# Set "enabled": true

# Test the command manually first
env FIRECRAWL_API_KEY=your-key npx -y firecrawl-mcp
```

### Enable
Edit `/home/rm/.openclaw/config/mcporter.json` and change `"enabled": false` to `"enabled": true` for firecrawl.

---

## 3. Markitdown (Microsoft) ⏸️ (Configured, disabled)

**Status:** Configured, ready to use (no API key needed)  
**Transport:** stdio (Python via uvx)  
**Package:** markitdown-mcp

### What it does
- Convert PDF, DOCX, PPTX, Excel, images, audio to Markdown
- Extract EXIF metadata from images
- OCR and speech transcription
- HTML, CSV, JSON, XML, ZIP, YouTube URLs, EPubs

### Setup
```bash
# No API key needed - just enable it
# Edit /home/rm/.openclaw/config/mcporter.json
# Set "enabled": true for markitdown

# Test manually first
uvx markitdown-mcp
```

### Enable
Edit `/home/rm/.openclaw/config/mcporter.json` and change `"enabled": false` to `"enabled": true` for markitdown.

---

## 4. ScrapeGraphAI ⏸️ (Configured, disabled)

**Status:** Configured, needs API key  
**Transport:** HTTP Remote  
**Endpoint:** https://scrapegraph-mcp.onrender.com/mcp

### What it does
- AI-powered data extraction (smartscraper)
- Web search with structured results (searchscraper)
- Multi-page crawling (smartcrawler)
- Agentic scraping workflows with custom schemas
- Markdownify any webpage

### Setup
```bash
# Get API key at https://dashboard.scrapegraphai.com

# Update API key in /home/rm/.openclaw/config/mcporter.json
# Set "enabled": true
```

### Enable
Edit `/home/rm/.openclaw/config/mcporter.json` and change `"enabled": false` to `"enabled": true` for scrapegraph.

---

## 5. Stack Overflow ⏸️ (Configured, disabled)

**Status:** Configured, OAuth required  
**Transport:** HTTP Remote (OAuth)  
**Endpoint:** https://api.stackexchange.com/oauth/mcp

### What it does
- Search Stack Overflow questions and answers
- Retrieve full conversation threads with accepted solutions
- Ground AI answers in community-verified data
- Limit: 100 calls/day (beta)

### Setup
Stack Overflow MCP uses OAuth 2.0. To enable:

1. You'll need an MCP client that supports OAuth (e.g., Claude Desktop, Cursor)
2. Follow the official docs: https://api.stackexchange.com/docs/mcp-server
3. OAuth flow will prompt you to authorize the MCP server via your Stack Overflow account

**Note:** mcporter may not fully support OAuth flows yet. This server is best used with Claude Desktop or Cursor IDE.

---

## Quick Commands

### List all configured servers
```bash
mcporter --config /home/rm/.openclaw/config/mcporter.json list
```

### Enable a server
Edit `/home/rm/.openclaw/config/mcporter.json` and change `"enabled": false` to `"enabled": true`.

### Test a server
```bash
mcporter --config /home/rm/.openclaw/config/mcporter.json list <server-name>
mcporter --config /home/rm/.openclaw/config/mcporter.json list <server-name> --schema
```

---

## Current Status Summary

| Server | Status | API Key Needed | OAuth | Enabled |
|--------|--------|----------------|-------|---------|
| Context7 | ✅ Configured | Yes | Optional | ✅ Yes |
| Firecrawl | ⏸️ Ready | Yes | No | ❌ No |
| Markitdown | ✅ Ready | No | No | ❌ No |
| ScrapeGraphAI | ⏸️ Ready | Yes | No | ❌ No |
| Stack Overflow | ⏸️ Ready | No | Yes | ❌ No |

---

## Next Steps

1. **Get API keys** for Context7, Firecrawl, and ScrapeGraphAI
2. **Enable servers** you want to use by editing the config file
3. **Test each server** with `mcporter list <server-name>`
4. **Integrate into OpenClaw workflows** using mcporter skill

---

## OAuth Setup (Context7 example)

Context7 supports OAuth for easy setup:

```bash
# Run the OAuth setup wizard
npx ctx7 setup

# This will:
# 1. Open browser for OAuth authentication
# 2. Generate an API key
# 3. Auto-configure your MCP clients
```

For other servers, OAuth setup depends on MCP client support.

---

**Documentation saved:** `/home/rm/.openclaw/workspace/MCP_SETUP_GUIDE.md`
