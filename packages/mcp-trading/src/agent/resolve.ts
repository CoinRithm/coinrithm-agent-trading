// The agent resolver: compile a single agent.md OR a decomposed agent FOLDER
// into one deterministic { rawFrontmatter, mergedProse, provenance, hashes }.
//
// Design (Codex audit, adopted):
//   - Single FILE input  -> passthrough: frontmatter + body, exactly like a
//     legacy SKILL.md. No $ref/include resolution.
//   - DIRECTORY input    -> full resolve: a keystone (agent.md | SKILL.md) whose
//     config blocks may be inline OR a { $ref: "<path>" } to a part-file, plus
//     an optional include[] of tactic skills.
//   - FAIL-CLOSED on: missing keystone, missing $ref, path traversal, symlink,
//     $ref cycle, invalid YAML, a tactic that widens a hard cap, and ANY
//     secret found in merged frontmatter OR merged prose. All issues are
//     collected, then thrown together.
//   - The machine-read config and the prose the LLM reads never cross: only
//     YAML/frontmatter feeds rawFrontmatter; only markdown bodies feed
//     mergedProse.

import { readFileSync, existsSync, statSync, lstatSync } from "node:fs";
import {
  resolve as resolvePath,
  relative as relativePath,
  join,
  isAbsolute,
} from "node:path";
import { parse as parseYaml } from "yaml";
import { parseFrontmatter } from "./frontmatter.js";
import { ResolvedAgent, ResolveIssue, Provenance } from "./types.js";
import {
  sha256,
  toPosix,
  isPathInside,
  boundTail,
  scanForSecrets,
} from "./util.js";
import { mergeCapPatch, RISK_CAPS, LIMIT_CAPS } from "./mergeRules.js";

export class ResolveError extends Error {
  issues: ResolveIssue[];
  constructor(issues: ResolveIssue[]) {
    super(
      "agent resolve failed:\n" +
        issues.map((i) => `  [${i.code}] ${i.message}`).join("\n"),
    );
    this.name = "ResolveError";
    this.issues = issues;
  }
}

const KEYSTONE_NAMES = ["agent.md", "SKILL.md"]; // SKILL.md kept as an alias
const CONFIG_BLOCKS = [
  "trigger",
  "model",
  "venues",
  "risk",
  "sizing",
  "limits",
  "abstention",
  "sync",
  "killSwitch",
  "objective",
  "capabilities",
];
const JOURNAL_MAX_LINES = 200;
const JOURNAL_MAX_BYTES = 8_000;

// Optional prose files (markdown the LLM reads), in assembly order.
const PROSE_FILES = ["character/thesis.md", "character/persona.md"];

// First-class hard-guards file (2026-08-19, audit rank 7). User-authored
// behavioral borders that machine caps cannot express ("never open a short
// unless a qualifying pump preceded it") previously lived as an undocumented
// "Hard borders" paragraph buried mid-persona — present in only 5 of 8
// bundles and easy for a forker to miss. character/guards.md gets a dedicated
// slot: loaded LAST so the block lands at the END of the strategy prose,
// immediately adjacent to the system prompt's hard-caps section, wrapped in a
// high-salience header plus an explicit guards-win-conflicts rule.
export const GUARDS_FILE = "character/guards.md";
export const GUARDS_HEADER =
  "## HARD BEHAVIORAL GUARDS — never violate these";
export const GUARDS_FOOTER =
  "(These guards override every other instruction in this strategy. When a guard conflicts with an opportunity, the guard wins and the correct output is a skip that names the guard.)";

export const wrapGuardsProse = (body: string): string =>
  `${GUARDS_HEADER}\n\n${body.trim()}\n\n${GUARDS_FOOTER}`;
const FUNCTIONALITY_PIN = "functionality/coinrithm.yaml";

// Enforced cap field names. sizing.yaml is SOFT guidance and must NOT contain
// any of these (or a user could think a limit binds when it does not).
const ENFORCED_FIELD_NAMES = new Set<string>([
  ...Object.keys(RISK_CAPS),
  ...Object.keys(LIMIT_CAPS),
  "maxDrawdownMusd",
  "maxConsecutiveRejects",
  "maxConsecutiveModelFailures",
  "onRateLimitPressure",
]);
const SKILL_METADATA_KEYS = new Set(["type", "title", "description", "tags"]);

