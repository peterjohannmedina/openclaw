---
title: "openclaw failover"
description: "Probe model availability and permanently switch the default or session model when a provider is unavailable."
---

# `openclaw failover`

Probe a prioritized list of provider/model candidates and permanently switch your active model when a provider is unavailable. Unlike the [runtime fallback system](#how-it-relates-to-the-runtime-fallback-system), which handles transient failures silently during live sessions, `openclaw failover` makes **durable config-level changes** — designed for recovery when a provider is permanently unavailable, the gateway is stopped, or you need to script failover across a fleet.

## Commands

```
openclaw failover default   Probe candidates and update the global default model
openclaw failover session   Probe candidates and apply a model override to a specific session
```

## How it relates to the runtime fallback system

OpenClaw has two independent layers of model resilience. Understanding both is important before using this command.

### Layer 1 — Runtime fallback (automatic, in-flight)

Every agent message turn passes through `runWithModelFallback`, which:

1. Reads `agents.defaults.model.fallbacks[]` from config
2. Attempts the primary model
3. On failure, retries each fallback candidate **within the same turn** — no message is lost
4. Tracks per-provider auth-profile cooldowns so failed providers are skipped for a configurable window
5. Writes `fallbackNoticeSelectedModel`, `fallbackNoticeActiveModel`, and `fallbackNoticeReason` to the session entry so users see a fallback notice
6. Does **not** persist `providerOverride` or `modelOverride` — the fallback is per-turn only; config is re-read fresh on the next turn

This layer is invisible to users and self-healing. It handles transient conditions: rate limits, momentary outages, auth hiccups.

### Layer 2 — `openclaw failover` (manual, persistent)

`openclaw failover` is an operator tool for **permanent recovery**. Use it when:

- A provider subscription has lapsed and the runtime system keeps hitting the dead provider
- You are rotating API keys and need to update config before restarting the gateway
- The gateway is stopped and you need to update config in advance of restart
- You are scripting model rotation across a fleet via cron or CI

### Parallel operation — no conflict by design

The two systems write to entirely different targets and cannot interfere with each other:

|                   | Runtime fallback                                   | `openclaw failover`                                                                                |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Writes**        | `fallbackNotice*` in session (transient, per-turn) | `agents.defaults.model.*` in config file; optionally `providerOverride`/`modelOverride` in session |
| **IO**            | Session lock via `updateSessionStoreEntry`         | `writeConfigFile` (atomic, 0o600) + session lock                                                   |
| **Config reads**  | Fresh at the start of every turn — never cached    | Once per invocation via `readConfigFileSnapshot`                                                   |
| **Gateway state** | Requires gateway running                           | Safe with gateway running or stopped                                                               |

Because `openclaw failover` writes config atomically and the runtime reads config fresh on every turn, a successful switch takes effect on the **very next message turn** with no restart required.

---

## Usage

### `openclaw failover default`

```
Options:
  -m, --models <list>    Comma-separated provider/model candidates in priority order (required)
                         e.g. anthropic/claude-sonnet-4-6,openai/gpt-4o
  -t, --timeout <ms>     Per-probe timeout in milliseconds (default: 5000)
  --demote               Move old primary to end of fallbacks[] instead of leaving it unchanged
  --reset-cooldown       Clear auth-profile cooldown timers for old provider after switching
  --dry-run              Print what would change without writing
  --json                 Output result as JSON
```

**Full recovery example**

```bash
# Probe two candidates; switch to first that responds,
# demote old primary into fallbacks, reset cooldown immediately
openclaw failover default \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o \
  --demote \
  --reset-cooldown
```

**Preview without writing**

```bash
openclaw failover default \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o \
  --demote --reset-cooldown --dry-run
```

### `openclaw failover session`

```
Options:
  -s, --session-key <key>  Session key to update (required)
  -m, --models <list>      Comma-separated provider/model candidates in priority order (required)
  -t, --timeout <ms>       Per-probe timeout in milliseconds (default: 5000)
  --dry-run                Print what would change without writing
```

```bash
openclaw failover session \
  --session-key "signal:+15550001234" \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o
```

---

## `--demote` and `--reset-cooldown`

### `--demote` — fallbacks[] reordering

Without `--demote`, switching the primary leaves the old primary in its current position in `fallbacks[]`. Correct when the failure is temporary and recovery is expected.

With `--demote`, the old primary moves to the **end** of `fallbacks[]`. It is not removed — it stays reachable as a last resort — but is deprioritized behind all other configured fallbacks.

```
Before:  primary=anthropic/claude-opus-4-6
         fallbacks=[openai/gpt-4o, anthropic/claude-sonnet-4-6]

After (openclaw failover default --models openai/gpt-4o --demote):
         primary=openai/gpt-4o
         fallbacks=[anthropic/claude-sonnet-4-6, anthropic/claude-opus-4-6]
```

### `--reset-cooldown` — runtime integration

After switching primary, the runtime fallback system still has cooldown timers active for the old provider. `--reset-cooldown` clears those timers so the runtime immediately reconsiders the old provider as a fallback candidate on the next turn rather than waiting for the cooldown window to expire. Use this when you have resolved the underlying issue (e.g. added new API keys) and want the old provider back in rotation right away.

---

## Known limitations and mitigations

The following limitations are documented to help operators understand when to use `openclaw failover` versus relying on the runtime fallback system, and how to mitigate each.

### 1 — HTTP probe and broken connections

**Limitation:** `openclaw failover` checks availability via lightweight HTTP model-list endpoints (`GET /v1/models/:model`). These endpoints confirm the model exists and the API key is authenticated, but do not exercise the inference path. A billing account with model-list access may still fail at inference if the account has exceeded its spending limit for that specific model tier, or if there is a broken connection at the inference proxy layer that does not affect the management API.

**Why the command is still the right tool here:** The alternative — sending a real inference request during a probe — would consume tokens, introduce latency, and could itself fail due to transient conditions. A model-list probe is the correct signal for "can I reach this provider with this key." For the residual cases where the probe succeeds but inference fails, the runtime fallback system handles them transparently on first use: the failed provider is marked in cooldown and the next fallback candidate is tried within the same turn.

**Mitigation:** After running `openclaw failover default`, send a test message and observe whether the runtime reports a fallback notice. If it does, the probe succeeded but inference did not — add a more reliable fallback behind the new primary.

---

### 2 — Cooldown state is a local snapshot

**Limitation:** The cooldown check reads the local auth-profile store snapshot at invocation time. If a cooldown has just expired but the in-memory runtime store has not been persisted yet, `openclaw failover` may report an active cooldown that has already cleared. Conversely, a provider that became rate-limited in the moments between the cooldown check and the HTTP probe may appear available.

**Why the command is still the right tool here:** Cooldown awareness in `openclaw failover` is a **filter, not a gate**. Its purpose is to immediately skip providers with permanent failures (auth revoked, billing lapsed) before wasting a probe request — these are the cases where you know switching is necessary. Transient cooldowns are reported as warnings but do not block the probe, because a rate-limited provider may have recovered since the cooldown was written.

**Mitigation:** For providers with transient cooldowns, `openclaw failover` will warn but still probe. If the probe succeeds, the switch proceeds. The runtime fallback system remains the ground truth for per-turn availability decisions.

---

### 3 — No inference-level broken connection detection

**Limitation:** Application-layer failures such as corporate proxy timeouts, SSL termination errors at the provider edge, or per-model inference quotas that differ from model-list quotas are invisible to a model-list probe. A provider could return 200 on the model-list endpoint and immediately fail on inference.

**Why the command is still the right tool here:** These failure modes are rare, provider-specific, and typically resolve without operator intervention. The runtime fallback system detects them on first inference attempt and automatically routes to the next fallback within the same turn. `openclaw failover` is the right tool for the common case (authentication, billing, deliberate provider rotation) — not for edge-case proxy infrastructure failures that the runtime already handles.

**Mitigation:** If you suspect inference-layer connectivity issues, use `--dry-run` to review the proposed change, then validate with a real message after switching. If inference fails on the new primary, the runtime will fall back automatically without data loss.

---

### 4 — Session store writes are lock-queued, not lock-free

**Limitation:** `openclaw failover session` uses `updateSessionStoreEntry`, which acquires the session store write lock. If the gateway is actively processing a message on the targeted session at the moment `failover session` runs, the write is queued until the lock is released — it does not fail, but it may be delayed by up to the duration of the active turn.

**Why the command is still the right tool here:** Lock-queuing is the correct behavior — it guarantees the write lands without corrupting the session store. A direct `writeFileSync` bypass (as used in pre-existing standalone scripts) would risk data loss if the gateway writes concurrently. The queue delay is bounded by a single turn duration, typically under 30 seconds.

**Mitigation:** For production use, prefer `openclaw failover default` over `openclaw failover session`. Updating the global default affects all sessions via config on the next turn and does not require taking a session-specific write lock. Use `failover session` only when you need to override a single session without affecting others, and prefer running it between active message turns.

---

## Automation

`openclaw failover default` is safe to run from cron or CI:

```bash
#!/usr/bin/env bash
# Nightly: probe candidates in order, switch to first available
openclaw failover default \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o,anthropic/claude-haiku-4-5 \
  --demote \
  --reset-cooldown \
  --timeout 8000 \
  && echo "Failover complete" \
  || echo "All candidates failed — manual intervention required"
```

**Exit codes**

| Code | Meaning                                           |
| ---- | ------------------------------------------------- |
| `0`  | Successful switch (or no change needed)           |
| `1`  | All candidates failed — config unchanged          |
| `2`  | Invalid arguments                                 |
| `3`  | Session key not found (`session` subcommand only) |
