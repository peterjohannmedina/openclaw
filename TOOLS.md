# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## SSH Access

### Infrastructure Hosts

**CT 203 (192.168.1.203) — MCP Stack**
- User: `root`
- Password: `4677`
- Services: second-brain MCP (port 3011), Obsidian MCP (port 3010), Redis, Prometheus, Grafana

**pver430 (192.168.1.233) — Proxmox Host**
- User: `root`
- Password: `46774677`
- Services: mcp-execution-server, Proxmox host
- Note: User `rm` does not exist on this host
- Wrapper script: `/home/rm/.openclaw/workspace/scripts/ssh-pver430.sh`

**Quick Access:**
```bash
# CT 203
sshpass -p '4677' ssh root@192.168.1.203

# pver430 (use wrapper for MCP)
/home/rm/.openclaw/workspace/scripts/ssh-pver430.sh 'command'
```

---

## Communication Patterns

### ALL CAPS = Direct Instruction
When Peter uses **ALL CAPS** in a message (e.g., "HELLO OPENCLAW - do this thing"), that section is his **direct instruction/comment**. Everything else in the message is context/reference material to support the instruction.

**Example:**
```
INSTALL THESE DEPENDENCIES

[long documentation snippet]
[code examples]
```
→ Respond to "INSTALL THESE DEPENDENCIES", treat the rest as supporting context.

---

## Web Search - SearXNG (LOCAL, FREE)

**ALWAYS USE SearXNG instead of Brave API to avoid costs!**

**SearXNG Instance:** http://192.168.1.210:8080
- Self-hosted, privacy-respecting metasearch
- Aggregates: DuckDuckGo, Google, Bing, Brave, etc.
- NO API keys, NO costs, NO rate limits

**How to Use:**
```python
# Use SearXNG skill (preferred)
from skills.searxng.scripts.searxng import web_search
results = web_search("your query", limit=10)

# Or via wrapper
from scripts.web_search_wrapper import web_search
results = web_search("your query", count=10)
```

**CLI:**
```bash
python3 ~/.openclaw/workspace/skills/searxng/scripts/searxng.py "query" --limit 10
```

**Health Check:**
```bash
curl http://192.168.1.210:8080
python3 ~/.openclaw/workspace/skills/searxng/scripts/searxng.py --health-check
```

**NOTE:** Built-in `web_search` tool uses Brave API (costs money). Always use SearXNG skill instead!

---

## Discord Knowledge Base

### OpenClaw KB Channel
- **Server:** Your Private Server (ID: `1428821214251585710`)
- **Channel:** #openclaw-kb (ID: `1474448693225717962`)
- **Purpose:** Thread-based knowledge base for major session tasks

### Usage Pattern
For each major task execution:
1. Create new thread with semantic topic name
2. First post includes session reference/ID
3. Post task summary, deliverables, status
4. Update thread with relevant progress
5. Only bot posts (no human clutter)

### Active Threads
- "MCP Setup: Markitdown Installation & Configuration" - Markitdown tool setup
- "Infrastructure: Obsidian MCP Ansible Deployment" - Ansible playbook generation

---

Add whatever helps you do your job. This is your cheat sheet.
