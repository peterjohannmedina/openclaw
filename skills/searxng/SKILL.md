---
name: searxng
description: Web search via local SearXNG metasearch engine. REPLACEMENT for built-in tools.web.search (disabled in OpenClaw v2026.2.15). Provides privacy-respecting web search without API keys or external dependencies.
---

# SearXNG Search Skill

## Overview

This skill provides **persistent web search capabilities** as a replacement for the built-in `tools.web.search` that was disabled in OpenClaw v2026.2.15.

> **⚠️ Migration Note:** OpenClaw v2026.2.15 removed `searxng` as a valid built-in provider (only `brave` remains). Using `provider: searxng` in Gateway config causes crash-loops. **This skill is the supported alternative.**

## Key Features

- **No API keys required** - Uses self-hosted SearXNG instance
- **Crash-resistant** - Robust error handling, never crashes the Gateway
- **Retry logic** - Automatically retries on transient failures
- **Zero external dependencies** - Pure Python stdlib
- **Drop-in replacement** - Simple API matching common search patterns

## When to Use

- Any task requiring web search (was `tools.web.search`)
- Research requiring current information
- Fact verification with source URLs
- Documentation lookups
- **Avoid** using built-in `tools.web.search` (disabled/crashes Gateway)

## Configuration

The skill connects to the local SearXNG instance:

| Setting | Value | Notes |
|---------|-------|-------|
| URL | `http://192.168.1.210:8080` | Local instance |
| Timeout | 20 seconds | Configurable |
| Retries | 2 attempts | Automatic retry on failure |
| Max Results | 50 | Per query limit |

No API keys, no authentication, no external services.

## Usage

### Quick Search (Convenience Function)

```python
from skills.searxng.scripts.searxng import web_search

# Simple one-off search
results = web_search("latest AI developments", limit=5)

for r in results:
    print(f"{r['title']}: {r['url']}")
```

### Skill Class (Recommended for Repeated Use)

```python
from skills.searxng.scripts.searxng import SearxngSkill

skill = SearxngSkill()

# Check health before searching
if skill.is_healthy():
    results = skill.search("python best practices", limit=10)
    
# Custom timeout
skill = SearxngSkill(timeout=30)
results = skill.search("slow query", limit=5)
```

### CLI Usage

```bash
# Search
cd skills/searxng
python scripts/searxng.py "openclaw documentation" --limit 5

# Health check
python scripts/searxng.py --health-check

# Detailed health with latency
python scripts/searxng.py --health-check --detailed

# Custom SearXNG instance
python scripts/searxng.py "query" --url http://other-searxng:8080
```

## Response Format

### Success Response

```python
[
  {
    "title": "Result Title",
    "url": "https://example.com/page",
    "content": "Snippet of content...",
    "engine": "duckduckgo",  # Source engine
    "score": 1.0             # Relevance score
  }
]
```

### Error Response

```python
[
  {
    "error": "Error message describing what went wrong",
    "error_type": "connection"  # Categories: connection, timeout, parse, empty, invalid_input
  }
]
```

**Important:** Errors are returned as structured data, never raised as exceptions. This prevents crashes.

## Error Handling

The skill handles all errors gracefully:

| Error Type | Cause | Behavior |
|------------|-------|----------|
| `connection` | SearXNG unreachable | Retry 2x, then return error dict |
| `timeout` | Request too slow | Retry 2x, then return error dict |
| `parse` | Invalid JSON response | Return error with raw info |
| `empty` | No results found | Return error dict indicating no results |
| `invalid_input` | Bad query | Return error dict immediately |

## Health Check

```python
from skills.searxng.scripts.searxng import SearxngSkill

skill = SearxngSkill()

# Quick boolean check
if skill.is_healthy():
    print("SearXNG is up")

# Detailed status
status = skill.health_check(detailed=True)
# Returns: {"status": "ok", "url": "...", "latency_ms": 45, "http_status": 200}
```

## Comparison: Built-in vs Skill

| Feature | Built-in `tools.web.search` | This Skill |
|---------|---------------------------|------------|
| SearXNG support | ❌ Removed v2026.2.15 | ✅ Supported |
| Brave support | ✅ Built-in | ✅ Via SearXNG engines |
| API keys | Required for Brave | None needed |
| Gateway crashes | Yes (if misconfigured) | Never |
| Self-hosted | No | Yes |

## Troubleshooting

### SearXNG unreachable

```bash
# Check server
curl http://192.168.1.210:8080

# Check with skill
python scripts/searxng.py --health-check --detailed
```

### No results

- Check query isn't empty or just whitespace
- Try broader search terms
- Verify SearXNG has engines enabled: http://192.168.1.210:8080/preferences

## Migration from Built-in Search

**Before (crashes Gateway):**
```json
// openclaw.json - DON'T DO THIS
{
  "tools": {
    "web": {
      "search": {
        "enabled": true,
        "provider": "searxng"  // ❌ Invalid - causes crashes
      }
    }
  }
}
```

**After (working):**
```json
// openclaw.json
{
  "tools": {
    "web": {
      "search": {
        "enabled": false  // Disable built-in
      }
    }
  }
}
```

```python
# In your agent code - USE THIS
from skills.searxng.scripts.searxng import web_search

results = web_search("your query")
```

## Architecture Notes

This skill was hardened based on post-mortem analysis:

1. **No config file dependencies** - All settings have sensible defaults
2. **Graceful degradation** - Returns error structures, never raises
3. **Retry with backoff** - Handles transient network issues
4. **Socket timeouts** - Prevents hanging on unresponsive servers
5. **Input validation** - Sanitizes queries before sending

---

*This skill is the persistent, supported method for web search in OpenClaw.*