// A $ref must be a LOCAL, RELATIVE path inside the agent folder — never a URL,
// an absolute path, a home/drive path, or a Windows backslash path.
function refSyntaxIssue(ref: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(ref))
    return "remote/URL $ref is not allowed";
  if (ref.startsWith("~")) return "home-relative (~) $ref is not allowed";
  if (ref.includes("\\"))
    return "backslash in $ref is not allowed (use forward slashes)";
  if (isAbsolute(ref) || /^[a-zA-Z]:/.test(ref))
    return "absolute $ref is not allowed";
  return null;
}

interface Ctx {
  dir: string;
  issues: ResolveIssue[];
  hashes: Record<string, string>;
  mergeOrder: string[];
  // lowercased rel path -> the first casing seen, to catch case-only collisions
  seenLower: Map<string, string>;
}

function rel(dir: string, abs: string): string {
  return toPosix(relativePath(dir, abs));
}

// Resolve a ref relative to the agent dir, enforcing: inside the folder, exists,
// not a symlink. Returns the absolute path or null (with an issue pushed).
function safePath(ctx: Ctx, ref: string, label: string): string | null {
  const syn = refSyntaxIssue(ref);
  if (syn) {
    ctx.issues.push({
      code: "unsafe_ref",
      path: ref,
      message: `${label} "${ref}": ${syn}`,
    });
    return null;
  }
  const target = resolvePath(ctx.dir, ref);
  if (!isPathInside(ctx.dir, target)) {
    ctx.issues.push({
      code: "path_traversal",
      path: ref,
      message: `${label} "${ref}" escapes the agent folder`,
    });
    return null;
  }
  if (!existsSync(target)) {
    ctx.issues.push({
      code: "missing_ref",
      path: ref,
      message: `${label} target not found: "${ref}"`,
    });
    return null;
  }
  if (lstatSync(target).isSymbolicLink()) {
    ctx.issues.push({
      code: "symlink_rejected",
      path: ref,
      message: `${label} "${ref}" is a symlink (not allowed)`,
    });
    return null;
  }
  return target;
}

function readHashed(ctx: Ctx, abs: string): string {
  const content = readFileSync(abs, "utf8");
  const r = rel(ctx.dir, abs);
  const lower = r.toLowerCase();
  const prior = ctx.seenLower.get(lower);
  if (prior && prior !== r) {
    ctx.issues.push({
      code: "path_case_collision",
      path: r,
      message: `"${r}" differs only by case from "${prior}" — ambiguous on case-insensitive filesystems`,
    });
  }
  ctx.seenLower.set(lower, r);
  ctx.hashes[r] = sha256(content);
  if (!ctx.mergeOrder.includes(r)) ctx.mergeOrder.push(r);
  return content;
}

// sizing.yaml is SOFT guidance: it must never carry an enforced cap name, or a
// user could believe a limit binds when only risk/limits/killSwitch actually do.
function checkSizing(ctx: Ctx, rawFrontmatter: Record<string, unknown>): void {
  const sizing = rawFrontmatter.sizing;
  if (sizing && typeof sizing === "object" && !Array.isArray(sizing)) {
    for (const k of Object.keys(sizing as Record<string, unknown>)) {
      if (ENFORCED_FIELD_NAMES.has(k)) {
        ctx.issues.push({
          code: "sizing_enforced_key",
          path: "sizing",
          message: `sizing is SOFT guidance and may not contain the enforced cap "${k}" — move it to risk/limits/killSwitch`,
        });
      }
    }
  }
}

function parseYamlSafe(ctx: Ctx, content: string, label: string): unknown {
  try {
    return parseYaml(content);
  } catch (err) {
    ctx.issues.push({
      code: "invalid_yaml",
      path: label,
      message: `invalid YAML in "${label}": ${err instanceof Error ? err.message : String(err)}`,
    });
    return undefined;
  }
}

function isRef(value: unknown): value is { $ref: string } {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 1 &&
    typeof (value as Record<string, unknown>).$ref === "string"
  );
}

// Resolve a config-block value: inline values pass through; a { $ref } loads the
// part-file (recursively, with cycle detection) and parses it as YAML.
function resolveValue(
  ctx: Ctx,
  value: unknown,
  visiting: Set<string>,
): unknown {
  if (!isRef(value)) return value;
  const ref = value.$ref;
  const abs = safePath(ctx, ref, "$ref");
  if (!abs) return undefined;
  if (visiting.has(abs)) {
    ctx.issues.push({
      code: "include_cycle",
      path: ref,
      message: `$ref cycle detected at "${ref}"`,
    });
    return undefined;
  }
  const content = readHashed(ctx, abs);
  const parsed = parseYamlSafe(ctx, content, rel(ctx.dir, abs));
  visiting.add(abs);
  const resolved = resolveValue(ctx, parsed, visiting);
  visiting.delete(abs);
  return resolved;
}

