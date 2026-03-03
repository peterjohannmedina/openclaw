# Subagent Provider Error Visibility

OpenClaw's heartbeat system provides a safety net for detecting subagent failures that occur between check-ins. This document explains how provider errors (cooldown, auth failures, rate limits) are surfaced and how to configure your system for maximum visibility.

## The Problem: Silent Failures During Long Heartbeat Intervals

By default, OpenClaw's heartbeat runs every 30 minutes (configurable). If a subagent fails immediately after spawn due to provider unavailability, the parent agent may not discover this failure until the next heartbeat — potentially hours later.

### Example Failure Scenario

```yaml
# Configuration with 60-minute heartbeat
agents:
  defaults:
    heartbeat:
      every: 60m

timeline:
  08:00: Main agent spawns subagent for "daily-report" (model: anthropic/claude-sonnet-4-6)
  08:01: Subagent first turn fails — anthropic provider in cooldown
  08:01: ❌ Without visibility fix: Error logged but parent unaware
  09:00: Other work continues, parent assumes task running
  ...
  14:00: FINALLY: Heartbeat discovers failed subagent (6 hours late!)
```

## The Solution: System Event Integration

As of the visibility fix, subagent provider errors automatically enqueue system events that are surfaced by the heartbeat. This provides two layers of protection:

### Layer 1: Immediate Error Events

When a subagent fails due to provider error, a system event is enqueued:

```
[system] Subagent failed (model: anthropic/claude-sonnet-4-6): [provider cooldown] Generate daily sales report...
```

This event is picked up by the next heartbeat check, ensuring the failure is surfaced even if the parent session is inactive.

### Layer 2: Heartbeat Safety Net

The heartbeat runner checks for pending system events during each interval. If subagent errors are found, they are included in the heartbeat payload.

## Error Classification

Provider errors are classified into categories for actionable alerting:

| Category     | Trigger Keywords                  | Recommended Action                                 |
| ------------ | --------------------------------- | -------------------------------------------------- |
| `cooldown`   | "cooldown", "unavailable"         | Wait for cooldown expiry; consider fallback models |
| `auth`       | "auth", "api key", "credential"   | Check credentials with `openclaw auth status`      |
| `rate_limit` | "rate limit", "too many requests" | Reduce request frequency; upgrade provider tier    |
| `unknown`    | (none matched)                    | Investigate error details in logs                  |

## Configuration Recommendations

### For Critical Tasks

Use shorter heartbeat intervals for agents that spawn critical subagents:

```yaml
# agents/critical-tasks.yaml
id: critical-tasks
heartbeat:
  every: 5m # Fast detection of provider failures
  prompt: |
    Check for any failed subagent tasks and retry with fallbacks if needed.
subagents:
  model: openai/gpt-4o # Reliable fallback
  allowAgents:
    - "*"
```

### For Batch Processing

Longer intervals are acceptable if you enable completion messages:

```yaml
# Batch processing with error visibility
agents:
  defaults:
    subagents:
      expectsCompletionMessage: true # Ensures errors are announced
    heartbeat:
      every: 30m
      prompt: |
        Review any failed subagent tasks from the batch queue.
```

### Provider Fallback Configuration

Configure multiple providers to reduce cooldown impact:

```yaml
models:
  defaults:
    model: anthropic/claude-sonnet-4-6
    fallbacks:
      - openai/gpt-4o
      - google/gemini-1.5-pro
```

## Debugging Provider Errors

### Check Subagent Status

```bash
# List active subagent runs
openclaw sessions list --filter subagent

# Check specific subagent outcome
openclaw sessions history agent:main:subagent:uuid-here
```

### View System Events

System events are ephemeral (not persisted). Check them via heartbeat logs:

```bash
# Follow heartbeat logs
openclaw logs --follow --filter heartbeat

# Look for provider error patterns
grep "provider cooldown\|auth failed\|rate limited" ~/.openclaw/logs/gateway.log
```

### Verify Error Classification

The subagent registry logs classified errors:

```
[subagent] Run abc-123 failed with provider error: cooldown
[subagent] Enqueued system event for heartbeat visibility
```

## Failure Mode Examples

### Example 1: Complete Provider Exhaustion

```
Attempt 1: anthropic/claude-sonnet-4-6 → cooldown
Attempt 2: openai/gpt-4o → rate limited
Attempt 3: google/gemini-1.5-pro → auth failed

Result: Subagent fails with structured error report
System Event: "Subagent failed (model: anthropic/claude-sonnet-4-6): [provider cooldown] Analyze Q3 metrics..."
```

### Example 2: Intermittent Rate Limiting

```
09:00: Spawn subagent for hourly sync
09:01: Rate limited by OpenAI
09:01: System event enqueued
09:05: Heartbeat runs, surfaces rate limit
09:06: Parent agent retries with fallback model
09:07: Task completes successfully
```

### Example 3: Auth Credential Expiry

```
14:00: Spawn subagent with anthropic/claude-3-opus
14:01: Auth failed (API key expired)
14:01: System event: "[auth failed] Generate executive summary..."
14:30: Heartbeat alerts: "1 subagent auth failure detected"
14:31: Operator refreshes credentials via `openclaw auth`
14:32: Retry succeeds
```

## Implementation Details

### Code Flow

```
subagent spawn
    ↓
runWithModelFallback
    ↓
Provider in cooldown / auth failed / rate limited
    ↓
Error captured in run outcome
    ↓
completeSubagentRun
    ↓
emitSubagentEndedHookForRun
    ↓
classifyProviderError(error)
    ↓
buildSubagentErrorSystemEvent()
    ↓
enqueueSystemEvent() → Session queue
    ↓
[next heartbeat]
    ↓
peekSystemEventEntries() → Error surfaced
```

### Key Functions

- `classifyProviderError()` — Categorizes error messages
- `buildSubagentErrorSystemEvent()` — Formats human-readable event
- `enqueueSystemEvent()` — Adds to session's event queue
- Heartbeat runner's `peekSystemEventEntries()` — Consumes events

## Related Documentation

- [Heartbeat Configuration](/agents/heartbeat)
- [Model Fallback](/agents/model-fallback)
- [Auth Profiles](/cli/auth)
- [Subagent Spawning](/agents/subagents)
