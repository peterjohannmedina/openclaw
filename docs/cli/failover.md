---
title: "openclaw failover"
description: "Probe model availability and permanently switch the default or session model when a provider is unavailable."
---

# `openclaw failover`

Probe a prioritized list of provider/model candidates and switch the active model when your primary is unavailable. Unlike the runtime fallback system, which handles transient failures automatically during live sessions, `openclaw failover` makes **permanent config-level changes** designed for recovery when the gateway is stopped or a provider is permanently unavailable.

## Commands

```
openclaw failover default   Probe candidates and update the global default model
openclaw failover session   Probe candidates and apply a model override to a session
```

## How it relates to the runtime fallback system

OpenClaw has two independent layers of model resilience. Understanding both is essential before using this command.

### Layer 1 — Runtime fallback (automatic)

Every agent message turn passes through `runWithModelFallback`, which:

1. Reads your configured `agents.defaults.model.fallbacks[]` list
2. Attempts the primary model
3. On failure (rate limit, auth error, timeout), immediately retries with the next fallback candidate **within the same turn** — no message is lost
4. Tracks per-provider auth-profile cooldowns so failed providers are skipped for a configurable window rather than hammered continuously
5. Writes `fallbackNoticeSelectedModel`, `fallbackNoticeActiveModel`, and `fallbackNoticeReason` to the session entry so users see a notice that a fallback is active
6. Does **not** persist `providerOverride` or `modelOverride` — the fallback is per-turn only; config is re-read fresh on the next turn

This layer is invisible to the user and self-healing. It handles transient conditions — rate limits, temporary provider outages, short-lived auth hiccups.

### Layer 2 — `openclaw failover` (manual)

`openclaw failover` is an operator tool for **permanent recovery**. Use it when:

- A provider subscription has lapsed (billing error) and the runtime system keeps hitting it
- You are rotating API keys and need to switch the default before restarting the gateway
- The gateway is stopped and you need to update config in advance of a restart
- You are scripting failover across a fleet of machines via cron or CI

It operates on the stored config file and session store directly — not on an in-flight message turn.

### Parallel operation — no conflict by design

The two layers do not share mutable state, so they cannot interfere with each other:

|                    | Runtime fallback                                                                | `openclaw failover`                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **What it reads**  | `agents.defaults.model.primary` + `fallbacks[]` at turn start                   | Same config file, via `readConfigFileSnapshot`                                                                                         |
| **What it writes** | `fallbackNotice*` fields in session entry (per-turn)                            | `agents.defaults.model.primary` + optionally `fallbacks[]` in config; optionally `providerOverride` / `modelOverride` in session entry |
| **Locking**        | Config is read-only per turn; session writes use `updateSessionStoreEntry` lock | `writeConfigFile` (atomic); `updateSessionStoreEntry` (lock-safe)                                                                      |
| **Timing**         | While gateway is running                                                        | Safe to run while gateway is running or stopped                                                                                        |

Because `openclaw failover` writes config atomically and the runtime reads config fresh on every turn, the change takes effect on the **next message turn** with no restart required.

The `--reset-cooldown` flag additionally clears auth-profile cooldown timers for the old provider, ensuring the runtime system probes the new primary immediately rather than waiting out the previous cooldown window.

---

## Usage

### `openclaw failover default`

```
openclaw failover default [options]

Options:
  -m, --models <list>    Comma-separated provider/model candidates in priority order (required)
  -t, --timeout <ms>     Per-probe timeout in milliseconds (default: 5000)
  --demote               Move old primary to end of fallbacks[] instead of leaving it in place
  --reset-cooldown       Clear auth-profile cooldown timers for old provider on successful switch
  --dry-run              Print what would change without writing
  --json                 Output result as JSON
```

**Examples**

```bash
# Probe two candidates; switch to first that responds
openclaw failover default --models anthropic/claude-sonnet-4-6,openai/gpt-4o

# Full recovery: switch primary, demote old primary to fallbacks, reset cooldown
openclaw failover default \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o \
  --demote \
  --reset-cooldown

# Preview without writing
openclaw failover default \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o \
  --demote --reset-cooldown --dry-run
```

### `openclaw failover session`

```
openclaw failover session [options]

Options:
  -s, --session-key <key>  Session key to update (required)
  -m, --models <list>      Comma-separated provider/model candidates in priority order (required)
  -t, --timeout <ms>       Per-probe timeout in milliseconds (default: 5000)
  --dry-run                Print what would change without writing
  --json                   Output result as JSON
```

