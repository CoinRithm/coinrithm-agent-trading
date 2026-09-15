// Owns the per-cycle opportunity latch. A failed post is still one attempt;
// reporting must never retry within a cycle or alter its execution outcome.
import type { CoinRithmClient, ProvenanceReport } from "./client.js";
import type {
  AgentSpec,
  AgentTrace,
  OpportunityReport,
  PostedOpportunity,
} from "./types.js";

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
  let attempted = false;
  let report: OpportunityReport | undefined;
  const post = async (o: PostedOpportunity): Promise<void> => {
    if (!enabled || !live || attempted) return;
    attempted = true;
    try {
      const result = await client.reportPmOpportunity(
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
      report = {
        opportunity: o,
        outcome: result.ok
          ? "confirmed"
          : result.status === 0
            ? "unknown"
            : "http_error",
        status: result.status,
      };
      if (result.ok) {
        log(
          `reported ${o.kind} opportunity (universe ${o.universeSize ?? "?"})`,
        );
      } else if (result.status === 0) {
        log("opportunity report outcome unknown (transport failure)");
      } else {
        log(
          `opportunity report received HTTP ${result.status}; delivery unconfirmed`,
        );
      }
    } catch {
      report = { opportunity: o, outcome: "unknown", status: 0 };
      // Exceptions and API error bodies may contain private request details.
      log("opportunity report outcome unknown (exception)");
    }
  };

  return {
    post,
    get posted() {
      return report?.outcome === "confirmed" ? report.opportunity : undefined;
    },
    get report() {
      return report;
    },
  };
}
