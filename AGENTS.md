# AGENTS.md - OpenClaw Project Documentation

**Project:** OpenClaw  
**Agent Identity:** OpenClawA_rm 🤖  
**Human:** rm (synchronic1)  
**Language:** English  

---

## Project Overview

OpenClaw is a persistent AI agent workspace designed for autonomous monitoring, infrastructure management, and multi-model AI orchestration. It integrates browser automation, infrastructure deployment, and knowledge management into a unified operational environment.

**Key Capabilities:**
- Autonomous monitoring and automation via cron/heartbeat jobs
- Infrastructure deployment via Ansible (Proxmox/LXC/Ceph)
- Multi-model AI failover orchestration
- Browser automation via Playwright (AiRanger.dev integration)
- Knowledge management via Obsidian MCP and Redis caching
- Local private search via SearXNG

---

## Technology Stack

| Component | Technology | Version/Details |
|-----------|------------|-----------------|
| Runtime | Node.js | ES Modules |
| Browser Automation | Playwright | ^1.58.2 |
| Infrastructure | Ansible | Proxmox/LXC/Ceph |
| Monitoring | Prometheus + Grafana | Docker-based |
| Search | SearXNG | Local instance @ 192.168.1.210:8080 |
| Caching | Redis | CT 203 |
| MCP Protocol | Model Context Protocol | SSE transport |
| Local Inference | Ollama | pvet630 @ 192.168.1.242:11434 |

---

## Configuration Files

### Core Configuration

| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies (Playwright) |
| `config.yaml` | Model providers, plugins, agent defaults |
| `config/mcporter.json` | MCP server endpoints and SSH tunnels |

### config.yaml Structure
```yaml
plugins:
  entries:
    copilot-proxy:
      enabled: true

models:
  providers: {}

agents:
  defaults:
    model:
      primary: "kimi-coding/k2p5"
      fallbacks:
        - "google/gemini-2.5-flash"
```

### config/mcporter.json Structure
```json
{
  "mcpServers": {
    "mcp-execution-server": {
      "command": "ssh rm@192.168.1.233 '...'"
    },
    "second-brain": {
      "baseUrl": "http://192.168.1.203:3010/sse"
    }
  }
}
```

---

## Directory Structure

```
.
├── *.js                      # Playwright automation scripts (root level)
├── scripts/                  # Failover and utility scripts
│   ├── failover.js           # Model failover (ESM module)
│   └── default-failover.js   # Default failover behavior
├── failover/                 # Failover utilities (alternative location)
├── config/                   # Configuration files
│   └── mcporter.json         # MCP server configuration
├── skills/                   # Reusable capability modules
│   ├── file-organizer/       # Directory organization skill
│   ├── searxng/              # Local search skill (Python)
│   └── searxng-browser-search/  # Browser-based search skill
├── memory/                   # Session memory storage
│   ├── YYYY-MM-DD.md         # Daily session logs
│   └── github_trending_history.json  # State for trending report
├── ansible/                  # Infrastructure deployment
│   ├── playbook_summary.txt  # Ansible playbook documentation
│   ├── obsidian_mcp_architecture.md  # MCP architecture docs
│   └── skills/               # MCP skill definitions
├── .openclaw/                # OpenClaw runtime state
│   └── workspace-state.json  # Workspace bootstrap state
└── *.sh                      # Shell automation scripts
```

---

## Build and Run Commands

### Dependency Installation
```bash
npm install
```

### Automation Scripts
```bash
# Run Moltbook comment monitor manually
bash check_moltbook_comments.sh

# Run GitHub trending report manually
bash daily_github_report.sh
```

### Model Failover
```bash
# Probe and apply model failover
node scripts/failover.js \
  --sessionKey "KEY" \
  --models "provider/model1,provider/model2" \
  --store /path/to/sessions.json \
  --timeout 5000
```

