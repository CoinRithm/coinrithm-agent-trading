import { it, expect, vi } from "vitest";
import { createOpportunityReporter } from "./opportunityReporter.js";
import { buildSpec } from "./skill.js";
import { buildRunnerProvenance } from "./runner.js";
import { makeTrace } from "./runEvidence.js";
import type { CoinRithmClient } from "./client.js";
import type { ApiResult, PostedOpportunity } from "./types.js";

const opportunity: PostedOpportunity = {
  kind: "abstained",
  reasonCode: "fixture",
};
const success: ApiResult = { ok: true, status: 200, data: {} };

function fixture(
  report = vi.fn<() => Promise<ApiResult>>(async () => success),
  options = { live: true, enabled: true },
) {
  const spec = buildSpec({});
  const log = vi.fn();
  const reporter = createOpportunityReporter({
    client: { reportPmOpportunity: report } as unknown as CoinRithmClient,
    spec,
    ...options,
    runId: "fixture",
    decisionId: "cycle",
    provenance: buildRunnerProvenance(spec),
    baseTrace: makeTrace("fixture", "cycle", spec),
    log,
  });
  return { reporter, report, log };
}

it.each([503, 422, 0])(
  "records unsuccessful status %i without confirming or retrying",
  async (status) => {
    const { reporter, report, log } = fixture(
      vi.fn(async () => ({
        ok: false,
        status,
        data: { error: "private response body" },
      })),
    );
    await expect(reporter.post(opportunity)).resolves.toBeUndefined();
    await reporter.post({ ...opportunity, reasonCode: "second" });
    expect(report).toHaveBeenCalledTimes(1);
    expect(reporter.posted).toBeUndefined();
    expect(reporter.report).toEqual({
      opportunity,
      outcome: status === 0 ? "unknown" : "http_error",
      status,
    });
    expect(log.mock.calls).toEqual([
      [
        status === 0
          ? "opportunity report outcome unknown (transport failure)"
          : `opportunity report received HTTP ${status}; delivery unconfirmed`,
      ],
    ]);
    expect(JSON.stringify(reporter.report)).not.toContain(
      "private response body",
    );
  },
);

it.each([new Error("private exception details"), "private rejection details"])(
  "latches before awaiting and keeps thrown failures unconfirmed: %s",
  async (error) => {
    let reject!: (reason: unknown) => void;
    const { reporter, report, log } = fixture(
      vi.fn(
        () =>
          new Promise<ApiResult>((_resolve, fail) => {
            reject = fail;
          }),
      ),
    );
    expect(reporter.posted).toBeUndefined();
    const first = reporter.post(opportunity);
    expect(reporter.posted).toBeUndefined();
    await reporter.post({ ...opportunity, reasonCode: "second" });
    expect(report).toHaveBeenCalledTimes(1);
    reject(error);
    await expect(first).resolves.toBeUndefined();
    await reporter.post(opportunity);
    expect(report).toHaveBeenCalledTimes(1);
    expect(reporter.posted).toBeUndefined();
    expect(reporter.report).toEqual({
      opportunity,
      outcome: "unknown",
      status: 0,
    });
    expect(log.mock.calls).toEqual([
      ["opportunity report outcome unknown (exception)"],
    ]);
  },
);

it.each([undefined, 2])(
  "confirms successful reports with universe %s",
  async (universeSize) => {
    const { reporter, report, log } = fixture();
    const payload = { ...opportunity, universeSize };
    await reporter.post(payload);
    await reporter.post({ ...payload, reasonCode: "second" });
    expect(report).toHaveBeenCalledTimes(1);
    expect(reporter.posted).toBe(payload);
    expect(reporter.report).toEqual({
      opportunity: payload,
      outcome: "confirmed",
      status: 200,
    });
    expect(log.mock.calls).toEqual([
      [`reported abstained opportunity (universe ${universeSize ?? "?"})`],
    ]);
  },
);

it.each([
  { live: false, enabled: true },
  { live: true, enabled: false },
])("does not record an attempt when disabled by %j", async (options) => {
  const { reporter, report, log } = fixture(undefined, options);
  await reporter.post(opportunity);
  expect(report).not.toHaveBeenCalled();
  expect(log).not.toHaveBeenCalled();
  expect(reporter.report).toBeUndefined();
  expect(reporter.posted).toBeUndefined();
});
