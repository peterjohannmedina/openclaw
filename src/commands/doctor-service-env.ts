/**
 * doctor-service-env.ts — Patch a single environment variable in the installed
 * gateway service unit (launchd on macOS, systemd on Linux).
 *
 * Used by doctor's config-path mismatch remediation to add
 * OPENCLAW_CONFIG_PATH to the daemon's environment so the gateway and CLI
 * read from the same config file.
 */

import fs from "node:fs/promises";
import { GATEWAY_LAUNCH_AGENT_LABEL } from "../daemon/constants.js";
import {
  resolveLaunchAgentPlistPath,
  buildLaunchAgentPlist,
  readLaunchAgentProgramArguments,
  resolveGatewayLogPaths,
  isLaunchAgentLoaded,
} from "../daemon/launchd.js";
import { resolveSystemdUserUnitPath } from "../daemon/systemd.js";
import type { RuntimeEnv } from "../runtime.js";

export type UpdateGatewayServiceEnvParams = {
  envKey: string;
  envValue: string;
  runtime: RuntimeEnv;
};

export async function updateGatewayServiceEnv(
  params: UpdateGatewayServiceEnvParams,
): Promise<void> {
  const platform = process.platform;

  if (platform === "darwin") {
    await updateLaunchAgentEnv(params);
  } else if (platform === "linux") {
    await updateSystemdUnitEnv(params);
  } else {
    throw new Error(`Unsupported platform for automatic service update: ${platform}`);
  }
}

// ── macOS — launchd plist ────────────────────────────────────────────────────

async function updateLaunchAgentEnv(params: UpdateGatewayServiceEnvParams): Promise<void> {
  const env = process.env;
  const plistPath = resolveLaunchAgentPlistPath(env);

  const raw = await fs.readFile(plistPath, "utf-8");
  const logPaths = resolveGatewayLogPaths(env);
  const programArguments = await readLaunchAgentProgramArguments(env);

  // Parse existing EnvironmentVariables from plist XML
  const existingEnv = parseExistingPlistEnvironment(raw);
  const updatedEnv: Record<string, string> = {
    ...existingEnv,
    [params.envKey]: params.envValue,
  };

  const updatedPlist = buildLaunchAgentPlist({
    label: GATEWAY_LAUNCH_AGENT_LABEL,
    programArguments,
    stdoutPath: logPaths.stdoutPath,
    stderrPath: logPaths.stderrPath,
    environment: updatedEnv,
  });

  await fs.writeFile(plistPath, updatedPlist, "utf-8");
  params.runtime.log(`Updated launchd plist: ${plistPath}`);

  // If the agent is loaded, unload and reload to pick up the new env
  if (await isLaunchAgentLoaded({ env })) {
    const { execFileUtf8 } = await import("../daemon/exec-file.js");
    const uid = typeof process.getuid === "function" ? process.getuid() : 501;
    await execFileUtf8("launchctl", ["unload", plistPath]);
    await execFileUtf8("launchctl", ["load", "-w", plistPath]);
    params.runtime.log(`Reloaded launchd agent (gui/${uid}/${GATEWAY_LAUNCH_AGENT_LABEL})`);
  }
}

/**
 * Minimal regex-based parser for the EnvironmentVariables dict in a launchd plist.
 * Returns a flat Record of key → value for existing env vars.
 */
function parseExistingPlistEnvironment(plist: string): Record<string, string> {
  const result: Record<string, string> = {};
  const envBlock = plist.match(/<key>EnvironmentVariables<\/key>\s*<dict>([\s\S]*?)<\/dict>/);
  if (!envBlock) {
    return result;
  }
  const entries = [...envBlock[1].matchAll(/<key>(.*?)<\/key>\s*<string>(.*?)<\/string>/gs)];
  for (const [, key, value] of entries) {
    if (key && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ── Linux — systemd user unit ─────────────────────────────────────────────────

async function updateSystemdUnitEnv(params: UpdateGatewayServiceEnvParams): Promise<void> {
  const env = process.env;
  const unitPath = resolveSystemdUserUnitPath(env);
  const raw = await fs.readFile(unitPath, "utf-8");

  // Update or add the Environment= line for this key in the [Service] section.
  // systemd supports multiple Environment= lines; we replace an existing one or
  // insert a new one before ExecStart.
  const envLine = `Environment="${params.envKey}=${params.envValue}"`;
  const existingPattern = new RegExp(`^Environment="${params.envKey}=.*"$`, "m");

  let updated: string;
  if (existingPattern.test(raw)) {
    updated = raw.replace(existingPattern, envLine);
  } else {
    // Insert before ExecStart=
    updated = raw.replace(/^(ExecStart=)/m, `${envLine}\n$1`);
  }

  await fs.writeFile(unitPath, updated, "utf-8");
  params.runtime.log(`Updated systemd unit: ${unitPath}`);

  // Reload the daemon so systemd picks up the new unit file
  const { execFileUtf8 } = await import("../daemon/exec-file.js");
  await execFileUtf8("systemctl", ["--user", "daemon-reload"]).catch(() => {});
  params.runtime.log(
    "Ran systemctl --user daemon-reload. Restart the gateway to apply: openclaw gateway restart",
  );
}