### Browser Automation
```bash
# Fetch AiRanger available models
node get_available_models_v3.js

# Login and screenshot
node login_and_screenshot.js
```

### Infrastructure
```bash
# Check MCP server health
curl http://192.168.1.203:3010/sse

# Verify Ansible connectivity
ansible pver430 -m ping
ansible-playbook ansible/playbook.yml
```

---

## Code Style Guidelines

### JavaScript (Node.js with ES Modules)

- Use ES Modules (`import`/`export`) for all new code
- Include shebang for executable scripts: `#!/usr/bin/env node`
- Use `async/await` for asynchronous operations
- Prefer `const` and `let` over `var`

**Example:**
```javascript
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

async function main() {
  const data = await fetchData();
  console.log(data);
}

main().catch(console.error);
```

### Shell Scripts

- Start with `#!/bin/bash`
- Include descriptive comments for configuration sections
- Use uppercase for environment variables
- Quote all variable references

### Python (Skills)

- Use type hints where appropriate
- Document functions with docstrings
- Use the `@tool` decorator for skill functions

---

## Testing Instructions

**Note:** This project does not have a formal test suite. Testing is done via:

1. **Manual execution** of scripts in development environment
2. **Browser automation verification** via screenshots
3. **Health check endpoints** for MCP servers
4. **Ansible dry-run**: `ansible-playbook --check playbook.yml`

---

## Infrastructure Architecture

### Active Infrastructure

| Component | IP/Host | Description |
|-----------|---------|-------------|
| Proxmox Host | pver430 @ 192.168.1.233 | Dell Xeon PowerEdge, Ceph storage |
| CT 203 | 192.168.1.203 | MCP stack — second-brain (port 3011) + Obsidian MCP (port 3010) + Redis |
| SearXNG | 192.168.1.210:8080 | Local private search |
| pvet630 | 192.168.1.242 | Ollama inference server (RTX 3090 + RTX 3060) |

### Docker Stack (CT 203)
- nginx-gateway
- obsidian-mcp
- redis-cache
- prometheus
- grafana
- cc-edit

### Local Inference (pvet630)

**Ollama Server:** http://192.168.1.242:11434  
**GPU Hardware:** NVIDIA RTX 3090 (24GB) + RTX 3060 (12GB)

**Available Models:**
- `llama3.3:70b-instruct-q4_K_M` — 70B parameter, 4-bit quantization (RTX 3090)
- `mistral:7b-instruct` — Fast general-purpose (RTX 3060)
- `codellama:70b` — Specialized coding (RTX 3090)
- `llama3.1:8b-instruct` — Balanced general purpose (RTX 3060)

**OpenClaw Integration:**
```yaml
# config.yaml provider configuration
ollama-pvet630:
  type: ollama
  baseUrl: http://192.168.1.242:11434
```

**Usage:**
- Network accessible from any OpenClaw instance on LAN
- Zero API costs for local inference
- Full privacy (data stays on network)
- Automatic failover to cloud models if needed

**Documentation:** `docs/ollama-inference-setup.md`

---

## Automation Jobs

| Job | Script | Interval |
|-----|--------|----------|
| Moltbook comment monitor | `check_moltbook_comments.sh` | 120 min |
| GitHub trending report | `daily_github_report.sh` | Daily 07:45 PT |
| Heartbeat | configured in openclaw.json | 60 min |

**State Files:**
- `moltbook_seen_comments.json` - Deduplication for Moltbook monitor
- `memory/github_trending_history.json` - Previous day's trending repos

---

## Memory System

### Daily Memory
- **Location:** `memory/YYYY-MM-DD.md`
- **Purpose:** Raw session logs, operational updates, decisions
- **Access:** Read at session start

### Long-term Memory
- **Location:** `MEMORY.md`
- **Purpose:** Curated cross-session memory
- **Security:** Load ONLY in main sessions (direct chat), NOT in group chats

