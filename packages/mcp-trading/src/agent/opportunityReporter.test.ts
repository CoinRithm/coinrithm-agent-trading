import { it, expect, vi } from "vitest";
import { createOpportunityReporter } from "./opportunityReporter.js";
import { buildSpec } from "./skill.js";
import { buildRunnerProvenance } from "./runner.js";
import { makeTrace } from "./runEvidence.js";
import type { CoinRithmClient } from "./client.js";
import type { PostedOpportunity } from "./types.js";

it("latches before awaiting, tolerates non-Error rejection and never retries the cycle report", async () => {
  const spec = buildSpec({});
  let reject!: (reason: unknown) => void;
  const report = vi.fn(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const log = vi.fn();
  const reporter = createOpportunityReporter({
    client: { reportPmOpportunity: report } as unknown as CoinRithmClient,
    spec,
    live: true,
    enabled: true,
    runId: "fixture",
    decisionId: "cycle",
    provenance: buildRunnerProvenance(spec),
    baseTrace: makeTrace("fixture", "cycle", spec),
    log,
  });
  const opportunity: PostedOpportunity = {
    kind: "abstained",
    reasonCode: "fixture",
  };
  const first = reporter.post(opportunity);
  await reporter.post({ ...opportunity, reasonCode: "second" });
  expect(report).toHaveBeenCalledTimes(1);
  reject("fixture failure");
  await expect(first).resolves.toBeUndefined();
  await reporter.post(opportunity);
  expect(report).toHaveBeenCalledTimes(1);
  expect(reporter.posted).toBe(opportunity);
  expect(log).toHaveBeenCalledWith("opportunity post failed: fixture failure");
});

it("reports an opportunity with an unknown universe without inventing a count", async () => {
  const spec = buildSpec({});
  const log = vi.fn();
  const reporter = createOpportunityReporter({
    client: {
      reportPmOpportunity: async () => ({ ok: true }),
    } as unknown as CoinRithmClient,
    spec,
    live: true,
    enabled: true,
    runId: "fixture",
    decisionId: "cycle",
    provenance: buildRunnerProvenance(spec),
    baseTrace: makeTrace("fixture", "cycle", spec),
    log,
  });
  await reporter.post({ kind: "abstained", reasonCode: "fixture" });
  expect(log).toHaveBeenCalledWith("reported abstained opportunity (universe ?)");
});
