// coinrithm-agent — the public scaffolder/inspector CLI.
//
// Authors, validates, ejects, locks, and inspects agent DEFINITIONS. It does
// NOT trade, call a model, or hit the live API — it only compiles folders into
// the AgentSpec the resolver produces. Commands return a structured CmdResult
// so they are unit-testable without spawning a process.

import {
  mkdirSync,
  writeFileSync,
  existsSync,
  statSync,
  readFileSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { resolve as resolvePath, dirname, join, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  resolveAgent,
  ResolveError,
  mergeProseParts,
  isSkillProseSource,
  hostedProseBudget,
  HOSTED_PROSE_MAX_CHARS,
} from "./resolve.js";
import { buildSpec, loadAgent } from "./skill.js";
import { validateSkill, SkillValidationMode } from "./skillValidator.js";
import { strictLint } from "./strictLint.js";
import { checkCapabilityDrift } from "./capabilityGuard.js";
import { buildManifest, writeManifest } from "./manifest.js";
import { parseFrontmatter } from "./frontmatter.js";
import {
  renderFolderOfOne,
  ejectFiles,
  PRESET_NAMES,
  PresetName,
} from "./templates.js";
import { COINRITHM_API } from "./version.js";
import { stableStringify, envFlag } from "./util.js";
import { ResolveIssue } from "./types.js";
import { CoinRithmClient } from "./client.js";
import { selectProvider } from "./providers.js";
import { runLoop, RunnerDeps } from "./runner.js";
import { loadState, saveState } from "./state.js";
import { makeRunId } from "./runEvidence.js";

export interface CmdResult {
  ok: boolean;
  code: number;
  lines: string[];
  data?: unknown;
}

const fail = (lines: string[]): CmdResult => ({ ok: false, code: 1, lines });

function issuesResult(issues: ResolveIssue[], header: string): CmdResult {
  return {
    ok: false,
    code: 1,
    lines: [
      `✗ ${header}`,
      ...issues.map(
        (i) => `  [${i.code}] ${i.path ? `${i.path}: ` : ""}${i.message}`,
      ),
    ],
  };
}

function agentDirOf(path: string): string {
  const abs = resolvePath(path);
  return existsSync(abs) && statSync(abs).isDirectory() ? abs : dirname(abs);
}

function pinWarnings(path: string): string[] {
  try {
    const pin = join(agentDirOf(path), "functionality", "coinrithm.yaml");
    if (!existsSync(pin)) return [];
    const parsed = parseYaml(readFileSync(pin, "utf8")) as
      { api?: { openapiVersion?: string; mcpVersion?: string } } | undefined;
    const warnings: string[] = [];
    const openapi = parsed?.api?.openapiVersion;
    if (openapi && openapi !== COINRITHM_API.openapiVersion) {
      warnings.push(
        `⚠ functionality/coinrithm.yaml pins API ${openapi}; current is ${COINRITHM_API.openapiVersion} (warning only, not a block)`,
      );
    }
    const mcp = parsed?.api?.mcpVersion;
    if (mcp && mcp !== COINRITHM_API.mcpVersion) {
      warnings.push(
        `⚠ functionality/coinrithm.yaml pins MCP ${mcp}; current is ${COINRITHM_API.mcpVersion} (warning only, not a block)`,
      );
    }
    return warnings;
  } catch {
    /* ignore */
  }
  return [];
}

export function cmdNew(
  targetPath: string,
  opts: { template?: string; preset?: string } = {},
): CmdResult {
  const template = opts.template ?? "momentum-futures";
  if (template !== "momentum-futures") {
    return fail([`unknown template "${template}" (only: momentum-futures)`]);
  }
  const preset = (opts.preset ?? "conservative") as PresetName;
  if (!PRESET_NAMES.includes(preset)) {
    return fail([
      `unknown preset "${preset}" (allowed: ${PRESET_NAMES.join(", ")})`,
    ]);
  }
  const dir = resolvePath(targetPath);
  if (!dir || dir === resolvePath("."))
    return fail(["provide a target directory name"]);
  if (existsSync(dir))
    return fail([`refusing to overwrite existing path: ${dir}`]);
  const name = basename(dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "agent.md"), renderFolderOfOne(name, preset), "utf8");
  return {
    ok: true,
    code: 0,
    lines: [
      `created ${join(dir, "agent.md")} (template=${template}, preset=${preset})`,
      `next: coinrithm-agent validate "${dir}"`,
    ],
  };
}

