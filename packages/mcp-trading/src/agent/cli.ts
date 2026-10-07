import { configurationWarnings } from "./configurationWarnings.js";
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
import { buildAgentDefinitionSnapshot } from "./definitionSnapshot.js";
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
import { stableStringify, envFlag, parseCadenceMs, sleep } from "./util.js";
import { AgentSpec, ResolveIssue } from "./types.js";
import { CoinRithmClient } from "./client.js";
import { Provider, selectProvider } from "./providers.js";
import { runLoop, RunnerDeps } from "./runner.js";
import { loadState, saveState } from "./state.js";
import { makeRunId } from "./runEvidence.js";
import { readCorpus, writeCassette } from "./bench/cassette.js";
import { recordCassette } from "./bench/recordingClient.js";
import { BenchVariant, runBench } from "./bench/bench.js";
import {
  buildPriceLabels,
  DEFAULT_LABEL_HORIZON_HOURS,
} from "./bench/labelBuilder.js";
import { parseLabelFile } from "./bench/labels.js";

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
  const warnings = configurationWarnings(raw);

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
  lines.push(...warnings.map((warning) => `⚠ ${warning}`));
  lines.push(...pinWarnings(path));

  const ok = v.valid && (!lintFatal || lint.length === 0);
  lines.unshift(ok ? `✓ valid (${mode})` : `✗ invalid (${mode})`);
  return {
    ok,
    code: ok ? 0 : 1,
    lines,
    data: { lint, validation: v, warnings },
  };
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
    warnings: configurationWarnings(resolved.rawFrontmatter),
    resolvedConfig: resolved.rawFrontmatter,
    provenance: resolved.provenance,
    contentHashes: resolved.contentHashes,
    // The local runtime consumes these exact compiled inputs. In particular,
    // skill ablation changes prose, not the source manifest or hard caps.
    compiledDefinition: buildAgentDefinitionSnapshot(
      spec,
      runtimeProse(resolved),
    ),
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
    `definition:  ${output.compiledDefinition.definitionHash}`,
    `validation:  ${v.valid ? "valid" : "INVALID"}${lint.length ? ` (+${lint.length} lint note(s))` : ""}`,
    ...output.warnings.map((warning) => `⚠ ${warning}`),
  ];
  return { ok: v.valid, code: 0, lines, data: output };
}

