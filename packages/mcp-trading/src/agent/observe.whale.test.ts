import { describe, expect, it, vi } from "vitest";
import { enrichWhaleContext } from "./observe.js";

const observation = (over: Record<string, unknown> = {}) =>
  ({
    pmMarkets: [{ source: "polymarket", slug: "btc-up" }],
    pmPositions: [],
    ...over,
  }) as never;

describe("post-gate whale context", () => {
  it("keeps only exact relevant events and validates wallet identity before detail reads", async () => {
    const wallet = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: {
        source: "polymarket",
        asOf: "2026-09-28T06:00:00.000Z",
        wallet: "0x1111111111111111111111111111111111111111",
        summary30d: {
          basis: "trade_notional",
          windowStart: "2026-08-29T00:00:00.000Z",
          tradeCount: 2,
          notionalUsd: 123,
        },
        daily: [{ day: "2026-09-28", tradeCount: 1, buyCount: 1 }],
        recentFills: [
          {
            side: "BUY",
            outcome: "YES",
            usdValue: 42,
            event: { slug: "btc-up", title: "BTC up?" },
          },
        ],
      },
    }));
    const client = {
      getPublicPmWhales: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: {
          trades: [
            {
              source: "Polymarket",
              eventSlug: "btc-up",
              side: "BUY",
              outcome: "YES",
              walletAddress: "0x1111111111111111111111111111111111111111",
            },
            {
              source: "kalshi",
              eventSlug: "btc-up",
              side: "SELL",
              walletAddress: "0x2222222222222222222222222222222222222222",
            },
            {
              source: "polymarket",
              eventSlug: "other-event",
              side: "BUY",
              walletAddress: "0x3333333333333333333333333333333333333333",
            },
            {
              source: "polymarket",
              eventSlug: "btc-up",
              side: "BUY",
              walletAddress: "synthetic-display-wallet",
            },
          ],
        },
      })),
      getPublicPmWhaleWallet: wallet,
    };

    const result = await enrichWhaleContext(client as never, observation());

    expect(result.status).toBe("available");
    expect(result.trades).toHaveLength(2);
    expect(result.trades[0]).toMatchObject({
      source: "polymarket",
      eventSlug: "btc-up",
      side: "BUY",
      walletAddress: "0x1111111111111111111111111111111111111111",
    });
    expect(wallet).toHaveBeenCalledOnce();
    expect(result.wallets[0]?.recentFills[0]).toMatchObject({
      side: "BUY",
      usdValue: 42,
      eventSlug: "btc-up",
      eventTitle: "BTC up?",
    });
    expect(result.omitted).toBe(2);
  });

  it("distinguishes an empty successful sample from a failed read", async () => {
    const client = {
      getPublicPmWhales: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { trades: [] },
      })),
      getPublicPmWhaleWallet: vi.fn(),
    };
    const result = await enrichWhaleContext(client as never, observation());
    expect(result).toMatchObject({
      status: "available",
      coverage: "relevant_events",
      trades: [],
      wallets: [],
      omitted: 0,
    });
    expect(result.reason).toBeUndefined();
  });

  it("does not read the global tape when there are no relevant PM rows", async () => {
    const getPublicPmWhales = vi.fn();
    const result = await enrichWhaleContext(
      {
        getPublicPmWhales,
        getPublicPmWhaleWallet: vi.fn(),
      } as never,
      observation({ pmMarkets: [], pmPositions: [] }),
    );
    expect(result.coverage).toBe("no_relevant_events");
    expect(getPublicPmWhales).not.toHaveBeenCalled();
  });

  it("rejects a successful wallet payload for a different identity", async () => {
    const result = await enrichWhaleContext(
      {
        getPublicPmWhales: vi.fn(async () => ({
          ok: true,
          status: 200,
          data: {
            trades: [
              {
                source: "polymarket",
                eventSlug: "btc-up",
                side: "BUY",
                walletAddress: "0x1111111111111111111111111111111111111111",
              },
            ],
          },
        })),
        getPublicPmWhaleWallet: vi.fn(async () => ({
          ok: true,
          status: 200,
          data: {
            source: "polymarket",
            wallet: "0x2222222222222222222222222222222222222222",
            summary30d: { tradeCount: 1, notionalUsd: 10 },
            daily: [{ day: "2026-09-28", tradeCount: 1 }],
            recentFills: [],
          },
        })),
      } as never,
      observation(),
    );
    expect(result.status).toBe("partial");
    expect(result.reason).toBe("invalid_payload");
    expect(result.wallets).toEqual([]);
  });

  it("preserves original slug text while bounding public text fields", async () => {
    const long = "x".repeat(500);
    const result = await enrichWhaleContext(
      {
        getPublicPmWhales: vi.fn(async () => ({
          ok: true,
          status: 200,
          data: {
            trades: [
              {
                source: "polymarket",
                eventSlug: "BTC-UP",
                side: "BUY",
                eventTitle: long,
                marketQuestion: long,
                tradedAt: long,
              },
            ],
          },
        })),
        getPublicPmWhaleWallet: vi.fn(),
      } as never,
      observation(),
    );
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]?.eventSlug).toBe("BTC-UP");
    expect(result.trades[0]?.eventTitle).toHaveLength(180);
    expect(result.trades[0]?.marketQuestion).toHaveLength(240);
    expect(result.trades[0]?.tradedAt).toHaveLength(40);
    expect(result.omitted).toBe(0);
  });

  it("returns a fixed timeout reason without upstream diagnostics", async () => {
    const client = {
      getPublicPmWhales: vi.fn(async () => ({
        ok: false,
        status: 0,
        data: { error: "timeout", message: "private upstream detail" },
      })),
      getPublicPmWhaleWallet: vi.fn(),
    };
    const result = await enrichWhaleContext(client as never, observation());
    expect(result).toMatchObject({ status: "unavailable", reason: "timeout" });
    expect(JSON.stringify(result)).not.toContain("private upstream detail");
  });
});
