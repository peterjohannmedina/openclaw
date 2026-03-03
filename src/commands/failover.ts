import {
  clearAuthProfileCooldown,
  ensureAuthProfileStore,
  isProfileInCooldown,
  resolveAuthProfileOrder,
  resolveProfilesUnavailableReason,
} from "../agents/auth-profiles.js";
import { parseModelRef } from "../agents/model-selection.js";
import { readConfigFileSnapshot, writeConfigFile } from "../config/config.js";
import {
  resolveAgentModelFallbackValues,
  resolveAgentModelPrimaryValue,
  toAgentModelListLike,
} from "../config/model-input.js";
import { resolveStorePath } from "../config/sessions/paths.js";
import { updateSessionStoreEntry } from "../config/sessions/store.js";
import type { SessionEntry } from "../config/sessions/types.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { applyModelOverrideToSessionEntry } from "../sessions/model-overrides.js";
import { theme } from "../terminal/theme.js";
import { applyDefaultModelPrimaryUpdate, mergePrimaryFallbackConfig } from "./models/shared.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type FailoverProbeResult =
  | { ok: true; provider: string; model: string; latencyMs: number }
  | { ok: false; provider: string; model: string; reason: string };

export type FailoverCommandOptions = {
  models: string;
  sessionKey?: string;
  timeout?: number;
  dryRun?: boolean;
  demote?: boolean;
  resetCooldown?: boolean;
  json?: boolean;
};

// ── Probe logic ──────────────────────────────────────────────────────────────

/**
 * Probe a single provider/model pair for availability via lightweight HTTP
 * model-list endpoints. Distinguishes auth (401/403), model_not_found (404),
 * rate_limit (429), and timeout from generic failure.
 */
