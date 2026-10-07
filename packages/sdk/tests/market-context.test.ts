import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createClient } from "../src/index.js";
import type { components, operations } from "../src/schema.js";

type MarketContext =
  operations["getMarketContext"]["responses"][200]["content"]["application/json"];

// Shared public serializer fixture; the Python test records its source and
// checks every member is typed rather than falling through to unknown fields.
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../sdk-python/tests/fixtures/market_context.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

describe("market context SDK contract", () => {
  it("exposes typed optional context on the market GET response", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createClient({ apiKey: "fixture", fetch: transport });
    const { data } = await client.GET("/api/agent/market/{coinId}", {
      params: { path: { coinId: "1" } },
    });

    expectTypeOf(data?.priceTiming).toEqualTypeOf<
      components["schemas"]["SpotPriceTiming"] | undefined
    >();
    expectTypeOf(data?.funding?.ratePct).toEqualTypeOf<number | undefined>();
    expectTypeOf(data?.derivatives?.openInterest?.change24hPct).toEqualTypeOf<
      number | null | undefined
    >();
    expectTypeOf(
      data?.derivatives?.positioning?.longAccountPct?.value,
    ).toEqualTypeOf<number | undefined>();
    expectTypeOf(
      data?.derivatives?.liquidations?.last1h.capturedPct,
    ).toEqualTypeOf<number | undefined>();
    expectTypeOf(data?.derivatives?.depth?.bid?.complete).toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf(data?.macro?.quotes[0]?.asOf).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(data?.defi?.chainTvl?.sourceObservedAt).toEqualTypeOf<
      null | undefined
    >();
    expectTypeOf(data?.defi?.stablecoinSupply?.dayAt).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(data?.price?.asOf).toEqualTypeOf<string | null | undefined>();

    expect(data).toEqual(fixture);
    expect(data?.funding?.ratePct).toBe(-0.0056);
    expect(data?.derivatives?.liquidations?.last1h.events).toBe(0);
    expect(data?.derivatives?.depth?.bid?.complete).toBe(false);
    expect(data?.defi?.chainTvl?.sourceObservedAt).toBeNull();
  });

  it("accepts absent, null and partially available context", () => {
    const oldPayload: MarketContext = {};
    const earlyDerivatives: MarketContext = {
      derivatives: { openInterest: null },
    };
    const unavailable: MarketContext = {
      funding: null,
      macro: null,
      defi: null,
      derivatives: {
        openInterest: null,
        positioning: null,
        liquidations: null,
        depth: null,
      },
    };
    const partialDefi: MarketContext = {
      defi: { chainTvl: null, stablecoinSupply: null },
    };
    expect(oldPayload.funding).toBeUndefined();
    expect(earlyDerivatives.derivatives?.depth).toBeUndefined();
    expect(unavailable.derivatives?.depth).toBeNull();
    expect(partialDefi.defi?.chainTvl).toBeNull();
  });
});
