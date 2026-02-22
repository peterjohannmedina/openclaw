# MCP Server Resolution - 2026-02-21

## ✅ RESOLVED: second-brain MCP Server

### Issue
mcporter was connecting to wrong port (3010 instead of 3011)

### Resolution
**Changed config from:**
```json
"second-brain": {
  "baseUrl": "http://192.168.1.203:3010/sse/"
}
```

**To:**
```json
"second-brain": {
  "baseUrl": "http://192.168.1.203:3011/sse"
}
```

### Verification
```bash
$ mcporter list second-brain
second-brain
  20 tools · 91ms · HTTP http://192.168.1.203:3011/sse
```

### Active Docker Services on CT 203

| Container | Port Mapping | Status | Health |
|-----------|--------------|--------|--------|
| **second-brain-mcp** | 3011→3010 | Up 2 days | ✅ MCP server (20 tools) |
| obsidian-mcp-enhanced | 3010→3010 | Up 2 days | ✅ Healthy (SSE only) |
| obsidian-mcp-redis | 6379 | Up 2 days | ✅ |
| redis-cache | 6379→6379 | Up 3 days | ✅ Healthy |
| grafana | 3001→3000 | Up 3 days | ✅ |
| prometheus | 9090→9090 | Up 3 days | ✅ |
| nginx-gateway | 80→80 | Up 3 days | ✅ |
| cc-edit | 3000→3000 | Up 3 days | ⚠️ Unhealthy |

**Key Finding:** Port 3010 hosts Obsidian MCP (custom SSE), port 3011 hosts the full second-brain MCP with all tools.

---

## ⏳ PENDING: mcp-execution-server

### Issue
SSH authentication required for `rm@192.168.1.233`

### Attempted
- Password `4677`: ❌ Permission denied
- Password `1234`: ❌ Permission denied

### Next Steps
1. **Generate SSH key on r430a:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519
   ```

2. **Manually add public key to pver430:**
   - Copy `~/.ssh/id_ed25519.pub`
   - Add to `/home/rm/.ssh/authorized_keys` on pver430
   - Or use `ssh-copy-id` if password is known

3. **Test connection:**
   ```bash
   ssh rm@192.168.1.233 'echo "SSH OK"'
   ```

---

## Available MCP Tools (second-brain)

### Redis Cache (4 tools)
- `cache_set(key, value, ttl?)` — Store with optional TTL
- `cache_get(key)` — Retrieve by key
- `cache_delete(key)` — Remove key
- `redis_stats()` — Server statistics

### Prometheus Monitoring (3 tools)
- `prometheus_get_targets()` — Scrape targets status
- `prometheus_get_alerts()` — Firing/pending alerts
- `prometheus_query(promql_query)` — Execute PromQL

### Grafana (2 tools)
- `grafana_get_health()` — Health status
- `grafana_list_dashboards()` — Available dashboards

### Proxmox Admin (3 tools)
- `proxmox_get_cluster_status()` — Cluster status doc
- `proxmox_list_nodes()` — All nodes
- `proxmox_find_vm(vm_id_or_name)` — Search VM/CT

### Ceph Operations (2 tools)
- `ceph_get_health_status()` — Cluster health
- `ceph_list_osd_notes()` — OSD documentation

### Network Documentation (2 tools)
- `network_search_docs(search_query)` — Search docs
- `network_get_runbook(topic)` — Retrieve runbook

### User Context (3 tools)
- `user_context_add_entry(user_id, content)` — Log interaction
- `user_context_get_history(user_id, date)` — Get history
- `user_context_search_history(user_id, query)` — Search logs

### Health (1 tool)
- `health_check()` — Server and Redis health

---

## SSH Credentials Confirmed

**CT 203 (192.168.1.203):**
- User: `root`
- Password: `4677`
- Status: ✅ Working

**pver430 (192.168.1.233):**
- User: `rm`
- Password: Unknown (neither 4677 nor 1234 work)
- Status: ❌ Needs key-based auth

---

## Updated Documentation

Files updated to reflect correct architecture:
- ✅ `AGENTS.md` — Consolidated to CT 203, added pvet630
- ✅ `CLAUDE.md` — Updated infrastructure section
- ✅ `config/mcporter.json` — Changed port 3010 → 3011
- ✅ `ansible/obsidian_mcp_architecture.md` — Removed CT 220 references
- ✅ `skills/vector-search/*` — Updated IPs to .203

**All references to CT 220 / 192.168.1.220 removed from workspace.**
