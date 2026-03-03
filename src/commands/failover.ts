import { parseModelRef } from "../agents/model-selection.js";
import { readConfigFileSnapshot, writeConfigFile } from "../config/config.js";
import { resolveStorePath } from "../config/sessions/paths.js";
import { updateSessionStoreEntry } from "../config/sessions/store.js";
import type { SessionEntry } from "../config/sessions/types.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { applyModelOverrideToSessionEntry } from "../sessions/model-overrides.js";
import { theme } from "../terminal/theme.js";
import { applyDefaultModelPrimaryUpdate } from "./models/shared.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type FailoverProbeResult =
  | { ok: true; provider: string; model: string; latencyMs: number }
  | { ok: false; provider: string; model: string; reason: string };

export type FailoverTarget = "default" | "session";

export type FailoverCommandOptions = {
  models: string;
  sessionKey?: string;
  timeout?: number;
  dryRun?: boolean;
  json?: boolean;
};

// ── Probe logic ──────────────────────────────────────────────────────────────

/**
 * Probe a single provider/model pair for availability.
 * Uses live HTTP model-list endpoints where possible, env-key heuristics for
 * providers that don't expose a lightweight probe endpoint.
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

    // ── OpenAI ──
    if (p === "openai") {
      const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY_0;
      if (!key) {
        return { ok: false, provider, model, reason: "no key: OPENAI_API_KEY" };
      }
      const res = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
        signal: ac.signal,
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status === 404) {
        return { ok: false, provider, model, reason: "model_not_found (HTTP 404)" };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, provider, model, reason: `auth (HTTP ${res.status})` };
      }
      if (res.status === 429) {
        return { ok: false, provider, model, reason: "rate_limit (HTTP 429)" };
      }
      return res.ok
        ? { ok: true, provider, model, latencyMs: Date.now() - start }
        : { ok: false, provider, model, reason: `HTTP ${res.status}` };
    }

    // ── Anthropic ──
    if (p === "anthropic") {
      const key = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_0;
      if (!key) {
        return { ok: false, provider, model, reason: "no key: ANTHROPIC_API_KEY" };
      }
      const res = await fetch(`https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`, {
        signal: ac.signal,
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      });
      if (res.status === 404) {
        return { ok: false, provider, model, reason: "model_not_found (HTTP 404)" };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, provider, model, reason: `auth (HTTP ${res.status})` };
      }
      if (res.status === 429) {
        return { ok: false, provider, model, reason: "rate_limit (HTTP 429)" };
      }
      return res.ok
        ? { ok: true, provider, model, latencyMs: Date.now() - start }
        : { ok: false, provider, model, reason: `HTTP ${res.status}` };
    }

    // ── Google Gemini ──
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
      if (res.status === 404) {
        return { ok: false, provider, model, reason: "model_not_found (HTTP 404)" };
      }
      return res.ok
        ? { ok: true, provider, model, latencyMs: Date.now() - start }
        : { ok: false, provider, model, reason: `HTTP ${res.status}` };
    }

    // ── CLI-backed providers (no HTTP probe needed) ──
    if (p.endsWith("-cli") || p === "claude-cli" || p === "codex-cli" || p === "gemini-cli") {
      return { ok: true, provider, model, latencyMs: 0 };
    }

    // ── Generic fallback: check for <PROVIDER>_API_KEY env var ──
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

// ── Candidate parsing ─────────────────────────────────────────────────────────

function parseCandidates(raw: string): Array<{ provider: string; model: string }> {
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

// ── Default model failover ────────────────────────────────────────────────────

/**
 * Probe candidates in order and update agents.defaults.model.primary
 * in the global config to the first responsive model.
 * Uses writeConfigFile (JSON5-safe, atomic, 0o600) from core config IO.
 */
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
  runtime.log(
    `Probing ${candidates.length} candidate(s) for default model (timeout=${timeoutMs}ms)${opts.dryRun ? " [dry-run]" : ""}`,
  );

  for (const cand of candidates) {
    const label = `${cand.provider}/${cand.model}`;
    process.stdout.write(`  ${label} ... `);
    const result = await probeModel(cand.provider, cand.model, timeoutMs);

    if (!result.ok) {
      process.stdout.write(`${theme.error("failed")} (${result.reason})\n`);
      continue;
    }

    process.stdout.write(`${theme.success("ok")} (${result.latencyMs}ms)\n`);

    if (opts.dryRun) {
      runtime.log(`[dry-run] Would set default model → ${label}`);
      return;
    }

    const snapshot = await readConfigFileSnapshot();
    const cfg = snapshot.parsed;
    const modelRaw = label;
    applyDefaultModelPrimaryUpdate({ cfg, modelRaw, field: "model" });
    await writeConfigFile(cfg);
    runtime.log(`${theme.success("✓")} Default model updated → ${label}`);
    return;
  }

  runtime.log(theme.error("No candidates succeeded — default model unchanged."));
  process.exit(1);
}

// ── Session model failover ────────────────────────────────────────────────────

/**
 * Probe candidates in order and apply providerOverride/modelOverride to the
 * given session entry using applyModelOverrideToSessionEntry (which correctly
 * clears fallbackNotice* fields and auth profile overrides).
 * Uses updateSessionStoreEntry (lock-safe, atomic, 0o600).
 */
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
  const storePath = resolveStorePath(snapshot.parsed.session?.store);

  runtime.log(
    `Probing ${candidates.length} candidate(s) for session ${opts.sessionKey} (timeout=${timeoutMs}ms)${opts.dryRun ? " [dry-run]" : ""}`,
  );

  for (const cand of candidates) {
    const label = `${cand.provider}/${cand.model}`;
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
    await updateSessionStoreEntry({
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

    if (applied) {
      runtime.log(`${theme.success("✓")} Session ${opts.sessionKey} → ${label}`);
    } else {
      runtime.log(`No change required — session already using ${label}`);
    }
    return;
  }

  // None succeeded — reset session to default
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