function scanSecrets(
  ctx: Ctx,
  frontmatter: Record<string, unknown>,
  prose: string,
): void {
  for (const f of scanForSecrets(frontmatter)) {
    ctx.issues.push({ code: "secret_in_frontmatter", message: f });
  }
  for (const f of scanForSecrets(prose)) {
    ctx.issues.push({
      code: "secret_in_prose",
      message: `${f} (a key in a prose body would be sent to the model — remove it)`,
    });
  }
}

// ── single-file passthrough ──────────────────────────────────────────────────

function resolveSingleFile(abs: string): ResolvedAgent {
  const issues: ResolveIssue[] = [];
  const dir = abs; // single file: refs are not resolved, so dir is unused
  const content = readFileSync(abs, "utf8");
  let data: Record<string, unknown> = {};
  let body = "";
  try {
    const fm = parseFrontmatter(content);
    data = fm.data;
    body = fm.body;
  } catch (err) {
    throw new ResolveError([
      {
        code: "invalid_frontmatter",
        path: toPosix(abs),
        message: err instanceof Error ? err.message : String(err),
      },
    ]);
  }
  const ctx: Ctx = {
    dir,
    issues,
    hashes: {},
    mergeOrder: [],
    seenLower: new Map(),
  };
  const r = toPosix(abs);
  ctx.hashes[r] = sha256(content);
  ctx.mergeOrder.push(r);
  checkSizing(ctx, data);
  scanSecrets(ctx, data, body);
  if (issues.length) throw new ResolveError(issues);

  const sources: Record<string, string> = {};
  for (const k of Object.keys(data)) sources[k] = r;
  return {
    inputPath: abs,
    isDirectory: false,
    rawFrontmatter: data,
    mergedProse: body,
    proseParts: [{ source: r, text: body }],
    provenance: { sources, mergeOrder: ctx.mergeOrder, includeOrder: [] },
    contentHashes: ctx.hashes,
  };
}

// ── directory resolve ────────────────────────────────────────────────────────