### Session Startup Checklist
1. Read `SOUL.md` — core values and boundaries
2. Read `USER.md` — user profile
3. Read today's memory: `memory/YYYY-MM-DD.md`
4. Check `HEARTBEAT.md` for scheduled job intervals

---

## Skills System

### Local Skills (workspace/skills/)

| Skill | Purpose | Location |
|-------|---------|----------|
| file-organizer | Directory organization by extension | `skills/file-organizer/` |
| searxng | Query local SearXNG instance | `skills/searxng/` |
| searxng-browser-search | Browser-based SearXNG search | `skills/searxng-browser-search/` |

### Ansible-Deployed MCP Skills (CT 203)
- `prometheus-monitor` — Prometheus metrics and alerts
- `grafana-monitor` — Grafana dashboards and health
- `proxmox-admin` — Proxmox VM/CT management
- `ceph-operations` — Ceph storage operations
- `network-docs-search` — Network documentation search
- `user_context` — Per-user history tracking

---

## Security Considerations

### API Keys and Credentials
- Store API keys in environment variables, NOT in code
- Use `.env` files or secret management (not committed to git)
- Required env vars for failover probing:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_0`
  - `MINIMAX_API_KEY` / `MINIMAX_KEY`

### File Permissions
- Session stores should be `0o600` (readable only by owner)
- The `failover.js` script sets permissions atomically

### Private Data
- Do NOT load `MEMORY.md` in group chats (security/privacy)
- Do NOT exfiltrate private data
- Ask before sending emails, tweets, or public posts

### SSH and Remote Access
- SSH keys for 192.168.1.233 configured in `mcporter.json`
- Use SSH tunnels for MCP execution server

---

## Known Issues

1. **AiRanger JWT Expiration:** Tokens from browser sessions expire when used in sub-agent API calls. Playwright login scripts work around this but are fragile.

2. **Obsidian MCP Crash Loop (FIXED):** Was caused by reusing a single `McpServer` instance per SSE connection. Fixed via factory pattern (new instance per connection).

3. **Bootstrap File:** `BOOTSTRAP.md` can be deleted after initial setup is complete.

---

## Agent Behavior Guidelines

### Communication Style
- Be genuinely helpful, not performatively helpful
- Have opinions and personality
- Be resourceful before asking
- Remember you're a guest with access to someone's life

### Group Chat Behavior
- Respond when: directly mentioned, can add value, correcting misinformation
- Stay silent (HEARTBEAT_OK) when: casual banter, already answered, would just say "yeah"
- Use emoji reactions naturally (👍, ❤️, 😂, 🤔, ✅)

### External Actions
- **Ask first:** Sending emails, tweets, public posts, anything leaving the machine
- **Safe to do freely:** Read files, explore, organize, learn, search web

### Tool Usage
- Check `SKILL.md` files when using skills
- Keep local notes (SSH hosts, device names) in `TOOLS.md`
- Use voice for stories and "storytime" moments if TTS available

---

## Heartbeat vs Cron

**Use heartbeat when:**
- Multiple checks can batch together
- Need conversational context
- Timing can drift (~30 min is fine)
- Want to reduce API calls

**Use cron when:**
- Exact timing matters
- Task needs isolation from session history
- Want different model/thinking level
- One-shot reminders
- Output should deliver directly to channel

---

## Maintenance Tasks

### Periodic (every few days)
1. Review recent `memory/YYYY-MM-DD.md` files
2. Identify significant events worth keeping long-term
3. Update `MEMORY.md` with distilled learnings
4. Remove outdated info from MEMORY.md

### When to Reach Out
- Important email arrived
- Calendar event coming up (<2h)
- Something interesting found
- It's been >8h since last contact

### When to Stay Quiet (HEARTBEAT_OK)
- Late night (23:00-08:00) unless urgent
- Human is clearly busy
- Nothing new since last check
- Just checked <30 minutes ago

---

*This is a living document. Update it as the project evolves.*
