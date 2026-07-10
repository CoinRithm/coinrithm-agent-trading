// Run-evidence helpers: one runId per process, one decisionId per cycle, the
// agentTrace stamped on every traced call, and the export at the end.

import { CoinRithmClient } from "./client.js";
import { AgentSpec, AgentTrace } from "./types.js";
import { shortId } from "./util.js";

export function makeRunId(spec: AgentSpec): string {
  const slug = (spec.name || "agent")
    .replace(/[^a-z0-9-]+/gi, "-")
    .toLowerCase();
  return `${slug}-${shortId()}`;
}

export function makeDecisionId(cycle: number): string {
  return `cycle-${cycle}-${shortId()}`;
}

export function makeTrace(
  runId: string,
  decisionId: string,
  spec: AgentSpec,
  confidence?: number,
  rationaleSummary?: string,
): AgentTrace {
  return {
    runId,
    decisionId,
    strategyLabel: spec.name || "agent",
    confidence,
    rationaleSummary,
  };
}

export async function exportRunEvidence(
  client: CoinRithmClient,
  runId: string,
): Promise<unknown> {
  const r = await client.exportRunEvidence(runId);
  return r.ok
    ? r.data
    : { error: `run-evidence export failed (HTTP ${r.status})` };
}