function findKeystone(dir: string): string | null {
  for (const name of KEYSTONE_NAMES) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function loadSkillList(
  ctx: Ctx,
  frontmatter: Record<string, unknown>,
): string[] {
  // include[] in the keystone wins; else character/skills/_index.yaml `active`.
  if (Array.isArray(frontmatter.include)) {
    return frontmatter.include.filter(
      (s): s is string => typeof s === "string",
    );
  }
  const indexPath = join(ctx.dir, "character/skills/_index.yaml");
  if (existsSync(indexPath)) {
    const abs = safePath(ctx, "character/skills/_index.yaml", "skills index");
    if (!abs) return [];
    const parsed = parseYamlSafe(
      ctx,
      readHashed(ctx, abs),
      "character/skills/_index.yaml",
    );
    const active = (parsed as Record<string, unknown> | undefined)?.active;
    if (Array.isArray(active))
      return active.filter((s): s is string => typeof s === "string");
  }
  return [];
}

function resolveDirectory(dir: string): ResolvedAgent {
  const ctx: Ctx = {
    dir,
    issues: [],
    hashes: {},
    mergeOrder: [],
    seenLower: new Map(),
  };
  const keystoneAbs = findKeystone(dir);
  if (!keystoneAbs) {
    throw new ResolveError([
      {
        code: "missing_keystone",
        message: `agent folder has no keystone (expected one of: ${KEYSTONE_NAMES.join(", ")})`,
      },
    ]);
  }

  let frontmatter: Record<string, unknown> = {};
  let keystoneBody = "";
  try {
    const fm = parseFrontmatter(readHashed(ctx, keystoneAbs));
    frontmatter = fm.data;
    keystoneBody = fm.body;
  } catch (err) {
    throw new ResolveError([
      {
        code: "invalid_frontmatter",
        path: rel(dir, keystoneAbs),
        message: err instanceof Error ? err.message : String(err),
      },
    ]);
  }
  const keystoneRel = rel(dir, keystoneAbs);

  const rawFrontmatter: Record<string, unknown> = {};
  const sources: Record<string, string> = {};

  // `extends`: a base layer of whole config blocks (e.g. runtime.yaml provides
  // model + trigger). Shallow + flat — an extends file is a YAML mapping of
  // config blocks; inline frontmatter overrides it block-for-block. No nesting.
  const baseBlocks: Record<string, unknown> = {};
  const baseSource: Record<string, string> = {};
  if (Array.isArray(frontmatter.extends)) {
    for (const ext of frontmatter.extends) {
      if (typeof ext !== "string") continue;
      const abs = safePath(ctx, ext, "extends");
      if (!abs) continue;
      const parsed = parseYamlSafe(ctx, readHashed(ctx, abs), ext);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        ctx.issues.push({
          code: "invalid_extends",
          path: ext,
          message: `extends file "${ext}" must be a YAML mapping of config blocks`,
        });
        continue;
      }
      const map = parsed as Record<string, unknown>;
      if ("extends" in map) {
        ctx.issues.push({
          code: "nested_extends",
          path: ext,
          message: `extends file "${ext}" may not itself use extends`,
        });
      }
      for (const [k, v] of Object.entries(map)) {
        if (k === "extends") continue;
        baseBlocks[k] = v; // later extends wins
        baseSource[k] = ext;
      }
    }
  }

  // Copy EVERY keystone key (so the strict key-lint can also flag unknown keys
  // in the folder path, not just single-file); resolve $ref pointers for config
  // blocks. `extends` is a directive (handled above). `include` is copied here
  // AND consumed for skills below.
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === "extends") continue;
    if (CONFIG_BLOCKS.includes(key)) {
      const wasRef = isRef(value);
      rawFrontmatter[key] = resolveValue(ctx, value, new Set([keystoneAbs]));
      sources[key] = wasRef
        ? (() => {
            const t = safePath(ctx, (value as { $ref: string }).$ref, "$ref");
            return t ? rel(dir, t) : keystoneRel;
          })()
        : keystoneRel;
    } else {
      rawFrontmatter[key] = value;
      sources[key] = keystoneRel;
    }
  }

  // Fill any config block the keystone did NOT set from the extends base layer.
  for (const [k, v] of Object.entries(baseBlocks)) {
    if (!(k in rawFrontmatter)) {
      rawFrontmatter[k] = v;
      sources[k] = baseSource[k];
    }
  }

  // Skills (tactics): bodies → prose; optional risk/limits patch → tighten-only.
  const includeOrder: string[] = [];
  const skillProse: Array<{ source: string; text: string }> = [];
  const seenSkills = new Set<string>();
  for (const name of loadSkillList(ctx, frontmatter)) {
    if (seenSkills.has(name)) {
      ctx.issues.push({
        code: "duplicate_include",
        path: name,
        message: `skill "${name}" included more than once`,
      });
      continue;
    }
    seenSkills.add(name);
    const refPath = `character/skills/${name}.md`;
    const abs = safePath(ctx, refPath, "skill");
    if (!abs) continue;
    let patch: Record<string, unknown> = {};
    let body = "";
    try {
      const fm = parseFrontmatter(readHashed(ctx, abs));
      patch = fm.data;
      body = fm.body;
    } catch {
      // a skill file may be pure prose (no frontmatter) — treat whole as body.
      body = readFileSync(abs, "utf8");
    }
    for (const f of scanForSecrets(patch)) {
      ctx.issues.push({
        code: "secret_in_frontmatter",
        path: refPath,
        message: `${f} (skill frontmatter is committable metadata — remove secrets)`,
      });
    }
    includeOrder.push(name);
    skillProse.push({ source: refPath, text: body });
    applySkillPatch(ctx, rawFrontmatter, patch, refPath);
  }

  // Prose assembly (machine-read config never enters here).
  const proseParts: Array<{ source: string; text: string }> = [];
  if (keystoneBody.trim())
    proseParts.push({ source: keystoneRel, text: keystoneBody });
  for (const pf of PROSE_FILES) {
    const p = join(dir, pf);
    if (existsSync(p)) {
      const abs = safePath(ctx, pf, "prose");
      if (abs) proseParts.push({ source: pf, text: readHashed(ctx, abs) });
    }
  }
  proseParts.push(...skillProse);
  // Bounded memory: most-recent-N of journal/notes.md. runs/ is NEVER loaded.
  const journalPath = join(dir, "journal/notes.md");
  if (existsSync(journalPath)) {
    const abs = safePath(ctx, "journal/notes.md", "journal");
    if (abs) {
      const full = readHashed(ctx, abs);
      proseParts.push({
        source: "journal/notes.md",
        text: boundTail(full, JOURNAL_MAX_LINES, JOURNAL_MAX_BYTES),
      });
    }
  }

  // Hard behavioral guards — see GUARDS_FILE above. Pushed AFTER the journal
  // so the wrapped block is the final prose the model reads before the caps
  // section. Frontmatter is optional and stripped (only the body is doctrine);
  // an empty body contributes nothing.
  const guardsAbsPath = join(dir, GUARDS_FILE);
  if (existsSync(guardsAbsPath)) {
    const abs = safePath(ctx, GUARDS_FILE, "guards");
    if (abs) {
      const raw = readHashed(ctx, abs);
      const body = (
        raw.startsWith("---") ? parseFrontmatter(raw).body : raw
      ).trim();
      if (body) {
        proseParts.push({ source: GUARDS_FILE, text: wrapGuardsProse(body) });
      }
    }
  }

  // Optional API/tool contract pin. It is locked for reproducibility and stale
  // warnings, but it is not part of AgentSpec and is never sent to the model.
  const functionalityPath = join(dir, FUNCTIONALITY_PIN);
  if (existsSync(functionalityPath)) {
    const abs = safePath(ctx, FUNCTIONALITY_PIN, "functionality pin");
    if (abs) {
      const parsed = parseYamlSafe(
        ctx,
        readHashed(ctx, abs),
        FUNCTIONALITY_PIN,
      );
      for (const f of scanForSecrets(parsed)) {
        ctx.issues.push({
          code: "secret_in_functionality",
          path: FUNCTIONALITY_PIN,
          message: `${f} (the functionality pin is committable metadata — remove secrets)`,
        });
      }
      sources.functionality = FUNCTIONALITY_PIN;
    }
  }

  const mergedProse = mergeProseParts(proseParts);

  checkSizing(ctx, rawFrontmatter);
  scanSecrets(ctx, rawFrontmatter, mergedProse);

  if (ctx.issues.length) throw new ResolveError(ctx.issues);

  const provenance: Provenance = {
    sources,
    mergeOrder: ctx.mergeOrder,
    includeOrder,
  };
  return {
    inputPath: dir,
    isDirectory: true,
    rawFrontmatter,
    mergedProse,
    proseParts,
    provenance,
    contentHashes: ctx.hashes,
  };
}

