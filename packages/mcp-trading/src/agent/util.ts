// Small dependency-free helpers shared across the runner.
import { createHash } from "node:crypto";
import {
  resolve as resolvePath,
  relative as relativePath,
  isAbsolute,
} from "node:path";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Parse a cadence string ("30s", "15m", "1h", "4h", "1d") to milliseconds.
// Returns null for anything unparseable so the skill validator can reject it.
export function parseCadenceMs(cadence: unknown): number | null {
  if (typeof cadence !== "string") return null;
  const m = /^\s*(\d+)\s*(s|m|h|d)\s*$/i.exec(cadence);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  const mult =
    unit === "s"
      ? 1000
      : unit === "m"
        ? 60_000
        : unit === "h"
          ? 3_600_000
          : 86_400_000;
  return n * mult;
}

// A UTC day key (YYYY-MM-DD) for resetting per-day counters.
export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Truthy reading of an opt-in env flag (1/true/yes/on, case-insensitive).
export function envFlag(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(
    (value ?? "").trim().toLowerCase(),
  );
}

// Deep-scan a parsed frontmatter object for anything that looks like a secret.
// The skill file is meant to be committable and shareable; a real key must
// NEVER live in it (keys are supplied at runtime via env / encrypted store).
// Returns a list of human-readable findings (empty = clean).
const SECRET_KEY_RE =
  /(^|[_.-])(api[_-]?key|secret|token|password|passwd|bearer|authorization|private[_-]?key)($|[_.-])/i;
const SECRET_VALUE_RE =
  /(crk_live_[a-z0-9_]+|sk-[a-z0-9-]{16,}|sk_live_[a-z0-9]{16,}|ghp_[a-z0-9]{20,}|bearer\s+[a-z0-9._-]{12,}|AIza[a-z0-9_-]{20,})/i;

export function scanForSecrets(
  value: unknown,
  pathPrefix = "",
  findings: string[] = [],
): string[] {
  if (value == null) return findings;
  if (typeof value === "string") {
    if (SECRET_VALUE_RE.test(value)) {
      findings.push(
        `value at "${pathPrefix || "(root)"}" looks like a secret/credential`,
      );
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanForSecrets(v, `${pathPrefix}[${i}]`, findings));
    return findings;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const here = pathPrefix ? `${pathPrefix}.${k}` : k;
      if (SECRET_KEY_RE.test(k)) {
        findings.push(
          `field "${here}" must not appear in a skill file (secret-like key)`,
        );
      }
      scanForSecrets(v, here, findings);
    }
  }
  return findings;
}

// Short random id (for runId/decisionId/idempotencyKey suffixes).
export function shortId(): string {
  // randomUUID is available in Node 18+ (globalThis.crypto).
  return crypto.randomUUID().slice(0, 8);
}

// ── Resolver helpers (cross-platform-deterministic) ──────────────────────────

// Normalize file content for hashing: CRLF/CR -> LF, strip trailing whitespace,
// so a Windows checkout and a Linux checkout of the same file hash identically.
export function normalizeContent(text: string): string {
  return text
    .replace(/^\uFEFF/, "") // strip UTF-8 BOM (Windows editors add it)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+$/, "");
}

// SHA-256 of normalized content — the manifest lock's per-file contentHash.
export function sha256(text: string): string {
  return (
    "sha256:" +
    createHash("sha256").update(normalizeContent(text), "utf8").digest("hex")
  );
}

// Canonical POSIX path (forward slashes) so the lock is byte-identical on
// Windows and Linux.
export function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

// True iff `child` resolves to a location strictly inside `parent`
// (path-traversal guard). A `$ref` that escapes the agent folder is rejected.
export function isPathInside(parent: string, child: string): boolean {
  const rel = relativePath(resolvePath(parent), resolvePath(child));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

// Keep only the most-recent slice of a (possibly large) memory file so a growing
// journal never blows the model context / the user's token budget.
export function boundTail(
  text: string,
  maxLines: number,
  maxBytes: number,
): string {
  let lines = text.split("\n");
  if (lines.length > maxLines) lines = lines.slice(-maxLines);
  let out = lines.join("\n");
  if (Buffer.byteLength(out, "utf8") > maxBytes) {
    out = Buffer.from(out, "utf8").subarray(-maxBytes).toString("utf8");
  }
  return out;
}

// Deterministic JSON: recursively sort object keys so two runs over the same
// inputs produce a byte-identical manifest.lock.json.
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value), null, 2);
}

export function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortDeep((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}
