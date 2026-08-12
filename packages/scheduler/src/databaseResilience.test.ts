import { describe, expect, it, vi } from "vitest";
import { isTransientDatabaseError, retryDatabaseStartup } from "./db.js";

describe("database restart resilience", () => {
  it("recognizes connection failures but not permanent migration errors", () => {
    expect(isTransientDatabaseError({ code: "57P01" })).toBe(true);
    expect(isTransientDatabaseError({ code: "ECONNREFUSED" })).toBe(true);
    expect(
      isTransientDatabaseError({
        message: "Connection terminated unexpectedly",
      }),
    ).toBe(true);
    expect(isTransientDatabaseError({ code: "42601" })).toBe(false);
  });

  it("retries transient startup failures with bounded exponential backoff", async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce({ code: "ECONNREFUSED" })
      .mockRejectedValueOnce({ code: "57P03" })
      .mockResolvedValue(undefined);
    const sleep = vi.fn(async () => {});
    const onRetry = vi.fn();

    await retryDatabaseStartup(operation, {
      sleep,
      onRetry,
      initialDelayMs: 100,
      maxDelayMs: 150,
    });

    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[100], [150]]);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, "ECONNREFUSED");
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 150, "57P03");
  });

  it("fails immediately on a permanent schema error", async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue({ code: "42601" });
    const sleep = vi.fn(async () => {});

    await expect(retryDatabaseStartup(operation, { sleep })).rejects.toEqual({
      code: "42601",
    });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