export async function probeModel(
  provider: string,
  model: string,
  timeoutMs = 5000,
): Promise<FailoverProbeResult> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const start = Date.now();

  try {
    const p = provider.toLowerCase();

    if (p === "openai") {
      const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY_0;
      if (!key) {
        return { ok: false, provider, model, reason: "no key: OPENAI_API_KEY" };
      }
      const res = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
        signal: ac.signal,
        headers: { Authorization: `Bearer ${key}` },
      });
      return mapHttpResult(res, provider, model, start);
    }

    if (p === "anthropic") {
      const key = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_0;
      if (!key) {
        return { ok: false, provider, model, reason: "no key: ANTHROPIC_API_KEY" };
      }
      const res = await fetch(`https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`, {
        signal: ac.signal,
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      });
      return mapHttpResult(res, provider, model, start);
    }

    if (p === "google" || p === "gemini") {
      const key =
        process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY_0;
      if (!key) {
        return { ok: false, provider, model, reason: "no key: GOOGLE_API_KEY" };
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}?key=${key}`,
        { signal: ac.signal },
      );
      return mapHttpResult(res, provider, model, start);
    }

    // CLI-backed providers — no HTTP probe needed, assume available
    if (p.endsWith("-cli") || p === "claude-cli" || p === "codex-cli" || p === "gemini-cli") {
      return { ok: true, provider, model, latencyMs: 0 };
    }

    // Generic: check for <PROVIDER>_API_KEY env var
    const envKey =
      process.env[`${p.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`] ??
      process.env[`${p.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY_0`];
    return envKey
      ? { ok: true, provider, model, latencyMs: 0 }
      : { ok: false, provider, model, reason: `no key: ${p.toUpperCase()}_API_KEY` };
  } catch (err) {
    const isAbort =
      err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
    return {
      ok: false,
      provider,
      model,
      reason: isAbort ? "timeout" : String(err instanceof Error ? err.message : err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function mapHttpResult(
  res: Response,
  provider: string,
  model: string,
  start: number,
): FailoverProbeResult {
  if (res.ok) {
    return { ok: true, provider, model, latencyMs: Date.now() - start };
  }
  if (res.status === 404) {
    return { ok: false, provider, model, reason: "model_not_found (HTTP 404)" };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, provider, model, reason: `auth (HTTP ${res.status})` };
  }
  if (res.status === 429) {
    return { ok: false, provider, model, reason: "rate_limit (HTTP 429)" };
  }
  return { ok: false, provider, model, reason: `HTTP ${res.status}` };
}

// ── Candidate parsing ─────────────────────────────────────────────────────────

export function parseCandidates(raw: string): Array<{ provider: string; model: string }> {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseModelRef(s))
    .filter(
      (r): r is { provider: string; model: string } =>
        r !== null && Boolean(r.provider) && Boolean(r.model),
    );
}

// ── Cooldown awareness ────────────────────────────────────────────────────────

type CooldownStatus =
  | { inCooldown: false }
  | { inCooldown: true; reason: string; profileIds: string[] };

/**
 * Check the auth-profile cooldown state for a given provider.
 * This uses the same store and profile resolution as runWithModelFallback.
 */
function checkCooldownStatus(
  provider: string,
  cfg: Awaited<ReturnType<typeof readConfigFileSnapshot>>["parsed"],
): CooldownStatus {
  try {
    const store = ensureAuthProfileStore(undefined, { allowKeychainPrompt: false });
    const profileIds = resolveAuthProfileOrder({ cfg, store, provider });
    if (profileIds.length === 0) {
      return { inCooldown: false };
    }

    const unavailableIds = profileIds.filter((id) => isProfileInCooldown(store, id));
    if (unavailableIds.length < profileIds.length) {
      return { inCooldown: false };
    }

    const reason =
      resolveProfilesUnavailableReason({ store, profileIds, now: Date.now() }) ?? "rate_limit";
    return { inCooldown: true, reason, profileIds };
  } catch {
    // If auth store is unavailable, don't block failover
    return { inCooldown: false };
  }
}

/**
 * Clear cooldown timers for all profiles of a given provider, so the runtime
 * fallback system immediately tries the new primary on next message turn
 * rather than waiting out the previous cooldown window.
 */
async function resetProviderCooldown(
  provider: string,
  cfg: Awaited<ReturnType<typeof readConfigFileSnapshot>>["parsed"],
): Promise<string[]> {
  try {
    const store = ensureAuthProfileStore(undefined, { allowKeychainPrompt: false });
    const profileIds = resolveAuthProfileOrder({ cfg, store, provider });
    const cleared: string[] = [];
    for (const profileId of profileIds) {
      if (isProfileInCooldown(store, profileId)) {
        await clearAuthProfileCooldown({ store, profileId });
        cleared.push(profileId);
      }
    }
    return cleared;
  } catch {
    return [];
  }
}

// ── Fallbacks demotion ────────────────────────────────────────────────────────

/**
 * Demote the old primary to the END of the fallbacks list (not removed — keeps
 * it reachable if the new primary also fails later), and ensure the winning
 * candidate is removed from fallbacks (it is now primary).
 */
function applyFallbackDemotion(params: {
  cfg: Awaited<ReturnType<typeof readConfigFileSnapshot>>["parsed"];
  oldPrimary: string;
  newPrimary: string;
}): Awaited<ReturnType<typeof readConfigFileSnapshot>>["parsed"] {
  const cfg = params.cfg;
  const existing = toAgentModelListLike(cfg.agents?.defaults?.model);
  const currentFallbacks = resolveAgentModelFallbackValues(cfg.agents?.defaults?.model);

  // Remove new primary from fallbacks (it's becoming primary)
  // Move old primary to end of fallbacks (demoted but not deleted)
  const filtered = currentFallbacks.filter((f) => f !== params.newPrimary);
  const withDemoted = filtered.includes(params.oldPrimary)
    ? filtered // Already in fallbacks, leave in place
    : [...filtered, params.oldPrimary];

  const updatedModelConfig = mergePrimaryFallbackConfig(existing, {
    fallbacks: withDemoted,
  });

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        model: updatedModelConfig,
      },
    },
  };
}

// ── Default model failover ────────────────────────────────────────────────────

export async function failoverDefaultModel(
  opts: FailoverCommandOptions,
  runtime: RuntimeEnv,
): Promise<void> {
  const candidates = parseCandidates(opts.models);
  if (candidates.length === 0) {
    runtime.log(
      theme.error(
        "No valid provider/model candidates (use --models openai/gpt-4o,anthropic/claude-opus-4-6)",
      ),
    );
    process.exit(2);
  }

  const timeoutMs = opts.timeout ?? 5000;
  const snapshot = await readConfigFileSnapshot();
  const cfg = snapshot.parsed;

  const currentPrimary = resolveAgentModelPrimaryValue(cfg.agents?.defaults?.model);

  runtime.log(
    `Probing ${candidates.length} candidate(s) for default model (timeout=${timeoutMs}ms)${opts.dryRun ? " [dry-run]" : ""}`,
  );
  if (currentPrimary) {
    runtime.log(`  Current primary: ${theme.muted(currentPrimary)}`);
  }

  for (const cand of candidates) {
    const label = `${cand.provider}/${cand.model}`;

    // Check cooldown state before probing
    const cooldown = checkCooldownStatus(cand.provider, cfg);
    if (cooldown.inCooldown) {
      const isPermanent =
        cooldown.reason === "auth" ||
        cooldown.reason === "auth_permanent" ||
        cooldown.reason === "billing";
      process.stdout.write(`  ${label} ... ${theme.warn("cooldown")} (${cooldown.reason})`);
      if (isPermanent) {
        process.stdout.write(` — skipping (permanent ${cooldown.reason} issue)\n`);
        continue;
      }
      process.stdout.write(` — probing anyway\n`);
    }

    process.stdout.write(`  ${label} ... `);
    const result = await probeModel(cand.provider, cand.model, timeoutMs);

    if (!result.ok) {
      process.stdout.write(`${theme.error("failed")} (${result.reason})\n`);
      continue;
    }

    process.stdout.write(`${theme.success("ok")} (${result.latencyMs}ms)\n`);

    if (opts.dryRun) {
      runtime.log(`[dry-run] Would set default model → ${label}`);
      if (opts.demote && currentPrimary && currentPrimary !== label) {
        runtime.log(`[dry-run] Would demote ${currentPrimary} → fallbacks[]`);
      }
      if (opts.resetCooldown && currentPrimary) {
        const oldProvider = currentPrimary.split("/")[0];
        runtime.log(`[dry-run] Would reset cooldown for provider: ${oldProvider}`);
      }
      return;
    }

    // Apply: update primary
    let nextCfg = { ...cfg };
    const modelRaw = label;
    applyDefaultModelPrimaryUpdate({ cfg: nextCfg, modelRaw, field: "model" });

    // Demote old primary into fallbacks[]
    if (opts.demote && currentPrimary && currentPrimary !== label) {
      nextCfg = applyFallbackDemotion({
        cfg: nextCfg,
        oldPrimary: currentPrimary,
        newPrimary: label,
      });
      runtime.log(`  ${theme.muted(`Demoted ${currentPrimary} → fallbacks[]`)}`);
    }

    await writeConfigFile(nextCfg);
    runtime.log(`${theme.success("✓")} Default model updated → ${label}`);

    // Reset old provider cooldown so runtime picks up new primary immediately
    if (opts.resetCooldown && currentPrimary) {
      const oldProvider = currentPrimary.split("/")[0];
      if (oldProvider !== cand.provider) {
        const cleared = await resetProviderCooldown(oldProvider, cfg);
        if (cleared.length > 0) {
          runtime.log(
            `  ${theme.muted(`Cleared cooldown for ${oldProvider} (${cleared.length} profile(s))`)}`,
          );
        }
      }
    }
    return;
  }

  runtime.log(theme.error("No candidates succeeded — default model unchanged."));
  process.exit(1);
}

// ── Session model failover ────────────────────────────────────────────────────

export async function failoverSessionModel(
  opts: FailoverCommandOptions & { sessionKey: string },
  runtime: RuntimeEnv,
): Promise<void> {
  const candidates = parseCandidates(opts.models);
  if (candidates.length === 0) {
    runtime.log(theme.error("No valid provider/model candidates"));
    process.exit(2);
  }

  const timeoutMs = opts.timeout ?? 5000;
  const snapshot = await readConfigFileSnapshot();
  const cfg = snapshot.parsed;
  const storePath = resolveStorePath(cfg.session?.store);

  runtime.log(
    `Probing ${candidates.length} candidate(s) for session ${opts.sessionKey} (timeout=${timeoutMs}ms)${opts.dryRun ? " [dry-run]" : ""}`,
  );

  for (const cand of candidates) {
    const label = `${cand.provider}/${cand.model}`;

    // Check cooldown state
    const cooldown = checkCooldownStatus(cand.provider, cfg);
    if (cooldown.inCooldown) {
      const isPermanent =
        cooldown.reason === "auth" ||
        cooldown.reason === "auth_permanent" ||
        cooldown.reason === "billing";
      process.stdout.write(`  ${label} ... ${theme.warn("cooldown")} (${cooldown.reason})`);
      if (isPermanent) {
        process.stdout.write(` — skipping (permanent ${cooldown.reason} issue)\n`);
        continue;
      }
      process.stdout.write(` — probing anyway\n`);
    }

    process.stdout.write(`  ${label} ... `);
    const result = await probeModel(cand.provider, cand.model, timeoutMs);

    if (!result.ok) {
      process.stdout.write(`${theme.error("failed")} (${result.reason})\n`);
      continue;
    }

    process.stdout.write(`${theme.success("ok")} (${result.latencyMs}ms)\n`);

    if (opts.dryRun) {
      runtime.log(`[dry-run] Would set session ${opts.sessionKey} → ${label}`);
      return;
    }

    let applied = false;
    const updated = await updateSessionStoreEntry({
      storePath,
      sessionKey: opts.sessionKey,
      update: async (entry: SessionEntry) => {
        const result = applyModelOverrideToSessionEntry({
          entry,
          selection: { provider: cand.provider, model: cand.model },
        });
        applied = result.updated;
        return result.updated ? entry : null;
      },
    });

    if (!updated) {
      runtime.log(theme.error(`Session not found: ${opts.sessionKey}`));
      process.exit(3);
    }
    if (applied) {
      runtime.log(`${theme.success("✓")} Session ${opts.sessionKey} → ${label}`);
    } else {
      runtime.log(`No change required — session already using ${label}`);
    }
    return;
  }

  // None succeeded — reset session to default model
  runtime.log(theme.error("No candidates succeeded — resetting session to default model."));

  if (!opts.dryRun) {
    await updateSessionStoreEntry({
      storePath,
      sessionKey: opts.sessionKey,
      update: async (entry: SessionEntry) => {
        const result = applyModelOverrideToSessionEntry({
          entry,
          selection: { provider: "", model: "", isDefault: true },
        });
        return result.updated ? entry : null;
      },
    });
  }

  process.exit(1);
}

// ── CLI entrypoints ───────────────────────────────────────────────────────────

export async function failoverDefaultModelCommand(opts: FailoverCommandOptions): Promise<void> {
  await failoverDefaultModel(opts, defaultRuntime);
}

export async function failoverSessionModelCommand(
  opts: FailoverCommandOptions & { sessionKey: string },
): Promise<void> {
  await failoverSessionModel(opts, defaultRuntime);
}