export function cmdValidate(
  path: string,
  mode: SkillValidationMode = "self-host",
): CmdResult {
  let resolved;
  try {
    resolved = resolveAgent(path);
  } catch (e) {
    if (e instanceof ResolveError)
      return issuesResult(e.issues, "resolve failed");
    throw e;
  }
  const raw = resolved.rawFrontmatter;
  const spec = buildSpec(raw);
  const lint = [...strictLint(raw), ...checkCapabilityDrift(resolved, spec)];
  const v = validateSkill({ spec, body: resolved.mergedProse, raw }, mode);

  // Hosted-only: the managed deploy/edit API caps the merged strategy prose at
  // HOSTED_PROSE_MAX_CHARS and REVERTS the save when it is exceeded, so a
  // bundle that resolves and lints perfectly can still be undeployable through
  // the Studio. Measured 2026-08-19 after a user hit the wall: 4 of 9 example
  // bundles were over (contrarian-carl 8,159, mia 8,175, olivia 8,587,
  // pia-pump-fader 11,787) while the corpus README claimed they all pass
  // `validate --hosted`. Checking it here is what makes that claim true and
  // stops the corpus drifting back over the wall.
  if (mode === "hosted") {
    const budget = hostedProseBudget(resolved.mergedProse);
    if (!budget.fits) {
      lint.push({
        code: "hosted_prose_too_long",
        path: "character/*.md",
        message:
          `merged strategy prose is ${budget.used} chars, ${budget.over} over the hosted ` +
          `limit of ${HOSTED_PROSE_MAX_CHARS} — the managed deploy would reject this and ` +
          `revert to the template. Self-host has no such cap. Note the count includes a ` +
          `"<!-- path -->" header per prose file, not just the bodies.`,
      });
    }
  }

  const lintFatal = mode === "hosted";
  const lines: string[] = [];
  for (const i of lint) {
    lines.push(
      `${lintFatal ? "✗" : "⚠"} ${i.code}${i.path ? ` (${i.path})` : ""}: ${i.message}`,
    );
  }
  for (const i of v.issues) lines.push(`✗ ${i.code}: ${i.reason}`);
  lines.push(...pinWarnings(path));

  const ok = v.valid && (!lintFatal || lint.length === 0);
  lines.unshift(ok ? `✓ valid (${mode})` : `✗ invalid (${mode})`);
  return { ok, code: ok ? 0 : 1, lines, data: { lint, validation: v } };
}

export function cmdLock(path: string): CmdResult {
  const v = cmdValidate(path, "self-host");
  if (!v.ok)
    return { ...v, lines: ["refusing to lock an invalid agent:", ...v.lines] };
  const resolved = resolveAgent(path);
  const spec = buildSpec(resolved.rawFrontmatter);
  const manifest = buildManifest(resolved, spec);
  const out = writeManifest(agentDirOf(path), manifest);
  // Self-host treats capability drift as advisory (not fatal), but locking past
  // it silently would hide it — surface it so the author isn't surprised when
  // `validate --hosted` later rejects the same folder.
  const drift = (
    (v.data as { lint?: ResolveIssue[] } | undefined)?.lint ?? []
  ).filter((i) => i.code.startsWith("drift_"));
  const warn = drift.length
    ? [
        `⚠ locked with ${drift.length} advisory capability-drift note(s) — \`validate --hosted\` would reject these:`,
        ...drift.map(
          (i) => `  [${i.code}] ${i.path ? `${i.path}: ` : ""}${i.message}`,
        ),
      ]
    : [];
  return {
    ok: true,
    code: 0,
    lines: [`wrote ${out}`, `configHash ${manifest.configHash}`, ...warn],
  };
}

