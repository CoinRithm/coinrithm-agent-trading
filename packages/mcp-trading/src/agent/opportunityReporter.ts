// Owns the per-cycle opportunity latch. A failed post is still one attempt;
// reporting must never retry within a cycle or alter its execution outcome.
import type { CoinRithmClient, ProvenanceReport } from "./client.js";
import type { AgentSpec, AgentTrace, PostedOpportunity } from "./types.js";

export function createOpportunityReporter({
  client,
  spec,
  live,
  enabled,
  runId,
  decisionId,
  provenance,
  baseTrace,
  log,
}: {
  client: CoinRithmClient;
  spec: AgentSpec;
  live: boolean;
  enabled: boolean;
  runId: string;
  decisionId: string;
  provenance: ProvenanceReport;
  baseTrace: AgentTrace;
  log: (line: string) => void;
}) {
  let opportunityPosted = false;
  let postedOpportunity: PostedOpportunity | undefined;
  const post = async (o: PostedOpportunity): Promise<void> => {
    if (!enabled || !live || opportunityPosted) return;
    opportunityPosted = true;
    postedOpportunity = o;
    try {
      await client.reportPmOpportunity(
        {
          kind: o.kind,
          source: o.source,
          slug: o.slug,
          outcomeExternalMarketId: o.outcomeExternalMarketId,
          forecastProbability: o.forecastProbability,
          marketProbability: o.marketProbability,
          reasonCode: o.reasonCode,
          cohort: {
            universeSize: o.universeSize,
            horizon: spec.objective?.horizon,
          },
          decisionId,
          runId,
          provenance,
        },
        baseTrace,
      );
      log(`reported ${o.kind} opportunity (universe ${o.universeSize ?? "?"})`);
    } catch (err) {
      log(
        `opportunity post failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return {
    post,
    get posted() {
      return postedOpportunity;
    },
  };
}