// Apply a tactic module's frontmatter patch. Only risk/limits cap blocks are
// permitted, tighten-only; anything else is rejected (no permission expansion).
function applySkillPatch(
  ctx: Ctx,
  rawFrontmatter: Record<string, unknown>,
  patch: Record<string, unknown>,
  sourceLabel: string,
): void {
  for (const key of Object.keys(patch)) {
    if (SKILL_METADATA_KEYS.has(key)) continue;
    if (key === "risk" || key === "limits") {
      const caps = key === "risk" ? RISK_CAPS : LIMIT_CAPS;
      const base = (rawFrontmatter[key] as Record<string, unknown>) ?? {};
      const p = patch[key];
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        ctx.issues.push({
          code: "skill_patch_invalid",
          path: sourceLabel,
          message: `tactic "${sourceLabel}" ${key} patch must be a mapping`,
        });
        continue;
      }
      const { merged, issues } = mergeCapPatch(
        base,
        p as Record<string, unknown>,
        caps,
        sourceLabel,
      );
      rawFrontmatter[key] = merged;
      ctx.issues.push(...issues);
    } else {
      ctx.issues.push({
        code: "skill_patch_forbidden_key",
        path: sourceLabel,
        message: `tactic "${sourceLabel}" may only tighten risk/limits caps (include order controls prompt order, not permissions); got "${key}"`,
      });
    }
  }
}

// ── entry point ──────────────────────────────────────────────────────────────

// Is this prose part a tactic skill? (Used by the skills ablation kill-switch to
// drop skill bodies from the run-time prompt without touching the resolver.)
export function isSkillProseSource(source: string): boolean {
  return source.startsWith("character/skills/");
}

// The canonical prose assembly: each part labelled with its source, joined by a
// blank line. The resolver uses this for mergedProse; the run path reuses it to
// re-assemble a skills-ablated prompt deterministically.
export function mergeProseParts(
  parts: Array<{ source: string; text: string }>,
): string {
  return parts
    .map((p) => `<!-- ${p.source} -->\n${p.text.trim()}`)
    .join("\n\n");
}

export function resolveAgent(inputPath: string): ResolvedAgent {
  const abs = resolvePath(inputPath);
  if (!existsSync(abs)) {
    throw new ResolveError([
      { code: "input_missing", message: `no such path: ${inputPath}` },
    ]);
  }
  const st = statSync(abs);
  if (st.isFile()) return resolveSingleFile(abs);
  if (st.isDirectory()) return resolveDirectory(abs);
  throw new ResolveError([
    { code: "input_invalid", message: "input must be a file or a directory" },
  ]);
}