export function cmdEject(path: string): CmdResult {
  const agentDir = agentDirOf(path);
  const abs = resolvePath(path);
  const keystone =
    existsSync(abs) && statSync(abs).isDirectory()
      ? join(abs, "agent.md")
      : abs;
  if (!existsSync(keystone)) return fail([`no agent.md at ${keystone}`]);

  const { data: fm, body } = parseFrontmatter(readFileSync(keystone, "utf8"));
  if (Array.isArray((fm as Record<string, unknown>).extends)) {
    return fail([
      "agent already uses `extends` (already ejected?) — nothing to do",
    ]);
  }

  const before = buildSpec(fm as Record<string, unknown>);
  const { files } = ejectFiles(fm as Record<string, unknown>, body);
  for (const [rel, content] of Object.entries(files)) {
    const p = join(agentDir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content, "utf8");
  }

  let after;
  try {
    after = buildSpec(resolveAgent(agentDir).rawFrontmatter);
  } catch (e) {
    return fail([
      `ejected folder failed to re-resolve: ${(e as Error).message}`,
    ]);
  }
  const same = stableStringify(before) === stableStringify(after);
  const lines = [
    `ejected into ${agentDir}`,
    ...Object.keys(files).map((f) => `  + ${f}`),
    same
      ? "✓ resolved spec unchanged"
      : "✗ WARNING: resolved spec CHANGED after eject",
  ];
  return { ok: same, code: same ? 0 : 1, lines };
}

export function cmdInspect(path: string, json = false): CmdResult {
  let resolved;
  try {
    resolved = resolveAgent(path);
  } catch (e) {
    if (e instanceof ResolveError)
      return issuesResult(e.issues, "resolve failed");
    throw e;
  }
  const spec = buildSpec(resolved.rawFrontmatter);
  const lint = [
    ...strictLint(resolved.rawFrontmatter),
    ...checkCapabilityDrift(resolved, spec),
  ];
  const v = validateSkill(
    { spec, body: resolved.mergedProse, raw: resolved.rawFrontmatter },
    "self-host",
  );
  const output = {
    resolvedConfig: resolved.rawFrontmatter,
    provenance: resolved.provenance,
    contentHashes: resolved.contentHashes,
    validation: { valid: v.valid, issues: v.issues, lint },
  };
  if (json) {
    return {
      ok: v.valid,
      code: 0,
      lines: [JSON.stringify(output, null, 2)],
      data: output,
    };
  }
  const lines = [
    `name:        ${spec.name}`,
    `venues:      ${spec.venues.join(", ")}`,
    `cadence:     ${spec.trigger.cadence}`,
    `model:       ${spec.model ? `${spec.model.provider}/${spec.model.name}` : "(host free-tier)"}`,
    `risk:        maxLeverage=${spec.risk.maxLeverage} perTradeMargin=${spec.risk.perTradeMarginMusd} requireStopLoss=${spec.risk.requireStopLoss}`,
    `sources:     ${Object.keys(resolved.contentHashes).length} file(s)`,
    `validation:  ${v.valid ? "valid" : "INVALID"}${lint.length ? ` (+${lint.length} lint note(s))` : ""}`,
  ];
  return { ok: v.valid, code: 0, lines, data: output };
}

// Is a process still alive? signal 0 probes without sending — ESRCH means it's
// gone, EPERM means it exists but we can't signal it (still alive). Unknown PIDs
// (NaN / non-positive) are treated as alive so we never reclaim a malformed lock.
function pidIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