function runtimeProse(resolved: ReturnType<typeof resolveAgent>): string {
  return envFlag(process.env.COINRITHM_AGENT_DISABLE_SKILLS)
    ? mergeProseParts(
        resolved.proseParts.filter((part) => !isSkillProseSource(part.source)),
      )
    : resolved.mergedProse;
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
  opts: {
    once?: boolean;
    live?: boolean;
    stateFile?: string;
    expectDefinition?: string;
  } = {},
): Promise<CmdResult> {
  let loaded;
  try {
    loaded = loadAgent(path, "self-host");
  } catch (e) {
    if (e instanceof ResolveError)
      return issuesResult(e.issues, "resolve failed");
    throw e;
  }
  const mergedProse = runtimeProse(loaded.resolved);
  const definition = buildAgentDefinitionSnapshot(loaded.spec, mergedProse);
  if (
    opts.expectDefinition !== undefined &&
    opts.expectDefinition !== definition.definitionHash
  ) {
    return fail([
      "compiled agent definition does not match --expect-definition; no model or account call was made",
      `current definition: ${definition.definitionHash}`,
      "inspect the change before choosing a new baseline",
    ]);
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
      `definition: ${definition.definitionHash}`,
    ];
    // Skills ablation kill-switch: drop tactic-skill prose from the prompt for
    // token-cost control or A/B testing. Affects ONLY the run-time prompt — the
    // resolver, manifest, and caps are untouched (the spec is still enforced).
    const disableSkills = envFlag(process.env.COINRITHM_AGENT_DISABLE_SKILLS);
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

const MAX_RECORD_CYCLES = 10_000;

// Record bench cassettes (see bench/cassette.ts). Read-only by construction:
// every cycle runs DRY-RUN through a recording transport that refuses all
// non-GET requests, with a brain that never calls a model, so only
// COINRITHM_API_KEY is needed and no model key is read. The agent's own state
// file is not touched; each recorded cycle starts from a fresh run state.
export async function cmdRecord(
  path: string,
  opts: {
    out?: string;
    cycles?: number;
    every?: string;
    fetchFn?: typeof fetch;
    sleepFn?: (ms: number) => Promise<void>;
  } = {},
): Promise<CmdResult> {
  if (!opts.out) return fail(["record needs --out <dir> for the cassettes"]);
  const cycles = opts.cycles ?? 1;
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > MAX_RECORD_CYCLES)
    return fail([`--cycles must be an integer from 1 to ${MAX_RECORD_CYCLES}`]);
  let loaded;
  try {
    loaded = loadAgent(path, "self-host");
  } catch (e) {
    if (e instanceof ResolveError)
      return issuesResult(e.issues, "resolve failed");
    throw e;
  }
  const everyMs =
    opts.every !== undefined
      ? parseCadenceMs(opts.every)
      : (parseCadenceMs(loaded.spec.trigger.cadence) ?? 3_600_000);
  if (everyMs === null)
    return fail([`--every "${opts.every}" is not a cadence like 5m or 1h`]);
  const apiKey = process.env.COINRITHM_API_KEY;
  if (!apiKey)
    return fail([
      "COINRITHM_API_KEY is not set (recording reads your paper account; it never writes)",
    ]);
  const mergedProse = runtimeProse(loaded.resolved);
  const lines = [
    `record DRY-RUN (reads only, no model call): ${loaded.spec.name}, ${cycles} cycle(s)`,
  ];
  const files: string[] = [];
  for (let i = 0; i < cycles; i++) {
    let cassette;
    try {
      cassette = await recordCassette({
        spec: loaded.spec,
        mergedProse,
        apiKey,
        baseUrl: process.env.COINRITHM_API_URL || undefined,
        fetchFn: opts.fetchFn,
      });
    } catch (e) {
      lines.push(`✗ cycle ${i + 1} failed: ${(e as Error).message}`);
      return { ok: false, code: 1, lines, data: files };
    }
    files.push(writeCassette(resolvePath(opts.out), cassette));
    const cycle = cassette.recordCycle;
    lines.push(
      `recorded ${cassette.id}: ${cassette.responses.length} read(s), asOf ${cassette.asOf}, cycle ${cycle.decisionType ?? cycle.decision}${cycle.skipReason ? ` (${cycle.skipReason})` : ""}` +
        (cassette.refusedRequests.length
          ? `, ${cassette.refusedRequests.length} write(s) refused`
          : ""),
    );
    if (i < cycles - 1) await (opts.sleepFn ?? sleep)(everyMs);
  }
  return { ok: true, code: 0, lines, data: files };
}

// Write price outcome labels for a recorded corpus (bench/labelBuilder.ts):
// reads only, with COINRITHM_API_KEY, from candles published after each
// cassette's asOf. PM settlement labels are not built (they need the
// production settlement verdict), so PM opens stay unlabelled.
export async function cmdLabel(
  opts: {
    corpus?: string;
    horizonHours?: number;
    overwrite?: boolean;
    fetchFn?: typeof fetch;
    nowMs?: number;
  } = {},
): Promise<CmdResult> {
  if (!opts.corpus) return fail(["label needs --corpus <dir>"]);
  const horizonHours = opts.horizonHours ?? DEFAULT_LABEL_HORIZON_HOURS;
  if (!Number.isFinite(horizonHours) || horizonHours <= 0 || horizonHours > 720)
    return fail(["--horizon-hours must be a number in (0, 720]"]);
  const apiKey = process.env.COINRITHM_API_KEY;
  if (!apiKey)
    return fail([
      "COINRITHM_API_KEY is not set (labels read public market candles through your key; nothing is written)",
    ]);
  const dir = resolvePath(opts.corpus);
  let corpus;
  try {
    corpus = readCorpus(dir);
  } catch (e) {
    return fail([(e as Error).message]);
  }
  const client = new CoinRithmClient({
    apiKey,
    baseUrl: process.env.COINRITHM_API_URL || undefined,
    fetchFn: opts.fetchFn,
  });
  const results = await buildPriceLabels(corpus.cassettes, {
    fetchCandles: (coinId, range) => client.candles(coinId, range),
    horizonHours,
    nowMs: opts.nowMs ?? Date.now(),
    existing: corpus.labels,
    overwrite: opts.overwrite,
  });
  const lines = [
    `label (reads only): ${corpus.cassettes.length} cassette(s), horizon ${horizonHours} h`,
  ];
  let written = 0;
  for (const r of results) {
    if (r.status !== "built") {
      lines.push(
        `${r.id}: ${r.status}${r.status === "not_yet" ? ` (labelable after ${r.labelableAfter})` : ""}${r.status === "horizon_mismatch" ? ` (existing file labels ${r.existingHorizonHours ?? "no"} h, not ${horizonHours} h; rerun with --overwrite)` : ""}`,
      );
      continue;
    }
    const file = join(dir, "labels", `${r.id}.json`);
    // The bench reads it back through the same validator; fail closed here.
    parseLabelFile(r.file, `labels/${r.id}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(r.file, null, 2)}\n`, "utf8");
    written += 1;
    lines.push(
      `${r.id}: ${r.range} bars for ${r.symbols.length} symbol(s)${r.missing.length ? `, missing ${r.missing.join(",")}` : ""}`,
    );
  }
  lines.push(
    `wrote ${written} label file(s); PM opens stay unlabelled (no production settlement verdict read)`,
  );
  return { ok: true, code: 0, lines, data: results };
}

