# MCP Server Investigation - 2026-02-21

## Issue
Both MCP servers showing offline in `mcporter list`:
- `mcp-execution-server` — SSH-based execution on pver430
- `second-brain` — Obsidian MCP + Redis on CT 203

## Findings

### 1. mcp-execution-server (pver430 @ 192.168.1.233)
**Status:** ❌ Offline  
**Root Cause:** SSH authentication failure

**Details:**
- Uses SSH command to connect to pver430
- Requires SSH key authentication for user `rm@192.168.1.233`
- No SSH keys currently configured on r430a

**Test Result:**
```bash
$ ssh rm@192.168.1.233 'echo "SSH OK"'
rm@192.168.1.233: Permission denied (publickey,password).
```

**Resolution Required:**
1. Generate SSH key pair on r430a (current host)
2. Add public key to pver430's authorized_keys for user `rm`
3. Test SSH connection
4. Retry mcporter list

---

### 2. second-brain (Obsidian MCP)
**Status:** ⚠️ Partially Working  
**Root Cause:** SSE connection timeout

**Infrastructure:** CT 203 @ 192.168.1.203

**CT 203 (192.168.1.203:3010):**
- ✅ Health endpoint: `{"status":"healthy"}`
- ✅ SSE endpoint exists: Returns 307 redirect /sse → /sse/
- ❌ mcporter times out after 30s waiting for MCP handshake
- **Possible Issue:** Server not sending expected MCP protocol messages or needs authentication

**mcporter Config:**
```json
"second-brain": {
  "baseUrl": "http://192.168.1.203:3010/sse/"
}
```

**Possible Missing Config:**
May need authentication headers (JWT token) per architecture docs.

---

## Network Status

| Host | IP | Port | Ping | Health | Notes |
|------|-----|------|------|--------|-------|
| CT 203 | 192.168.1.203 | 3010 | ✅ 0.1ms | ✅ healthy | SSE times out |
| pver430 | 192.168.1.233 | SSH | ✅ | ❌ auth | Need SSH keys |

---

## Next Steps

### Immediate (High Priority)
1. **SSH Access for mcp-execution-server:**
   - Generate SSH keypair on r430a
   - Deploy public key to pver430
   - Test SSH connection

2. **SSE Protocol Issue (CT 203):**
   - Check if Obsidian MCP server is properly implementing MCP-over-SSE
   - Verify server is sending `initialize` and tool list messages
   - May need authentication headers (JWT token)

3. **Verify Docker Services:**
   - Confirm all MCP services running on CT 203
   - Check container logs for errors

### Investigation Commands

#### Check Docker on CT 203
```bash
ssh root@192.168.1.203 'docker ps'
ssh root@192.168.1.203 'docker logs obsidian-mcp'
```

#### Test SSE Connection Manually
```bash
curl -N -H "Accept: text/event-stream" http://192.168.1.203:3010/sse/
```

---

## Confirmed Architecture

**CT 203 @ 192.168.1.203:**
- Obsidian MCP server
- Redis semantic cache
- second-brain MCP skills
- All MCP services consolidated here