**Examples**

```bash
# Switch a specific session to the first available candidate
openclaw failover session \
  --session-key "signal:+15550001234" \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o

# Dry run first
openclaw failover session \
  --session-key "signal:+15550001234" \
  --models anthropic/claude-sonnet-4-6 \
  --dry-run
```

---

## `--demote` — fallbacks[] demotion

Without `--demote`, switching the primary leaves the old primary **in its current position** in `fallbacks[]`. This is correct when the failure is temporary and you expect the old model to recover.

With `--demote`, the old primary is moved to the **end** of `fallbacks[]`. It is not deleted — it remains reachable as a last resort if all higher-priority candidates also fail. Use this when you have low confidence the old primary will recover soon but want to retain it as a safety net.

```
Before:  primary=anthropic/claude-opus-4-6, fallbacks=[openai/gpt-4o, anthropic/claude-sonnet-4-6]
After (--demote, switching to openai/gpt-4o):
         primary=openai/gpt-4o, fallbacks=[anthropic/claude-sonnet-4-6, anthropic/claude-opus-4-6]
```

## `--reset-cooldown` — cooldown integration

The runtime fallback system tracks auth-profile cooldowns per provider. After `openclaw failover` switches the primary to a different provider, the old provider's cooldown timer remains active. On the next message turn, the runtime will skip the old provider as a fallback candidate until the cooldown expires — which is generally desirable.

If you want the runtime to immediately reconsider the old provider (for example, you have resolved the underlying issue and added new API keys), pass `--reset-cooldown`. This clears all cooldown timers for the old provider's auth profiles so they are eligible again on the next turn.

---

## Known limitations

### 1 — Probe ≠ inference success

`openclaw failover` checks availability via lightweight HTTP model-list endpoints (`GET /v1/models/:model`). A 200 response from this endpoint confirms the model exists and the API key is valid, but does **not** confirm that an inference request will succeed. A billing account with model-list access may still fail on inference if the account has exceeded spending limits on that specific model tier.

**Mitigation:** The runtime fallback system will handle this transparently if it occurs — it tests with real inference requests and will continue down the fallbacks list if the switched-to model fails on first use.

### 2 — Cooldown state is not probed, only read

The cooldown check reads the local auth-profile store snapshot. If a provider's cooldown has just expired but the store has not been updated yet, `openclaw failover` may report a cooldown that no longer applies. Conversely, it may probe a provider that is genuinely still rate-limited.

**Mitigation:** Transient cooldowns are treated as non-blocking — the command warns but probes anyway. Only permanent failures (auth, billing) cause candidates to be skipped outright.

### 3 — No inference-level broken connection detection

`openclaw failover` cannot detect application-layer failures such as proxy timeouts, SSL termination errors at the provider edge, or model-specific inference quotas. These failures are invisible to a model-list probe and will only surface when the runtime fallback system attempts a real inference request.

**Mitigation:** Use `--dry-run` to review what would change, then validate with a real message after switching. If the switched-to model fails on inference, the runtime fallback system will automatically try the next candidate in `fallbacks[]`.

### 4 — Session store writes require the gateway to be idle or using the write lock

`openclaw failover session` uses `updateSessionStoreEntry`, which acquires the session store write lock. If the gateway is actively processing a message on the same session simultaneously, the write will be queued until the lock is released. This is safe but may introduce a brief delay.

**Recommendation:** For session-level switches, prefer running `openclaw failover session` between active message turns, or use `openclaw failover default` to affect all sessions via the global config rather than patching individual session entries.

---

## Automation and scripting

`openclaw failover default` is designed to be safe to run from cron or CI:

```bash
#!/usr/bin/env bash
# Example: nightly failover check — switch to first available model
openclaw failover default \
  --models anthropic/claude-sonnet-4-6,openai/gpt-4o,anthropic/claude-haiku-4-5 \
  --demote \
  --reset-cooldown \
  --timeout 8000

if [ $? -eq 0 ]; then
  echo "Failover complete"
else
  echo "All candidates failed — manual intervention required"
fi
```

Exit codes:

- `0` — successful switch (or no change needed)
- `1` — all candidates failed
- `2` — invalid arguments
- `3` — session key not found (session subcommand only)