// Acquire an exclusive per-agent run lock (O_EXCL). Returns a release fn, or
// null if another LIVE runner already holds it — so two runners can't race one
// state file and bypass the daily / write caps. Stale-aware: if the existing
// lock names a PID that is no longer alive (the prior runner was Ctrl-C'd /
// killed without unwinding its finally), the orphaned lock is reclaimed instead
// of trapping every subsequent `run` until a manual delete.
export function acquireLock(stateFile: string): (() => void) | null {
  const lock = `${stateFile}.lock`;
  let fd: number;
  try {
    fd = openSync(lock, "wx");
  } catch {
    // Lock exists. Reclaim it only if its owner PID is provably dead.
    let ownerAlive = true;
    try {
      const prior = JSON.parse(readFileSync(lock, "utf8")) as { pid?: number };
      ownerAlive = pidIsAlive(Number(prior?.pid));
    } catch {
      // Unreadable / unparseable lock — treat as held (conservative).
      return null;
    }
    if (ownerAlive) return null;
    try {
      unlinkSync(lock);
      fd = openSync(lock, "wx"); // re-acquire; if we lose a race, bail out.
    } catch {
      return null;
    }
  }
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid }));
  } catch {
    /* best effort */
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(lock);
    } catch {
      /* ignore */
    }
  };
}

// Run the agent locally (self-host). Dry-run by default; --live (or LIVE=1)
// places paper trades. Reads COINRITHM_API_KEY + the model key from the ENV.
export async function cmdRun(
  path: string,
  opts: { once?: boolean; live?: boolean; stateFile?: string } = {},
): Promise<CmdResult> {
  let loaded;
  try {
    loaded = loadAgent(path, "self-host");
  } catch (e) {
    if (e instanceof ResolveError)
      return issuesResult(e.issues, "resolve failed");
    throw e;
  }
  const apiKey = process.env.COINRITHM_API_KEY;
  if (!apiKey)
    return fail([
      "COINRITHM_API_KEY is not set (needed to read your paper account)",
    ]);
  let provider;
  try {
    provider = selectProvider(loaded.spec, process.env, fetch);
  } catch (e) {
    return fail([(e as Error).message]);
  }
  const client = new CoinRithmClient({
    apiKey,
    baseUrl: process.env.COINRITHM_API_URL,
  });
  const stateFile =
    opts.stateFile ?? join(agentDirOf(path), ".agent.state.json");

  const release = acquireLock(stateFile);
  if (!release) {
    return fail([
      `another runner holds ${stateFile}.lock — only one runner per agent at a time`,
    ]);
  }
  // A self-host `run` is a cadence-paced loop users stop with Ctrl-C. Node exits
  // on SIGINT/SIGTERM WITHOUT unwinding the finally across the awaited loop, so
  // free the lock from a signal handler too (otherwise every later run is
  // trapped on the orphaned .lock). Removed in the finally so repeated in-proc
  // runs (tests) don't leak listeners; re-exit preserves normal Ctrl-C exit.
  const onSignal = (sig: NodeJS.Signals) => {
    release();
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    process.kill(process.pid, sig);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  try {
    let state;
    try {
      state = loadState(stateFile, makeRunId(loaded.spec));
    } catch (e) {
      // Corrupt state is fail-closed: refuse to run rather than reset guards.
      return fail([(e as Error).message]);
    }
    if (state.disabled) {
      return fail([
        `agent is disabled: ${state.disabledReason ?? "kill-switch"} — clear ${stateFile} to reset`,
      ]);
    }
    const live = !!opts.live;
    const lines: string[] = [
      `run ${live ? "LIVE (paper trades WILL be placed)" : "DRY-RUN (no writes; set --live or LIVE=1)"} — ${loaded.spec.name}`,
    ];
    // Skills ablation kill-switch: drop tactic-skill prose from the prompt for
    // token-cost control or A/B testing. Affects ONLY the run-time prompt — the
    // resolver, manifest, and caps are untouched (the spec is still enforced).
    const disableSkills = envFlag(process.env.COINRITHM_AGENT_DISABLE_SKILLS);
    const mergedProse = disableSkills
      ? mergeProseParts(
          loaded.resolved.proseParts.filter(
            (p) => !isSkillProseSource(p.source),
          ),
        )
      : loaded.body;
    if (disableSkills) {
      const dropped = loaded.resolved.proseParts.filter((p) =>
        isSkillProseSource(p.source),
      ).length;
      lines.push(
        `skills DISABLED via COINRITHM_AGENT_DISABLE_SKILLS — ${dropped} tactic skill(s) dropped from the prompt (caps unchanged)`,
      );
    }
    const deps: RunnerDeps = {
      client,
      provider,
      spec: loaded.spec,
      mergedProse,
      state,
      live,
      stateFile,
      log: (l: string) => lines.push(l),
    };
    const results = await runLoop(deps, { once: opts.once });
    saveState(stateFile, state);
    const wrote = results.some((res) => res.planned.some((p) => p.executed));
    lines.push(`done: ${results.length} cycle(s)${wrote ? "" : ", no writes"}`);
    return { ok: true, code: 0, lines, data: results };
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    release();
  }
}

function parseFlags(args: string[]): {
  _: string[];
  hosted?: boolean;
  json?: boolean;
  once?: boolean;
  live?: boolean;
  dryRun?: boolean;
  state?: string;
  template?: string;
  preset?: string;
} {
  const out: {
    _: string[];
    hosted?: boolean;
    json?: boolean;
    once?: boolean;
    live?: boolean;
    dryRun?: boolean;
    state?: string;
    template?: string;
    preset?: string;
  } = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--hosted") out.hosted = true;
    else if (a === "--self-host") out.hosted = false;
    else if (a === "--json") out.json = true;
    else if (a === "--once") out.once = true;
    else if (a === "--live") out.live = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--template") out.template = args[++i];
    else if (a === "--preset") out.preset = args[++i];
    else if (a === "--state") out.state = args[++i];
    else out._.push(a);
  }
  return out;
}

