# Bug Report: Discord /status Shows Incorrect Model Name

**Date:** 2026-02-21  
**OpenClaw Version:** 2026.2.19-2 (45d9b20)  
**Severity:** Low (Display bug, doesn't affect functionality)

---

## Summary

The Discord `/status` command displays **"opus 4.6"** as the active model, but the actual runtime is using **"claude-sonnet-4-5"**. This is a model name display bug in the Discord integration.

---

## Expected Behavior

Discord `/status` command should display the **actual model currently in use** by the agent runtime.

**Expected output:**
```
Model: claude-sonnet-4-5
```

---

## Actual Behavior

Discord `/status` command shows **incorrect model name**.

**Actual output:**
```
Model: opus 4.6
```

---

## Evidence

### 1. Actual Runtime Model (via session_status tool)

```
🦞 OpenClaw 2026.2.19-2 (45d9b20)
🕒 Time: Saturday, February 21st, 2026 — 10:23 AM (America/Los_Angeles)
🧠 Model: anthropic/claude-sonnet-4-5 · 🔑 token sk-ant…kBRgAA (anthropic:default)
🧮 Tokens: 159 in / 5.1k out
📚 Context: 63k/200k (32%) · 🧹 Compactions: 0
🧵 Session: agent:main:main • updated 1m ago
⚙️ Runtime: direct · Think: off · elevated
🪢 Queue: collect (depth 0)
```

**Key line:** `🧠 Model: anthropic/claude-sonnet-4-5`

### 2. Runtime Metadata (from system prompt)

```
Runtime: agent=main | host=r430a | model=anthropic/claude-sonnet-4-5 | 
default_model=anthropic/claude-sonnet-4-5 | channel=discord
```

**Confirms:** Active model is `anthropic/claude-sonnet-4-5`

### 3. User Report

User executed `/status` in Discord DM and saw **"opus 4.6"** displayed, which does not match the actual runtime model.

---

## Configuration Context

### config.yaml
```yaml
agents:
  defaults:
    model:
      primary: "kimi-coding/k2p5"
      fallbacks:
        - "google/gemini-2.5-flash"
```

**Note:** Default primary is configured as `kimi-coding/k2p5`, but session is overridden to use `anthropic/claude-sonnet-4-5`.

### openclaw.json Model Definitions

```bash
$ grep "opus-4.6" ~/.openclaw/openclaw.json
"id": "claude-opus-4.6",
"name": "claude-opus-4.6",
```

**Finding:** `opus-4.6` is **defined as an available model** in the global config, but is **not the active model** for this session.

---

## Root Cause Analysis

### Hypothesis 1: Model ID Mapping Bug
Discord integration may be incorrectly translating `anthropic/claude-sonnet-4-5` to "opus 4.6" for display purposes.

**Evidence:**
- Runtime clearly shows `claude-sonnet-4-5`
- Discord shows `opus 4.6`
- No model override or switching occurred

### Hypothesis 2: Cached/Stale Model Info
Discord plugin may be caching model information that doesn't reflect the current session state.

**Evidence:**
- Session shows correct model
- Discord shows different model
- Suggests Discord is not reading current session metadata

### Hypothesis 3: Config File Mismatch
Discord integration may be reading from a different config file or using default model instead of session-specific override.

**Possible Issue:**
- Discord reads from `config.yaml` default (`kimi-coding/k2p5`)
- But somehow displays as "opus 4.6" (incorrect mapping?)
- Actual runtime uses per-session override (`claude-sonnet-4-5`)

---

## Steps to Reproduce

1. Start an OpenClaw session via Discord DM
2. Verify actual model via internal `session_status` tool
3. Execute `/status` command in Discord
4. Observe mismatch between displayed model and actual runtime model

---

## Environment

**OpenClaw:**
- Version: 2026.2.19-2 (45d9b20)
- Runtime: direct
- Host: r430a (Ubuntu 22.04 VM)
- Node: v22.22.0

**Discord Integration:**
- Channel: discord
- Capabilities: none
- Session: agent:main:main

**Actual Model:**
- Provider: Anthropic
- Model: claude-sonnet-4-5
- API Key: sk-ant…kBRgAA (anthropic:default)

**Displayed Model (Discord):**
- "opus 4.6" (incorrect)

---

## Impact

**Severity:** Low

**User Impact:**
- Confusing/misleading model information in Discord
- Users cannot trust `/status` output for model verification
- May lead to incorrect assumptions about capabilities/costs

**Functional Impact:**
- None — actual model selection works correctly
- Only the display/reporting is wrong

---

## Suggested Fix

### Option 1: Fix Model Name Resolution
Update Discord integration to properly resolve session model names:

```javascript
// Pseudo-code
function getDisplayModelName(session) {
  // Read from session.model, not config.defaults
  return session.currentModel || session.defaultModel;
}
```

### Option 2: Use Canonical Model IDs
Ensure Discord `/status` pulls model info from the same source as `session_status` tool:

```javascript
// Use the same model metadata source
const modelInfo = runtime.getSessionModel(sessionKey);
```

### Option 3: Add Model Verification
Include both configured and actual model in `/status`:

```
Configured: kimi-coding/k2p5
Active: anthropic/claude-sonnet-4-5
```

---

## Related Files

**OpenClaw Core:**
- `~/.openclaw/openclaw.json` — Global model definitions
- `~/.openclaw/workspace/config.yaml` — Agent defaults

**Discord Integration:**
- Source location unknown (not in workspace)
- Likely: OpenClaw core Discord plugin

**Session State:**
- Session: `agent:main:main`
- Model override: `anthropic/claude-sonnet-4-5`

---

## Logs

No error logs generated — this is a silent display bug.

**Session metadata is correct:**
```
🧠 Model: anthropic/claude-sonnet-4-5 · 🔑 token sk-ant…kBRgAA (anthropic:default)
```

**Discord display is wrong:**
```
Model: opus 4.6
```

---

## Workaround

**For Users:**
Use the `session_status` tool (via agent) to verify actual model instead of trusting Discord `/status` output.

**For Developers:**
Check session runtime metadata directly instead of relying on Discord integration display.

---

## Additional Notes

- This bug was discovered during MCP server troubleshooting session
- User noticed mismatch when comparing Discord output to session_status
- Other Discord `/status` fields (tokens, context, etc.) appear correct
- Only the model name field is affected

---

**Submitted by:** OpenClawA_rm (agent)  
**Reported by:** rm (synchronic1)  
**Session:** 2026-02-21 10:30 AM PST
