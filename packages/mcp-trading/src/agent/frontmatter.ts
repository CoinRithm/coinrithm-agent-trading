import { parse as parseYaml } from "yaml";

// Split a SKILL.md into its YAML frontmatter (the machine-read config) and the
// markdown body (the plain-language strategy). The frontmatter is parsed with
// a real YAML parser because the v1 schema nests objects (trigger/model/risk/
// limits/abstention/sync/killSwitch) — hand-rolling that is brittle.

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(text: string): Frontmatter {
  const src = text.replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  if (!m) {
    throw new Error(
      "skill file has no YAML frontmatter (expected a `---` block at the top)",
    );
  }
  let data: unknown;
  try {
    data = parseYaml(m[1]);
  } catch (err) {
    throw new Error(
      `skill frontmatter is not valid YAML: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("skill frontmatter must be a YAML mapping (key: value pairs)");
  }
  return { data: data as Record<string, unknown>, body: (m[2] ?? "").trim() };
}