function usageLines(): string[] {
  return [
    "coinrithm-agent — author + run CoinRithm paper-trading agents (simulated funds only)",
    "  new <dir> --template momentum-futures --preset conservative|balanced|bold",
    "  validate <path> [--hosted | --self-host]",
    "  inspect <path> [--json]",
    "  eject <agent.md | dir>",
    "  lock <path>",
    "  run <path> [--once] [--live] [--dry-run] [--state <file>]   (dry-run by default)",
  ];
}

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  const flags = parseFlags(rest);
  const pos = flags._;
  let r: CmdResult;
  switch (cmd) {
    case "new":
      r = cmdNew(pos[0] ?? "", {
        template: flags.template,
        preset: flags.preset,
      });
      break;
    case "validate":
      r = cmdValidate(pos[0] ?? ".", flags.hosted ? "hosted" : "self-host");
      break;
    case "lock":
      r = cmdLock(pos[0] ?? ".");
      break;
    case "eject":
      r = cmdEject(pos[0] ?? ".");
      break;
    case "inspect":
      r = cmdInspect(pos[0] ?? ".", !!flags.json);
      break;
    case "run": {
      // dry-run is the default; only --live (or LIVE=1) AND not --dry-run trades.
      const live = (!!flags.live || process.env.LIVE === "1") && !flags.dryRun;
      r = await cmdRun(pos[0] ?? ".", {
        once: flags.once,
        live,
        stateFile: flags.state,
      });
      break;
    }
    case undefined:
    case "help":
    case "--help":
    case "-h":
      r = { ok: true, code: 0, lines: usageLines() };
      break;
    default:
      r = {
        ok: false,
        code: 1,
        lines: [`unknown command "${cmd}"`, ...usageLines()],
      };
  }
  for (const line of r.lines) {
    console.log(line);
  }
  return r.code;
}
