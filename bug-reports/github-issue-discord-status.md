## Discord `/status` Displays Incorrect Model Name

**Environment:**
- OpenClaw Version: 2026.2.19-2 (45d9b20)
- Channel: Discord DM
- Runtime: direct
- OS: Ubuntu 22.04

---

### Description

The Discord `/status` command shows **"opus 4.6"** as the active model, but the actual runtime is using **"claude-sonnet-4-5"**. This creates confusion for users trying to verify which model is processing their requests.

---

### Expected Behavior

`/status` should display the **actual model currently in use** by the agent runtime.

Expected:
```
Model: claude-sonnet-4-5
```

---

### Actual Behavior

`/status` shows an incorrect model name.

Actual:
```
Model: opus 4.6
```

---

### Evidence

**Actual Runtime (via `session_status` tool):**
```
🧠 Model: anthropic/claude-sonnet-4-5 · 🔑 token sk-ant…kBRgAA (anthropic:default)
```

**Runtime metadata:**
```
model=anthropic/claude-sonnet-4-5 | default_model=anthropic/claude-sonnet-4-5
```

**Discord display:** Shows "opus 4.6" (does not match runtime)

---

### Root Cause

Discord integration appears to be displaying model information from a different source than the actual session runtime. Possible causes:

1. **Model ID mapping bug** — Incorrectly translating `anthropic/claude-sonnet-4-5` → "opus 4.6"
2. **Stale cache** — Discord plugin caching model info that doesn't reflect current session
3. **Config mismatch** — Reading from default config instead of per-session override

---

### Steps to Reproduce

1. Start OpenClaw session via Discord DM
2. Verify actual model via agent's `session_status` tool
3. Execute `/status` command in Discord
4. Observe mismatch between displayed model and actual runtime model

---

### Impact

**Severity:** Low (display-only bug, doesn't affect functionality)

**User Impact:**
- Misleading model information
- Users cannot trust `/status` for model verification
- May lead to incorrect assumptions about capabilities/costs

**Functional Impact:** None — model selection works correctly, only reporting is wrong

---

### Suggested Fixes

**Option 1:** Update Discord integration to read model from session runtime metadata (same source as `session_status`)

**Option 2:** Display both configured default and active model:
```
Configured: kimi-coding/k2p5
Active: anthropic/claude-sonnet-4-5
```

**Option 3:** Add model verification check that alerts if Discord display differs from runtime

---

### Workaround

Users can verify the actual model by asking the agent to run `session_status` tool, which shows accurate runtime information.

---

### Additional Context

- Discovered during MCP server troubleshooting
- Other `/status` fields (tokens, context) appear correct
- Only model name is affected
- `openclaw.json` does define "opus-4.6" as an available model, but it's not active

**Full bug report:** [Attached: discord-status-model-mismatch.md]
