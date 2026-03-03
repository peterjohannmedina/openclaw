import type { Command } from "commander";
import { failoverDefaultModelCommand, failoverSessionModelCommand } from "../commands/failover.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { runCommandWithRuntime } from "./cli-utils.js";

function run(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action);
}

export function registerFailoverCli(program: Command) {
  const failover = program
    .command("failover")
    .description("Probe model availability and switch default or session model on failure")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/failover", "docs.openclaw.ai/cli/failover")}\n`,
    );

  // ── failover default ──
  failover
    .command("default")
    .description("Probe candidates and update the global default model")
    .requiredOption(
      "-m, --models <list>",
      "Comma-separated provider/model candidates in priority order (e.g. openai/gpt-4o,anthropic/claude-opus-4-6)",
    )
    .option("-t, --timeout <ms>", "Per-probe timeout in milliseconds", "5000")
    .option("--dry-run", "Print what would change without writing", false)
    .option("--json", "Output result as JSON", false)
    .action((opts) =>
      run(() =>
        failoverDefaultModelCommand({
          models: opts.models,
          timeout: Number(opts.timeout),
          dryRun: opts.dryRun,
          json: opts.json,
        }),
      ),
    );

  // ── failover session ──
  failover
    .command("session")
    .description("Probe candidates and apply a model override to a specific session")
    .requiredOption("-s, --session-key <key>", "Session key to update")
    .requiredOption(
      "-m, --models <list>",
      "Comma-separated provider/model candidates in priority order",
    )
    .option("-t, --timeout <ms>", "Per-probe timeout in milliseconds", "5000")
    .option("--dry-run", "Print what would change without writing", false)
    .option("--json", "Output result as JSON", false)
    .action((opts) =>
      run(() =>
        failoverSessionModelCommand({
          sessionKey: opts.sessionKey,
          models: opts.models,
          timeout: Number(opts.timeout),
          dryRun: opts.dryRun,
          json: opts.json,
        }),
      ),
    );
}
