# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

OpenClaw is a persistent AI agent workspace for `rm` (synchronic1). It manages:
- Autonomous monitoring and automation (cron/heartbeat jobs)
- Infrastructure deployment via Ansible (Proxmox/LXC/Ceph)
- Multi-model AI failover orchestration
- Browser automation via Playwright (AiRanger.dev integration)
- Knowledge management via Obsidian MCP

**Agent identity:** OpenClawA_rm — always read `SOUL.md`, `USER.md`, and today's memory file in `memory/` at session start.

## Key Commands

```bash
# Install dependencies (Playwright)
npm install

# Run Moltbook comment monitor manually
bash check_moltbook_comments.sh

# Run GitHub trending report manually
bash daily_github_report.sh

# Run model failover probe
node scripts/failover.js --sessionKey "KEY" --models "provider/model1,provider/model2" --store /path/to/sessions.json

# Fetch AiRanger available models
node get_available_models_v3.js

# Check MCP server health
curl http://192.168.1.203:3010/sse

# Verify Ansible/infra connectivity
ansible pver430 -m ping
ansible-playbook ansible/playbook.yml
```

## Architecture

### Session Startup Checklist
1. Read `SOUL.md` (core values/boundaries)
2. Read `USER.md` (user profile)
3. Read today's memory: `memory/YYYY-MM-DD.md`
4. Check `HEARTBEAT.md` for scheduled job intervals

### Active Infrastructure
- **Proxmox host:** pver430 @ 192.168.1.233 (Dell Xeon PowerEdge, Ceph storage)
- **CT 203** (192.168.1.203): MCP stack — Obsidian MCP + Redis + second-brain (Ansible-managed)
- **SearxNG:** 192.168.1.210:8080 (local private search)
- **pvet630** (192.168.1.242): Ollama inference server (RTX 3090 + RTX 3060)

### Model Configuration (`config.yaml`)
Primary: `kimi-coding/k2p5` → Fallback: `google/gemini-2.5-flash`

Copilot-proxy plugin is enabled. Failover logic lives in `scripts/failover.js` (ESM module), which probes models sequentially and writes results atomically to `sessions.json`.

### MCP Integration (`config/mcporter.json`)
- `mcp-execution-server`: SSH tunnel to 192.168.1.233 (requires key-based auth)
- `second-brain`: SSE at http://192.168.1.203:3011/sse (20 tools: Redis, Prometheus, Grafana, Proxmox, Ceph, network docs, user context)

### Memory System
- `memory/YYYY-MM-DD.md` — daily session memory (main sessions only)
- `MEMORY.md` (this project's root) — long-term cross-session memory for this Claude Code instance
- Group chat sessions do NOT load full memory for privacy

### Automation Jobs
| Job | Script | Interval |
|-----|--------|----------|
| Moltbook comment monitor | `check_moltbook_comments.sh` | 120 min |
| GitHub trending report | `daily_github_report.sh` | Daily 07:45 PT |
| Heartbeat | configured in openclaw.json | 60 min |

State deduplication for Moltbook is tracked in `moltbook_seen_comments.json`.

### Skills (`skills/`)
Reusable capability modules loaded by the agent runtime:
- `searxng/` — query local SearxNG
- `searxng-browser-search/` — Playwright-based browser search
- `file-organizer/` — directory organization

Ansible-deployed MCP skills (on CT 203): `prometheus-monitor`, `grafana-monitor`, `proxmox-admin`, `ceph-operations`, `network-docs-search`, `user_context`.

### Known Issues
- **AiRanger JWT expiration:** Tokens from browser session expire when used in sub-agent API calls. Playwright login scripts (`get_available_models_v3.js`) work around this but are fragile.
- **Obsidian MCP crash loop (fixed):** Was caused by reusing a single `McpServer` instance per SSE connection. Fixed via factory pattern (new instance per connection).
- `BOOTSTRAP.md` can be deleted after initial setup is confirmed complete.