// Compare agent variants on a recorded corpus (see bench/bench.ts). Each
// variant runs with its own model, built exactly as `run` builds it from the
// variant's model config and the environment's keys. Never writes.
export async function cmdBench(
  opts: {
    corpus?: string;
    variants?: string[];
    repeats?: number;
    seed?: number;
    out?: string;
    baselines?: boolean;
    providerFor?: (spec: AgentSpec) => Provider;
  } = {},
): Promise<CmdResult> {
  if (!opts.corpus) return fail(["bench needs --corpus <dir>"]);
  if (!opts.variants || opts.variants.length === 0)
    return fail(["bench needs at least one --variant name=<agentPath>"]);
  if (
    opts.seed !== undefined &&
    (!Number.isSafeInteger(opts.seed) || opts.seed < 0)
  )
    return fail(["--seed must be a non-negative integer"]);
  let corpus;
  try {
    corpus = readCorpus(resolvePath(opts.corpus));
  } catch (e) {
    return fail([(e as Error).message]);
  }
  const variants: BenchVariant[] = [];
  for (const arg of opts.variants) {
    const eq = arg.indexOf("=");
    if (eq <= 0 || eq === arg.length - 1)
      return fail([`--variant "${arg}" must look like name=<agentPath>`]);
    const name = arg.slice(0, eq);
    const agentPath = arg.slice(eq + 1);
    let loaded;
    try {
      loaded = loadAgent(agentPath, "self-host");
    } catch (e) {
      if (e instanceof ResolveError)
        return issuesResult(e.issues, `variant ${name}: resolve failed`);
      throw e;
    }
    let provider: Provider;
    try {
      provider = opts.providerFor
        ? opts.providerFor(loaded.spec)
        : selectProvider(loaded.spec, process.env, fetch);
    } catch (e) {
      return fail([`variant ${name}: ${(e as Error).message}`]);
    }
    variants.push({
      name,
      spec: loaded.spec,
      mergedProse: runtimeProse(loaded.resolved),
      provider,
    });
  }
  const lines = [
    `bench DRY-RUN: ${corpus.cassettes.length} cassette(s) x ${variants.length} variant(s) x ${opts.repeats ?? 3} repeat(s)`,
  ];
  if (corpus.ignored.length)
    lines.push(`ignored non-cassette file(s): ${corpus.ignored.join(", ")}`);
  let report;
  try {
    report = await runBench({
      cassettes: corpus.cassettes,
      labels: corpus.labels,
      variants,
      repeats: opts.repeats,
      seed: opts.seed,
      baselines: opts.baselines,
    });
  } catch (e) {
    return fail([...lines, `✗ ${(e as Error).message}`]);
  }
  type Split = {
    cycles: number;
    modelFailures: number;
    actions: {
      accepted: number;
      rejected: number;
      rejectCodes: Record<string, number>;
    };
    cyclesWithMissingInputs: number;
    repeatConsistency: number | null;
  };
  const summary = report.variants as Record<string, { all: Split }>;
  for (const [name, v] of Object.entries(summary)) {
    const codes = Object.entries(v.all.actions.rejectCodes)
      .map(([c, n]) => `${c} ${n}`)
      .join(", ");
    lines.push(
      `${name}: ${v.all.cycles} cycle(s), accepted ${v.all.actions.accepted}, rejected ${v.all.actions.rejected}${codes ? ` (${codes})` : ""}, model failures ${v.all.modelFailures}, cycles missing inputs ${v.all.cyclesWithMissingInputs}, repeat consistency ${v.all.repeatConsistency ?? "n/a"}`,
    );
  }
  type Cmp = {
    a: string;
    b: string;
    all: {
      actionOverlapJaccard: number | null;
      metrics: Record<
        string,
        { n: number; meanDiff: number | null; ci95: [number, number] | null }
      >;
    };
  };
  for (const c of report.comparisons as Cmp[]) {
    const accepted = c.all.metrics.acceptedActions;
    lines.push(
      `${c.a} vs ${c.b}: overlap ${c.all.actionOverlapJaccard ?? "n/a"}, accepted diff ${accepted.meanDiff ?? "n/a"} (95% CI ${accepted.ci95 ? `${accepted.ci95[0]}..${accepted.ci95[1]}` : "n/a"}, n=${accepted.n})`,
    );
  }
  if (opts.out) {
    writeFileSync(
      resolvePath(opts.out),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    lines.push(`wrote ${resolvePath(opts.out)}`);
  }
  lines.push(`contentHash ${report.contentHash}`);
  return { ok: true, code: 0, lines, data: report };
}

interface ParsedFlags {
  _: string[];
  hosted?: boolean;
  json?: boolean;
  once?: boolean;
  live?: boolean;
  dryRun?: boolean;
  state?: string;
  expectDefinition?: string;
  template?: string;
  preset?: string;
  // record / bench
  out?: string;
  cycles?: number;
  every?: string;
  corpus?: string;
  variant?: string[];
  repeats?: number;
  seed?: number;
  noBaselines?: boolean;
  horizonHours?: number;
  overwrite?: boolean;
}

function parseFlags(args: string[]): ParsedFlags {
  const out: ParsedFlags = { _: [] };
  // A missing or non-numeric value becomes NaN so the command rejects it,
  // never silently falls back to its default.
  const num = (v: string | undefined) => (v === undefined ? NaN : Number(v));
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
    else if (a === "--expect-definition")
      out.expectDefinition = args[++i] ?? "";
    else if (a === "--out") out.out = args[++i];
    else if (a === "--cycles") out.cycles = num(args[++i]);
    else if (a === "--every") out.every = args[++i] ?? "";
    else if (a === "--corpus") out.corpus = args[++i];
    else if (a === "--variant")
      out.variant = [...(out.variant ?? []), args[++i] ?? ""];
    else if (a === "--repeats") out.repeats = num(args[++i]);
    else if (a === "--seed") out.seed = num(args[++i]);
    else if (a === "--no-baselines") out.noBaselines = true;
    else if (a === "--horizon-hours") out.horizonHours = num(args[++i]);
    else if (a === "--overwrite") out.overwrite = true;
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
    "  run <path> [--once] [--live] [--dry-run] [--state <file>] [--expect-definition sha256:...]   (dry-run by default)",
    "  record <path> --out <dir> [--cycles N] [--every 5m]   (bench inputs; reads only, no model call)",
    "  bench --corpus <dir> --variant a=<path> --variant b=<path> [--repeats 3] [--seed N] [--no-baselines] [--out report.json]",
    "  label --corpus <dir> [--horizon-hours 24] [--overwrite]   (price outcome labels after asOf; reads only)",
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
        expectDefinition: flags.expectDefinition,
      });
      break;
    }
    case "record":
      r = await cmdRecord(pos[0] ?? ".", {
        out: flags.out,
        cycles: flags.cycles,
        every: flags.every,
      });
      break;
    case "label":
      r = await cmdLabel({
        corpus: flags.corpus,
        horizonHours: flags.horizonHours,
        overwrite: flags.overwrite,
      });
      break;
    case "bench":
      r = await cmdBench({
        corpus: flags.corpus,
        variants: flags.variant,
        repeats: flags.repeats,
        seed: flags.seed,
        out: flags.out,
        baselines: !flags.noBaselines,
      });
      break;
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
